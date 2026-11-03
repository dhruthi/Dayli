/**
 * Nearby health facility lookup.
 *
 * Replaces a Nominatim free-text search ("hospital in <city>") that had two
 * failure modes serious enough to be dangerous in this product:
 *
 *   1. It searched worldwide. When the caller passed the UI placeholder
 *      "your location" as a city name, Nominatim happily returned hospitals
 *      in Ouarzazate, Morocco to a user in Hyderabad — while their real
 *      coordinates sat unused in the session.
 *   2. Results were not ordered by distance, so even a correct city gave an
 *      arbitrary three rather than the closest three.
 *
 * Overpass is the right tool for "what is near this point": it queries by
 * radius around real coordinates and returns each element's position, so we
 * can measure the distance ourselves and sort by it. Coordinates are the only
 * input — a place name is never used to locate anyone.
 */

import { logger } from './logger.js';

/**
 * Global-coverage Overpass instances only.
 *
 * Region-limited mirrors (overpass.osm.ch, overpass.osm.jp) must never be
 * added: probed from here they answer HTTP 200 with zero elements for an
 * Indian coordinate, which is indistinguishable from "there is no pharmacy
 * within 25km" and would be reported to the user as exactly that. A mirror
 * that does not hold the whole planet is worse than no mirror.
 */
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

/**
 * One request, widest useful radius, sorted client-side.
 *
 * The previous version walked 3km -> 10km -> 25km, and because the public
 * Overpass instances are queue-bound rather than query-bound (a 3km search
 * measured slower than a 25km one), that cost up to six sequential requests
 * for one question. In the field it timed out and the user was told there
 * were no hospitals nearby while one stood 900m away.
 */
const SEARCH_RADIUS_M = 25000;

/** Generous: a slow answer beats a wrong "there is nothing near you". */
const REQUEST_TIMEOUT_MS = 20000;

/** If the primary has not answered by now, ask the mirror too and take the first reply. */
const HEDGE_AFTER_MS = 3500;

/**
 * Last resort when every Overpass mirror is down at the same time — which is
 * what produced the reply this fallback exists to prevent: a user shared their
 * pin, asked for nearby hospitals, and got an apology for an unreachable
 * directory instead of an answer.
 *
 * Nominatim is different infrastructure, so it survives an Overpass outage. It
 * is used strictly as a *bounded* search — a box drawn around the user's own
 * coordinates — never as the free-text "hospital in <place>" lookup that once
 * sent a Hyderabad user to Morocco. Results still carry real coordinates, so
 * distances are measured here exactly as they are for Overpass results.
 */
const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const FALLBACK_TIMEOUT_MS = 9000;

/**
 * A fallback answer is thinner than an Overpass one — one keyword search
 * rather than a full amenity query — so it is cached for minutes, not hours,
 * and the next question gets another chance at the complete list.
 */
const FALLBACK_CACHE_TTL_MS = 15 * 60 * 1000;

/** Facilities do not move. Cache hard so a repeat question is instant. */
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 300;

/** Cache buckets ~1.1km wide, well inside the search radius, so neighbours share a fetch. */
const CACHE_GRID_DP = 2;

/** Spacing between background prefetches, to stay under mirror rate limits. */
const PREFETCH_GAP_MS = 2000;

/** Background retries per kind, and the wait between them. */
const PREFETCH_ATTEMPTS = 3;
const PREFETCH_RETRY_MS = 20000;

const cache = new Map();

function cacheKey(kind, lat, lon) {
  return `${kind}:${lat.toFixed(CACHE_GRID_DP)}:${lon.toFixed(CACHE_GRID_DP)}`;
}

function cacheGet(key) {
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

function cacheSet(key, elements, ttl = CACHE_TTL_MS) {
  cache.set(key, { at: Date.now(), elements, ttl });
  while (cache.size > CACHE_MAX_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }
}

/** Test seam. */
export function _clearPlacesCache() {
  cache.clear();
}

function buildQuery(lat, lon, amenities) {
  const filter = `"amenity"~"^(${amenities.join('|')})$"`;
  return `[out:json][timeout:25];nwr[${filter}](around:${SEARCH_RADIUS_M},${lat},${lon});out center 80;`;
}

async function postOverpass(endpoint, query, signal) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'User-Agent': 'DayliAI-HealthCopilot/2.0 (contact@dayli.ai)',
    },
    body: query,
    signal,
  });
  if (!res.ok) throw new Error(`${endpoint} HTTP ${res.status}`);
  const json = await res.json();
  if (!json || !Array.isArray(json.elements)) throw new Error(`${endpoint} malformed`);
  return json.elements;
}

/**
 * Hedged request: ask the primary, and only if it is slow ask the mirror too,
 * taking whichever answers first. This cuts the tail latency that produced the
 * timeouts without routinely doubling load on volunteer-run servers.
 *
 * @returns {Promise<Array|null>} elements, or null if every endpoint failed
 */
function raceEndpoints(query, signal) {
  return new Promise((resolve, reject) => {
    const errors = [];
    const timers = [];
    let settled = false;
    let launched = 0;

    const done = () => {
      settled = true;
      timers.forEach(clearTimeout);
    };

    const launch = () => {
      if (settled || launched >= OVERPASS_ENDPOINTS.length) return;
      const endpoint = OVERPASS_ENDPOINTS[launched++];

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
        (err) => {
          errors.push(err);
          if (settled) return;
          // A fast failure should not wait out the hedge delay.
          launch();
          if (errors.length === OVERPASS_ENDPOINTS.length) {
            done();
            reject(new Error(errors.map((e) => e.message).join('; ')));
          }
        }
      );
    };

    launch();
  });
}

/**
 * Ask the mirrors for one query, resolving as soon as any succeeds.
 *
 * @returns {Promise<Array|null>} elements, or null if every endpoint failed
 */
async function runOverpass(query) {
  const controller = new AbortController();
  const overall = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await raceEndpoints(query, controller.signal);
  } catch (err) {
    logger.warn?.(`[places] overpass unavailable: ${err?.message || err}`);
    return null;
  } finally {
    clearTimeout(overall);
    controller.abort(); // cancel whichever attempts lost the race
  }
}

/**
 * A box roughly `metres` in every direction from a point, in the
 * left,top,right,bottom order Nominatim expects.
 */
function viewboxAround(lat, lon, metres) {
  const dLat = metres / 111320;
  // Longitude degrees shrink towards the poles; the floor keeps the box finite
  // at extreme latitudes rather than dividing by ~0.
  const dLon = metres / (111320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.05));
  return [lon - dLon, lat + dLat, lon + dLon, lat - dLat].map((n) => n.toFixed(5)).join(',');
}

/**
 * Bounded Nominatim search, normalised into the Overpass element shape so
 * everything downstream — distance, ranking, map links — is identical.
 *
 * `bounded=1` with a viewbox around the user's own coordinates is what makes
 * this safe: the keyword never widens the search area, it only picks what to
 * look for inside a box we drew ourselves. Results are then filtered to real
 * amenities, so a road named "Hospital Road" is never offered as a hospital.
 *
 * @returns {Promise<Array|null>} elements, or null if the fallback also failed
 */
async function nominatimNearby(lat, lon, amenities) {
  const params = new URLSearchParams({
    q: amenities[0],
    format: 'jsonv2',
    limit: '40',
    addressdetails: '1',
    bounded: '1',
    viewbox: viewboxAround(lat, lon, SEARCH_RADIUS_M),
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FALLBACK_TIMEOUT_MS);
  try {
    const res = await fetch(`${NOMINATIM_SEARCH_URL}?${params}`, {
      headers: { 'User-Agent': 'DayliAI-HealthCopilot/2.0 (contact@dayli.ai)' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`nominatim HTTP ${res.status}`);
    const rows = await res.json();
    if (!Array.isArray(rows)) throw new Error('nominatim malformed');

    const elements = rows
      .filter((r) => r && r.category === 'amenity' && amenities.includes(r.type))
      .map((r) => {
        const a = r.address || {};
        return {
          type: 'node',
          lat: Number(r.lat),
          lon: Number(r.lon),
          tags: {
            name: r.name || String(r.display_name || '').split(',')[0].trim(),
            amenity: r.type,
            'addr:housenumber': a.house_number,
            'addr:street': a.road,
            'addr:suburb': a.suburb || a.neighbourhood,
            'addr:city': a.city || a.town || a.village,
          },
        };
      })
      .filter((el) => Number.isFinite(el.lat) && Number.isFinite(el.lon) && el.tags.name);

    logger.warn?.(`[places] overpass down, served ${elements.length} result(s) from nominatim`);
    return elements;
  } catch (err) {
    logger.warn?.(`[places] nominatim fallback unavailable: ${err?.message || err}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** OSM amenity values per facility kind, most specific first. */
const KINDS = {
  hospital: {
    amenities: ['hospital', 'clinic', 'doctors'],
    // A hospital outranks a walk-in clinic for someone who asked for a
    // hospital, but not by so much that we send them past three closer
    // options — see rankFor().
    labels: { hospital: 'Hospital', clinic: 'Clinic', doctors: "Doctor's clinic" },
  },
  pharmacy: {
    amenities: ['pharmacy'],
    labels: { pharmacy: 'Pharmacy' },
  },
};

/** Metres between two coordinates. */
export function haversineMetres(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** "700 m" / "2.4 km" — precision the user can act on, no false decimals. */
export function formatDistance(metres) {
  // Rounding to the nearest 50 turns a facility across the road into "0 m",
  // which reads as a glitch rather than as "you are practically there".
  if (metres < 50) return 'under 50 m';
  if (metres < 1000) return `${Math.round(metres / 50) * 50} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

/** Build a street address from OSM tags, skipping the many that are absent. */
function addressFrom(tags) {
  const parts = [
    [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' '),
    tags['addr:suburb'],
    tags['addr:city'] || tags['addr:town'] || tags['addr:village'],
  ].filter(Boolean);
  return parts.join(', ');
}

/**
 * A true hospital is worth a short detour when someone asked for a hospital,
 * so it is treated as if it were 1km closer than it is. A clinic 200m away
 * still wins over a hospital 5km away; a hospital 1.2km away wins over a
 * doctors' office 900m away. Pharmacies are a single type, so this is a no-op
 * for them.
 */
function rankFor(kind, amenity, metres) {
  if (kind !== 'hospital') return metres;
  if (amenity === 'hospital') return metres - 1000;
  if (amenity === 'clinic') return metres;
  return metres + 500;
}

/**
 * Look up health facilities near a coordinate.
 *
 * Returns a status, not just a list, because "the directory is down" and
 * "there is genuinely nothing here" need opposite replies. Collapsing them
 * caused the worst failure this feature has had: an Overpass timeout was
 * reported to a pregnant user as "I'm not seeing any nearby hospitals",
 * followed by a request for the location pin she had already shared, while a
 * hospital stood 900m away.
 *
 * @param {object} opts
 * @param {number} opts.lat
 * @param {number} opts.lon
 * @param {'hospital'|'pharmacy'} [opts.kind]
 * @param {number} [opts.limit]
 * @returns {Promise<{status:'ok'|'empty'|'unavailable'|'invalid', results:Array, source?:string|null}>}
 */
export async function lookupFacilities({ lat, lon, kind = 'hospital', limit = 3 }) {
  const spec = KINDS[kind];
  if (!spec || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { status: 'invalid', results: [] };
  }

  const key = cacheKey(kind, lat, lon);
  let elements = cacheGet(key);
  let source = 'cache';

  if (!elements) {
    elements = await runOverpass(buildQuery(lat, lon, spec.amenities));
    source = 'overpass';

    if (elements === null) {
      // Every mirror is down at once. Ask different infrastructure before
      // telling someone who may need care that we cannot answer at all.
      elements = await nominatimNearby(lat, lon, spec.amenities);
      source = 'nominatim';
      // A thin keyword search finding nothing is not evidence that nothing is
      // there, so an empty fallback stays an outage. "None are mapped near
      // you" may only ever be said on the strength of the full amenity query.
      if (elements === null || elements.length === 0) {
        return { status: 'unavailable', results: [], source: null };
      }
      cacheSet(key, elements, FALLBACK_CACHE_TTL_MS);
    } else {
      cacheSet(key, elements);
    }
  }

  const found = elements
    .map((el) => {
      const tags = el.tags || {};
      const p = el.type === 'node' ? el : el.center;
      if (!p || !tags.name) return null; // an unnamed pin helps nobody
      const metres = haversineMetres(lat, lon, p.lat, p.lon);
      return {
        name: tags.name,
        type: spec.labels[tags.amenity] || 'Clinic',
        amenity: tags.amenity,
        address: addressFrom(tags),
        distanceMetres: metres,
        distanceText: formatDistance(metres),
        // Link by coordinate, not by name. A name-based maps query is only
        // ever a guess, and it is what produced the "?q=<name> your location"
        // links that pointed nowhere.
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=${p.lat.toFixed(6)},${p.lon.toFixed(6)}`,
        lat: p.lat,
        lon: p.lon,
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        rankFor(kind, a.amenity, a.distanceMetres) - rankFor(kind, b.amenity, b.distanceMetres)
    );

  if (found.length === 0) return { status: 'empty', results: [], source };
  return { status: 'ok', results: found.slice(0, limit), source };
}

/**
 * List-only form, for callers that treat "none" and "could not look up" the
 * same way. Prefer lookupFacilities() anywhere the difference reaches a user.
 */
export async function findNearbyFacilities(opts) {
  const { results } = await lookupFacilities(opts);
  return results;
}

/**
 * Beyond this, a result is not "in the vicinity" in any useful sense and the
 * user should be told so rather than have it presented as their nearest
 * option. We still return it — knowing the closest is 12km away is real
 * information — but the caller qualifies it.
 */
export const VICINITY_LIMIT_M = 6000;

/**
 * Localized request for a location pin, for when someone asks for the nearest
 * place and we have nothing precise enough to answer with.
 *
 * @param {'hospital'|'pharmacy'} kind
 * @param {'en'|'te'|'hi'|'ar'} locale
 */
export function locationRequestFor(kind, locale = 'en') {
  const copy = {
    en: {
      hospital: 'To find the hospitals closest to you, I need to know where you are.\n\nTap below to share your location — it is used only for this search.',
      pharmacy: 'To find the pharmacies closest to you, I need to know where you are.\n\nTap below to share your location — it is used only for this search.',
    },
    te: {
      hospital: 'మీకు దగ్గరలోని ఆసుపత్రులను కనుగొనడానికి మీరు ఎక్కడ ఉన్నారో తెలియాలి.\n\nక్రింద నొక్కి మీ లొకేషన్ పంపండి — ఇది ఈ శోధన కోసం మాత్రమే ఉపయోగిస్తాము.',
      pharmacy: 'మీకు దగ్గరలోని మెడికల్ షాపులను కనుగొనడానికి మీరు ఎక్కడ ఉన్నారో తెలియాలి.\n\nక్రింద నొక్కి మీ లొకేషన్ పంపండి — ఇది ఈ శోధన కోసం మాత్రమే ఉపయోగిస్తాము.',
    },
    hi: {
      hospital: 'आपके सबसे नज़दीकी अस्पताल खोजने के लिए मुझे यह जानना होगा कि आप कहाँ हैं।\n\nनीचे टैप करके अपना स्थान साझा करें — इसका उपयोग केवल इसी खोज के लिए होगा।',
      pharmacy: 'आपकी सबसे नज़दीकी दवा की दुकान खोजने के लिए मुझे यह जानना होगा कि आप कहाँ हैं।\n\nनीचे टैप करके अपना स्थान साझा करें — इसका उपयोग केवल इसी खोज के लिए होगा।',
    },
  };
  const row = copy[locale] || copy.en;
  return { kind: 'location_request', body: row[kind] || row.hospital };
}

/**
 * Warm the cache for a location we have just learned about.
 *
 * The lookup itself is 6-16s against public Overpass mirrors — fine for a
 * background task, far too slow to sit in front of a reply to "where is the
 * nearest hospital". We know the user's position the moment they drop a pin,
 * which is usually well before they ask, so fetch both kinds then and serve
 * the real question from cache.
 *
 * Fire and forget: never awaited, never surfaces an error, and a failure just
 * means the question pays the normal latency.
 */
export function prefetchFacilities(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
  // Sequential, with a gap. Firing both kinds at once earns an HTTP 429 from
  // the same mirror and the second prefetch is simply lost — measured, not
  // theoretical. Nothing is waiting on this, so pace it politely.
  (async () => {
    for (const kind of ['hospital', 'pharmacy']) {
      // The public mirrors have real outages. Nothing is waiting on this, so
      // retry a few times spaced out: a warm cache turns a 7-16s question
      // into a 1ms one, and an outage now is often gone in a minute.
      for (let attempt = 0; attempt < PREFETCH_ATTEMPTS; attempt += 1) {
        let status = 'unavailable';
        try {
          ({ status } = await lookupFacilities({ lat, lon, kind }));
        } catch {
          /* a cold cache is the only cost */
        }
        if (status !== 'unavailable') break;
        await new Promise((r) => setTimeout(r, PREFETCH_RETRY_MS));
      }
      await new Promise((r) => setTimeout(r, PREFETCH_GAP_MS));
    }
  })();
}

const reverseCache = new Map();

/**
 * Turn a location pin into a place name.
 *
 * A pin carries no name, so everything downstream fell back to printing the
 * raw coordinates at the user ("📍 16.69, 78.91: 30.9°C"), which is both ugly
 * and slightly alarming in a health chat. Nominatim's reverse endpoint at
 * town/suburb zoom gives the name a person would actually use.
 *
 * Coarse by design: we keep the town, never the street, and cache on a ~1km
 * grid, so this never becomes a precise record of where someone lives.
 *
 * @returns {Promise<string|null>} e.g. "Devarakonda", or null if unavailable
 */
export async function reverseGeocode(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  if (reverseCache.has(key)) return reverseCache.get(key);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=14&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'DayliAI-HealthCopilot/2.0 (contact@dayli.ai)' },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const a = data?.address || {};
    const name =
      a.village || a.town || a.city || a.suburb || a.municipality || a.county || a.state_district || null;
    if (name && reverseCache.size < 500) reverseCache.set(key, name);
    return name;
  } catch {
    return null; // a missing name is cosmetic; never block a reply on it
  } finally {
    clearTimeout(timer);
  }
}

/** Words that mean "find me a place", per facility kind, across the three locales. */
const KIND_TRIGGERS = {
  pharmacy: [
    'pharmacy', 'pharmacies', 'chemist', 'drugstore', 'drug store',
    'medical store', 'medical shop', 'medicine shop',
    'ఫార్మసీ', 'మెడికల్ షాప్', 'మందుల షాప్', 'మెడికల్ స్టోర్',
    'फार्मेसी', 'दवा की दुकान', 'मेडिकल स्टोर', 'दवाखाना', 'केमिस्ट',
  ],
  hospital: [
    'hospital', 'clinic', 'doctor', 'phc', 'emergency care', 'nursing home',
    'ఆసుపత్రి', 'ఆస్పత్రి', 'హాస్పిటల్', 'క్లినిక్', 'డాక్టర్',
    'अस्पताल', 'हॉस्पिटल', 'क्लिनिक', 'डॉक्टर', 'चिकित्सालय',
  ],
};

/**
 * Which kind of place, if any, a message is asking for.
 * Pharmacy is checked first: "medical store" contains no hospital word, but
 * "pharmacy near the hospital" should still find a pharmacy.
 *
 * @param {string} text
 * @returns {'hospital'|'pharmacy'|null}
 */
export function detectFacilityKind(text) {
  const t = String(text || '').toLowerCase();
  if (!t) return null;
  for (const kind of ['pharmacy', 'hospital']) {
    if (KIND_TRIGGERS[kind].some((w) => t.includes(w))) return kind;
  }
  return null;
}
