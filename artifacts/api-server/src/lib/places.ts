/**
 * Nearest health-facility lookup for "where is the closest hospital / pharmacy".
 *
 * Coordinates are the ONLY input. A place name is never used to locate anyone:
 * a free-text "hospital in <place>" search is worldwide and unordered, which in
 * an earlier version of this feature (in a sibling codebase) returned hospitals
 * in Ouarzazate, Morocco to a user sitting in Hyderabad whose real coordinates
 * were available the whole time.
 *
 * Overpass is the right tool for "what is near this point": it queries by radius
 * around real coordinates and returns each element's position, so distance is
 * measured here and results are sorted nearest-first.
 */
import { logger } from "./logger";

/**
 * Global-coverage Overpass instances only.
 *
 * Region-limited mirrors (overpass.osm.ch, overpass.osm.jp) must never be added:
 * probed from here they answer HTTP 200 with zero elements for an Indian
 * coordinate, which is indistinguishable from "there is no pharmacy within
 * 25km" and would be reported to the user as exactly that. A mirror that does
 * not hold the whole planet is worse than no mirror.
 */
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

/**
 * One request, widest useful radius, sorted client-side. Walking 3km → 10km →
 * 25km costs up to six sequential requests because the public instances are
 * queue-bound rather than query-bound — a 3km search measures slower than a
 * 25km one.
 */
const SEARCH_RADIUS_M = 25000;

/** Generous: a slow answer beats a wrong "there is nothing near you". */
const REQUEST_TIMEOUT_MS = 20000;

/** If the primary has not answered by now, ask the mirror too and take the first reply. */
const HEDGE_AFTER_MS = 3500;

/**
 * Last resort when every Overpass mirror is down at the same time.
 *
 * Nominatim is different infrastructure, so it survives an Overpass outage. It
 * is used strictly as a *bounded* search — a box drawn around the user's own
 * coordinates — never as the free-text lookup described in the file header.
 * Results still carry real coordinates, so distances stay measured, not guessed.
 */
const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const FALLBACK_TIMEOUT_MS = 9000;

/** Identifies us to the volunteer-run OSM services, as their usage policy requires. */
const USER_AGENT = "dayli-health-copilot/1.0 (+https://dayli.ai)";

/** Facilities do not move. Cache hard so a repeat question is instant. */
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * A fallback answer is thinner than an Overpass one — one keyword search rather
 * than a full amenity query — so it is cached for minutes, not hours, and the
 * next question gets another chance at the complete list.
 */
const FALLBACK_CACHE_TTL_MS = 15 * 60 * 1000;

const CACHE_MAX_ENTRIES = 300;

/** Cache buckets ~1.1km wide, well inside the search radius, so neighbours share a fetch. */
const CACHE_GRID_DP = 2;

/**
 * Beyond this, a result is not "in the vicinity" in any useful sense. We still
 * return it — knowing the closest is 12km away is real information — but the
 * caller should say so rather than present it as a nearby option.
 */
export const VICINITY_LIMIT_M = 6000;

export type FacilityKind = "hospital" | "pharmacy";

export type FacilityLookupStatus = "ok" | "empty" | "unavailable" | "invalid";

export interface Facility {
  name: string;
  /** Human label for the amenity, e.g. "Hospital" or "Doctor's clinic". */
  type: string;
  amenity: string;
  address: string;
  distanceMetres: number;
  /** Pre-formatted for display, e.g. "700 m" or "2.4 km". */
  distanceText: string;
  mapsUrl: string;
  lat: number;
  lon: number;
}

export interface FacilityLookup {
  status: FacilityLookupStatus;
  results: Facility[];
  /** Which directory answered, for logging. `null` when none did. */
  source: "cache" | "overpass" | "nominatim" | null;
}

interface OverpassElement {
  type?: string;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string | undefined>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

interface NominatimRow {
  name?: string;
  display_name?: string;
  category?: string;
  type?: string;
  lat?: string;
  lon?: string;
  address?: Record<string, string | undefined>;
}

interface KindSpec {
  /** OSM amenity values, most specific first. */
  amenities: string[];
  labels: Record<string, string>;
}

const KINDS: Record<FacilityKind, KindSpec> = {
  hospital: {
    amenities: ["hospital", "clinic", "doctors"],
    // A hospital outranks a walk-in clinic for someone who asked for a
    // hospital, but not by so much that we send them past three closer
    // options — see rankFor().
    labels: { hospital: "Hospital", clinic: "Clinic", doctors: "Doctor's clinic" },
  },
  pharmacy: {
    amenities: ["pharmacy"],
    labels: { pharmacy: "Pharmacy" },
  },
};

// --- cache -----------------------------------------------------------------

interface CacheEntry {
  at: number;
  ttl: number;
  elements: OverpassElement[];
}

const cache = new Map<string, CacheEntry>();

function cacheKey(kind: FacilityKind, lat: number, lon: number): string {
  return `${kind}:${lat.toFixed(CACHE_GRID_DP)}:${lon.toFixed(CACHE_GRID_DP)}`;
}

function cacheGet(key: string): OverpassElement[] | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > hit.ttl) {
    cache.delete(key);
    return null;
  }
  // Refresh LRU position.
  cache.delete(key);
  cache.set(key, hit);
  return hit.elements;
}

function cacheSet(key: string, elements: OverpassElement[], ttl: number = CACHE_TTL_MS): void {
  cache.set(key, { at: Date.now(), ttl, elements });
  while (cache.size > CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

/** Test seam / operational reset. */
export function clearFacilityCache(): void {
  cache.clear();
}

// --- Overpass --------------------------------------------------------------

function buildQuery(lat: number, lon: number, amenities: string[]): string {
  const filter = `"amenity"~"^(${amenities.join("|")})$"`;
  return `[out:json][timeout:25];nwr[${filter}](around:${SEARCH_RADIUS_M},${lat},${lon});out center 80;`;
}

async function postOverpass(
  endpoint: string,
  query: string,
  signal: AbortSignal,
): Promise<OverpassElement[]> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "text/plain", "User-Agent": USER_AGENT },
    body: query,
    signal,
  });
  if (!res.ok) throw new Error(`${endpoint} HTTP ${res.status}`);
  const json = (await res.json()) as OverpassResponse;
  if (!json || !Array.isArray(json.elements)) throw new Error(`${endpoint} malformed`);
  return json.elements;
}

/**
 * Hedged request: ask the primary, and only if it is slow ask the mirror too,
 * taking whichever answers first. This cuts the tail latency that produced
 * timeouts in the field without routinely doubling load on volunteer-run
 * servers. A fast failure skips the hedge delay and moves on immediately.
 */
function raceEndpoints(query: string, signal: AbortSignal): Promise<OverpassElement[]> {
  return new Promise<OverpassElement[]>((resolve, reject) => {
    const errors: string[] = [];
    const timers: NodeJS.Timeout[] = [];
    let settled = false;
    let launched = 0;

    const done = () => {
      settled = true;
      for (const t of timers) clearTimeout(t);
    };

    const launch = () => {
      if (settled || launched >= OVERPASS_ENDPOINTS.length) return;
      const endpoint = OVERPASS_ENDPOINTS[launched];
      launched += 1;

      // Hedge: if this one is merely slow, bring the next in alongside it.
      if (launched < OVERPASS_ENDPOINTS.length) {
        timers.push(setTimeout(launch, HEDGE_AFTER_MS));
      }

      postOverpass(endpoint, query, signal).then(
        (elements) => {
          if (settled) return;
          done();
          resolve(elements);
        },
        (err: unknown) => {
          errors.push(err instanceof Error ? err.message : String(err));
          if (settled) return;
          launch();
          if (errors.length === OVERPASS_ENDPOINTS.length) {
            done();
            reject(new Error(errors.join("; ")));
          }
        },
      );
    };

    launch();
  });
}

/** Ask the mirrors, resolving as soon as any succeeds. `null` if all failed. */
async function runOverpass(query: string): Promise<OverpassElement[] | null> {
  const controller = new AbortController();
  const overall = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await raceEndpoints(query, controller.signal);
  } catch (err) {
    logger.warn({ err }, "overpass unavailable");
    return null;
  } finally {
    clearTimeout(overall);
    controller.abort(); // cancel whichever attempts lost the race
  }
}

// --- Nominatim fallback ----------------------------------------------------

/**
 * A box roughly `metres` in every direction from a point, in the
 * left,top,right,bottom order Nominatim expects.
 */
function viewboxAround(lat: number, lon: number, metres: number): string {
  const dLat = metres / 111320;
  // Longitude degrees shrink towards the poles; the floor keeps the box finite
  // at extreme latitudes rather than dividing by ~0.
  const dLon = metres / (111320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.05));
  return [lon - dLon, lat + dLat, lon + dLon, lat - dLat].map((n) => n.toFixed(5)).join(",");
}

/**
 * Bounded Nominatim search, normalised into the Overpass element shape so
 * everything downstream — distance, ranking, map links — is identical.
 *
 * `bounded=1` with a viewbox around the user's own coordinates is what makes
 * this safe: the keyword never widens the search area, it only picks what to
 * look for inside a box we drew ourselves. Results are then filtered to real
 * amenities, so a road named "Hospital Road" is never offered as a hospital.
 */
async function nominatimNearby(
  lat: number,
  lon: number,
  amenities: string[],
): Promise<OverpassElement[] | null> {
  const url = new URL(NOMINATIM_SEARCH_URL);
  url.searchParams.set("q", amenities[0]);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "40");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("bounded", "1");
  url.searchParams.set("viewbox", viewboxAround(lat, lon, SEARCH_RADIUS_M));

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(FALLBACK_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`nominatim HTTP ${res.status}`);
    const rows = (await res.json()) as NominatimRow[];
    if (!Array.isArray(rows)) throw new Error("nominatim malformed");

    const elements = rows
      .filter((r) => r && r.category === "amenity" && r.type != null && amenities.includes(r.type))
      .map((r): OverpassElement => {
        const a = r.address ?? {};
        return {
          type: "node",
          lat: Number(r.lat),
          lon: Number(r.lon),
          tags: {
            name: r.name || (r.display_name ?? "").split(",")[0].trim(),
            amenity: r.type,
            "addr:housenumber": a.house_number,
            "addr:street": a.road,
            "addr:suburb": a.suburb ?? a.neighbourhood,
            "addr:city": a.city ?? a.town ?? a.village,
          },
        };
      })
      .filter(
        (el) =>
          Number.isFinite(el.lat) && Number.isFinite(el.lon) && Boolean(el.tags?.name),
      );

    logger.warn({ count: elements.length }, "overpass down; served from nominatim");
    return elements;
  } catch (err) {
    logger.warn({ err }, "nominatim fallback unavailable");
    return null;
  }
}

// --- geometry & formatting -------------------------------------------------

/** Metres between two coordinates. */
export function haversineMetres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** "700 m" / "2.4 km" — precision the user can act on, no false decimals. */
export function formatDistance(metres: number): string {
  // Rounding to the nearest 50 turns a facility across the road into "0 m",
  // which reads as a glitch rather than as "you are practically there".
  if (metres < 50) return "under 50 m";
  if (metres < 1000) return `${Math.round(metres / 50) * 50} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

/** Build a street address from OSM tags, skipping the many that are absent. */
function addressFrom(tags: Record<string, string | undefined>): string {
  const parts = [
    [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" "),
    tags["addr:suburb"],
    tags["addr:city"] ?? tags["addr:town"] ?? tags["addr:village"],
  ].filter((p): p is string => Boolean(p));
  return parts.join(", ");
}

/**
 * A true hospital is worth a short detour when someone asked for a hospital, so
 * it is treated as if it were 1km closer than it is. A clinic 200m away still
 * wins over a hospital 5km away; a hospital 1.2km away wins over a doctors'
 * office 900m away. Pharmacies are a single type, so this is a no-op for them.
 */
function rankFor(kind: FacilityKind, amenity: string, metres: number): number {
  if (kind !== "hospital") return metres;
  if (amenity === "hospital") return metres - 1000;
  if (amenity === "clinic") return metres;
  return metres + 500;
}

// --- public API ------------------------------------------------------------

/**
 * Look up health facilities near a coordinate.
 *
 * Returns a status, not just a list, because "the directory is down" and "there
 * is genuinely nothing here" need opposite replies. Collapsing them is the worst
 * failure this feature can have: an Overpass timeout reported as "I'm not seeing
 * any hospitals near you" while one stands 900m away.
 */
export async function lookupFacilities(opts: {
  lat: number;
  lon: number;
  kind?: FacilityKind;
  limit?: number;
}): Promise<FacilityLookup> {
  const kind = opts.kind ?? "hospital";
  const limit = opts.limit ?? 3;
  const { lat, lon } = opts;
  const spec = KINDS[kind];

  if (!spec || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { status: "invalid", results: [], source: null };
  }

  const key = cacheKey(kind, lat, lon);
  let elements = cacheGet(key);
  let source: FacilityLookup["source"] = "cache";

  if (!elements) {
    elements = await runOverpass(buildQuery(lat, lon, spec.amenities));
    source = "overpass";

    if (elements === null) {
      // Every mirror is down at once. Ask different infrastructure before
      // telling someone who may need care that we cannot answer at all.
      elements = await nominatimNearby(lat, lon, spec.amenities);
      source = "nominatim";
      // A thin keyword search finding nothing is not evidence that nothing is
      // there, so an empty fallback stays an outage. "None are mapped near you"
      // may only ever be said on the strength of the full amenity query.
      if (elements === null || elements.length === 0) {
        return { status: "unavailable", results: [], source: null };
      }
      cacheSet(key, elements, FALLBACK_CACHE_TTL_MS);
    } else {
      cacheSet(key, elements);
    }
  }

  const found = elements
    .map((el): Facility | null => {
      const tags = el.tags ?? {};
      const p = el.type === "node" ? el : el.center;
      const name = tags.name;
      const amenity = tags.amenity;
      // An unnamed pin helps nobody.
      if (!p || typeof p.lat !== "number" || typeof p.lon !== "number") return null;
      if (!name || !amenity) return null;
      const metres = haversineMetres(lat, lon, p.lat, p.lon);
      return {
        name,
        type: spec.labels[amenity] ?? "Clinic",
        amenity,
        address: addressFrom(tags),
        distanceMetres: metres,
        distanceText: formatDistance(metres),
        // Link by coordinate, not by name. A name-based maps query is only ever
        // a guess, and it is what produced links that pointed nowhere.
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=${p.lat.toFixed(6)},${p.lon.toFixed(6)}`,
        lat: p.lat,
        lon: p.lon,
      };
    })
    .filter((f): f is Facility => f !== null)
    .sort(
      (a, b) =>
        rankFor(kind, a.amenity, a.distanceMetres) - rankFor(kind, b.amenity, b.distanceMetres),
    );

  if (found.length === 0) return { status: "empty", results: [], source };
  return { status: "ok", results: found.slice(0, limit), source };
}

/** Words that mean "find me a place", per facility kind, across the four locales. */
const KIND_TRIGGERS: Record<FacilityKind, string[]> = {
  pharmacy: [
    "pharmacy",
    "pharmacies",
    "chemist",
    "drugstore",
    "drug store",
    "medical store",
    "medical shop",
    "medicine shop",
    "ఫార్మసీ",
    "మెడికల్ షాప్",
    "మందుల షాప్",
    "మెడికల్ స్టోర్",
    "फार्मेसी",
    "दवा की दुकान",
    "मेडिकल स्टोर",
    "दवाखाना",
    "केमिस्ट",
    "صيدلية",
    "صيدليات",
  ],
  hospital: [
    "hospital",
    "clinic",
    "doctor",
    "phc",
    "emergency care",
    "nursing home",
    "ఆసుపత్రి",
    "ఆస్పత్రి",
    "హాస్పిటల్",
    "క్లినిక్",
    "డాక్టర్",
    "अस्पताल",
    "हॉस्पिटल",
    "क्लिनिक",
    "डॉक्टर",
    "चिकित्सालय",
    "مستشفى",
    "مستشفيات",
    "عيادة",
    "طبيب",
  ],
};

/**
 * Which kind of place, if any, a message is asking for.
 *
 * Pharmacy is checked first: "medical store" contains no hospital word, but
 * "pharmacy near the hospital" should still find a pharmacy.
 */
export function detectFacilityKind(text: string): FacilityKind | null {
  const t = String(text ?? "").toLowerCase();
  if (!t) return null;
  for (const kind of ["pharmacy", "hospital"] as const) {
    if (KIND_TRIGGERS[kind].some((w) => t.includes(w))) return kind;
  }
  return null;
}
