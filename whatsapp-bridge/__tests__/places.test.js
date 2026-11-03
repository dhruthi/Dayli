import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
  detectFacilityKind,
  haversineMetres,
  formatDistance,
  findNearbyFacilities,
  lookupFacilities,
  prefetchFacilities,
  locationRequestFor,
  VICINITY_LIMIT_M,
  _clearPlacesCache,
} from '../lib/places.js';

beforeEach(() => _clearPlacesCache());
afterEach(() => vi.unstubAllGlobals());

/** Minimal Overpass element factory. */
const node = (name, amenity, lat, lon, tags = {}) => ({
  type: 'node',
  lat,
  lon,
  tags: { name, amenity, ...tags },
});

const stubOverpass = (elements) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ elements }) }))
  );

describe('detectFacilityKind', () => {
  it('detects hospital queries in English', () => {
    expect(detectFacilityKind('Where is the nearest hospital to me ?')).toBe('hospital');
    expect(detectFacilityKind('find a clinic')).toBe('hospital');
    expect(detectFacilityKind('I need a doctor')).toBe('hospital');
  });

  it('detects pharmacy queries, which the old keyword list missed entirely', () => {
    expect(detectFacilityKind('nearest pharmacy')).toBe('pharmacy');
    expect(detectFacilityKind('where can I find a medical store')).toBe('pharmacy');
    expect(detectFacilityKind('any chemist nearby?')).toBe('pharmacy');
  });

  it('detects both kinds in Telugu and Hindi', () => {
    expect(detectFacilityKind('దగ్గరలో ఆసుపత్రి ఎక్కడ ఉంది?')).toBe('hospital');
    expect(detectFacilityKind('नजदीकी अस्पताल कहाँ है?')).toBe('hospital');
    expect(detectFacilityKind('మెడికల్ షాప్ ఎక్కడ?')).toBe('pharmacy');
    expect(detectFacilityKind('दवा की दुकान कहाँ है?')).toBe('pharmacy');
  });

  it('prefers pharmacy when both are mentioned', () => {
    expect(detectFacilityKind('a pharmacy near the hospital')).toBe('pharmacy');
  });

  it('returns null for unrelated messages', () => {
    expect(detectFacilityKind('my baby has a fever')).toBeNull();
    expect(detectFacilityKind('')).toBeNull();
  });
});

describe('distance helpers', () => {
  it('measures a known distance', () => {
    // Hyderabad -> Bengaluru is ~500km.
    const m = haversineMetres(17.385, 78.4867, 12.9716, 77.5946);
    expect(m / 1000).toBeGreaterThan(490);
    expect(m / 1000).toBeLessThan(520);
  });

  it('is zero for the same point', () => {
    expect(haversineMetres(17.385, 78.4867, 17.385, 78.4867)).toBeCloseTo(0);
  });

  it('formats metres and kilometres readably', () => {
    expect(formatDistance(120)).toBe('100 m');
    // Rounding to the nearest 50 used to print "0 m" for a facility across
    // the road, which reads as a broken value rather than a very close one.
    expect(formatDistance(20)).toBe('under 50 m');
    expect(formatDistance(940)).toBe('950 m');
    expect(formatDistance(2400)).toBe('2.4 km');
  });
});

describe('findNearbyFacilities', () => {
  const HERE = { lat: 17.4399, lon: 78.4983 };

  it('sorts by real distance from the user, nearest first', async () => {
    stubOverpass([
      node('Far Clinic', 'clinic', 17.4600, 78.5200),
      node('Near Clinic', 'clinic', 17.4405, 78.4988),
      node('Mid Clinic', 'clinic', 17.4480, 78.5050),
    ]);
    const r = await findNearbyFacilities({ ...HERE, kind: 'hospital' });
    expect(r.map((f) => f.name)).toEqual(['Near Clinic', 'Mid Clinic', 'Far Clinic']);
    expect(r[0].distanceMetres).toBeLessThan(r[1].distanceMetres);
  });

  it('links to coordinates, never to a guessed name query', async () => {
    stubOverpass([node('Vasan Healthcare', 'hospital', 17.4405, 78.4988)]);
    const [f] = await findNearbyFacilities({ ...HERE, kind: 'hospital' });
    expect(f.mapsUrl).toBe(
      'https://www.google.com/maps/search/?api=1&query=17.440500,78.498800'
    );
    // The old bug produced links like "?q=<name>%20your%20location".
    expect(f.mapsUrl).not.toContain('your');
    expect(f.mapsUrl).not.toContain(encodeURIComponent(f.name));
  });

  it('drops unnamed pins, which are useless to a user', async () => {
    stubOverpass([
      { type: 'node', lat: 17.4400, lon: 78.4984, tags: { amenity: 'hospital' } },
      node('Real Hospital', 'hospital', 17.4500, 78.5000),
    ]);
    const r = await findNearbyFacilities({ ...HERE, kind: 'hospital' });
    expect(r.map((f) => f.name)).toEqual(['Real Hospital']);
  });

  it('prefers a hospital over a doctors office at similar distance', async () => {
    stubOverpass([
      node('Small Practice', 'doctors', 17.4405, 78.4988), // ~80m
      node('City Hospital', 'hospital', 17.4440, 78.5010), // ~530m
    ]);
    const r = await findNearbyFacilities({ ...HERE, kind: 'hospital' });
    expect(r[0].name).toBe('City Hospital');
  });

  it('does not send the user far for a hospital when a clinic is much closer', async () => {
    stubOverpass([
      node('Corner Clinic', 'clinic', 17.4401, 78.4984), // ~30m
      node('Distant Hospital', 'hospital', 17.4900, 78.5400), // ~7km
    ]);
    const r = await findNearbyFacilities({ ...HERE, kind: 'hospital' });
    expect(r[0].name).toBe('Corner Clinic');
  });

  it('only returns pharmacies for a pharmacy query', async () => {
    stubOverpass([node('Apollo Pharmacy', 'pharmacy', 17.4405, 78.4988)]);
    const r = await findNearbyFacilities({ ...HERE, kind: 'pharmacy' });
    expect(r[0].type).toBe('Pharmacy');
  });

  it('returns nothing rather than guessing when the network fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await findNearbyFacilities({ ...HERE, kind: 'hospital' })).toEqual([]);
  });

  it('refuses to search without valid coordinates', async () => {
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);
    expect(await findNearbyFacilities({ lat: null, lon: null })).toEqual([]);
    expect(await findNearbyFacilities({ lat: NaN, lon: 78.5 })).toEqual([]);
    // A place name must never be able to trigger a lookup on its own.
    expect(spy).not.toHaveBeenCalled();
  });

  it('sends the user coordinates to Overpass, not any place name', async () => {
    const spy = vi.fn(async () => ({ ok: true, json: async () => ({ elements: [] }) }));
    vi.stubGlobal('fetch', spy);
    await findNearbyFacilities({ ...HERE, kind: 'hospital' });
    for (const call of spy.mock.calls) {
      const body = String(call[1]?.body || '');
      expect(body).toContain(`${HERE.lat},${HERE.lon}`);
      expect(body.toLowerCase()).not.toContain('your location');
    }
  });
});

describe('Vicinity guarantees', () => {
  it('asks for a pin in the language the user is speaking', () => {
    expect(locationRequestFor('hospital', 'en').kind).toBe('location_request');
    expect(locationRequestFor('hospital', 'te').body).toMatch(/ఆసుపత్రుల/);
    expect(locationRequestFor('pharmacy', 'hi').body).toMatch(/दवा/);
    // Unknown locale falls back rather than sending an empty prompt.
    expect(locationRequestFor('hospital', 'ar').body).toBe(
      locationRequestFor('hospital', 'en').body
    );
  });

  it('names the right kind of place in the request', () => {
    expect(locationRequestFor('pharmacy', 'en').body).toMatch(/pharmacies/i);
    expect(locationRequestFor('hospital', 'en').body).toMatch(/hospitals/i);
  });

  it('sets a vicinity limit that is a plausible walk/short ride', () => {
    expect(VICINITY_LIMIT_M).toBeGreaterThan(1000);
    expect(VICINITY_LIMIT_M).toBeLessThanOrEqual(10000);
  });

  it('makes exactly one request per lookup, not one per radius', async () => {
    const spy = vi.fn(async () => ({
      ok: true,
      json: async () => ({ elements: [node('Close Hospital', 'hospital', 17.4405, 78.4988)] }),
    }));
    vi.stubGlobal('fetch', spy);
    await lookupFacilities({ lat: 17.4399, lon: 78.4983, kind: 'hospital' });
    // The old 3km/10km/25km walk cost up to six sequential requests and timed
    // out in the field; one wide query sorted client-side replaces it.
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('serves a repeat question from cache without hitting the network', async () => {
    const spy = vi.fn(async () => ({
      ok: true,
      json: async () => ({ elements: [node('Close Hospital', 'hospital', 17.4405, 78.4988)] }),
    }));
    vi.stubGlobal('fetch', spy);
    const a = await lookupFacilities({ lat: 17.4399, lon: 78.4983, kind: 'hospital' });
    const b = await lookupFacilities({ lat: 17.4399, lon: 78.4983, kind: 'hospital' });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(b.results[0].name).toBe(a.results[0].name);
  });

  it('recomputes distance from the caller position on a cache hit', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ elements: [node('Anchor Hospital', 'hospital', 17.4500, 78.5000)] }),
    })));
    // Same ~1km cache bucket, different exact positions.
    const near = await lookupFacilities({ lat: 17.4495, lon: 78.4995, kind: 'hospital' });
    const far = await lookupFacilities({ lat: 17.4450, lon: 78.4950, kind: 'hospital' });
    expect(far.results[0].distanceMetres).toBeGreaterThan(near.results[0].distanceMetres);
  });
});

describe('Outage is not the same as absence', () => {
  beforeEach(() => _clearPlacesCache());

  const HERE = { lat: 16.6914, lon: 78.9171, kind: 'hospital' };

  it('reports unavailable when the directory cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('timeout'); }));
    const r = await lookupFacilities(HERE);
    // This is the exact field failure: a timeout was reported to a pregnant
    // user as "no nearby hospitals" while one stood 900m away.
    expect(r.status).toBe('unavailable');
    expect(r.results).toEqual([]);
  });

  it('reports unavailable on an HTTP error, not empty', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 504 })));
    expect((await lookupFacilities(HERE)).status).toBe('unavailable');
  });

  it('reports unavailable on a malformed body, not empty', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })));
    expect((await lookupFacilities(HERE)).status).toBe('unavailable');
  });

  it('reports empty only when the directory actually answered with nothing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ elements: [] }) })));
    const r = await lookupFacilities(HERE);
    expect(r.status).toBe('empty');
  });

  it('reports empty when every result was an unnamed pin', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ elements: [{ type: 'node', lat: 16.69, lon: 78.91, tags: { amenity: 'hospital' } }] }),
    })));
    expect((await lookupFacilities(HERE)).status).toBe('empty');
  });

  it('reports invalid without a request when coordinates are missing', async () => {
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);
    expect((await lookupFacilities({ lat: null, lon: null })).status).toBe('invalid');
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not cache a failed lookup', async () => {
    let mode = 'fail';
    vi.stubGlobal('fetch', vi.fn(async () => {
      if (mode === 'fail') throw new Error('transient');
      return {
        ok: true,
        json: async () => ({ elements: [node('Recovered Hospital', 'hospital', 16.6920, 78.9175)] }),
      };
    }));
    expect((await lookupFacilities(HERE)).status).toBe('unavailable');
    // A transient outage must not poison the cache for six hours.
    mode = 'ok';
    const second = await lookupFacilities(HERE);
    expect(second.status).toBe('ok');
    expect(second.results[0].name).toBe('Recovered Hospital');
  });
});

describe('Mirror failover', () => {
  beforeEach(() => _clearPlacesCache());
  const HERE = { lat: 16.6914, lon: 78.9171, kind: 'pharmacy' };

  it('falls straight to the next mirror when the first fails fast', async () => {
    const seen = [];
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      seen.push(String(url));
      if (seen.length === 1) throw new Error('502');
      return { ok: true, json: async () => ({ elements: [node('Backup Pharmacy', 'pharmacy', 16.6920, 78.9175)] }) };
    }));
    const t0 = Date.now();
    const r = await lookupFacilities(HERE);
    expect(r.status).toBe('ok');
    expect(r.results[0].name).toBe('Backup Pharmacy');
    expect(seen[0]).not.toBe(seen[1]);
    // Must not wait out the hedge delay on an error the mirror already reported.
    expect(Date.now() - t0).toBeLessThan(1500);
  });

  it('only gives up once every mirror has failed', async () => {
    const seen = [];
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      seen.push(String(url));
      throw new Error('down');
    }));
    expect((await lookupFacilities(HERE)).status).toBe('unavailable');
    expect(new Set(seen).size).toBeGreaterThanOrEqual(3);
  });

  it('uses only global-coverage mirrors', async () => {
    const seen = [];
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      seen.push(String(url));
      throw new Error('down');
    }));
    await lookupFacilities(HERE);
    // A country-scoped mirror answers 200/zero-elements for India, which would
    // surface as a confident "nothing within 25km".
    for (const url of seen) {
      expect(url).not.toMatch(/osm\.(ch|jp|fr|it|pl)/);
    }
  });
});

describe('Prefetch', () => {
  beforeEach(() => { _clearPlacesCache(); vi.useFakeTimers(); });
  afterEach(() => vi.useRealTimers());

  it('warms the cache so the real question is served without a request', async () => {
    const spy = vi.fn(async () => ({
      ok: true,
      json: async () => ({ elements: [node('Prefetched Hospital', 'hospital', 16.6920, 78.9175)] }),
    }));
    vi.stubGlobal('fetch', spy);

    prefetchFacilities(16.6914, 78.9171);
    await vi.advanceTimersByTimeAsync(10000);
    const callsAfterPrefetch = spy.mock.calls.length;

    const r = await lookupFacilities({ lat: 16.6914, lon: 78.9171, kind: 'hospital' });
    expect(r.status).toBe('ok');
    expect(r.results[0].name).toBe('Prefetched Hospital');
    // The user's question itself must cost nothing.
    expect(spy.mock.calls.length).toBe(callsAfterPrefetch);
  });

  it('does not fire both kinds at once, which earns a 429', async () => {
    const startedAt = [];
    vi.stubGlobal('fetch', vi.fn(async () => {
      startedAt.push(Date.now());
      return { ok: true, json: async () => ({ elements: [] }) };
    }));
    prefetchFacilities(16.6914, 78.9171);
    await vi.advanceTimersByTimeAsync(10000);
    expect(startedAt.length).toBe(2);
    expect(startedAt[1] - startedAt[0]).toBeGreaterThanOrEqual(1000);
  });

  it('ignores invalid coordinates without touching the network', () => {
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);
    prefetchFacilities(null, null);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('Nominatim fallback when every Overpass mirror is down', () => {
  beforeEach(() => _clearPlacesCache());

  const HERE = { lat: 16.6914, lon: 78.9171, kind: 'hospital' };

  /** Overpass always fails; Nominatim answers with `rows`. */
  const stubOutage = (rows, onUrl = () => {}) =>
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const u = String(url);
        onUrl(u);
        if (!u.includes('nominatim')) throw new Error('overpass down');
        return { ok: true, json: async () => rows };
      })
    );

  const nrow = (name, type, lat, lon) => ({
    name,
    category: 'amenity',
    type,
    lat: String(lat),
    lon: String(lon),
    display_name: `${name}, Devarakonda`,
    address: { road: 'Main Road', village: 'Devarakonda' },
  });

  it('answers the question instead of reporting an outage', async () => {
    stubOutage([
      nrow('District Hospital', 'hospital', 16.6990, 78.9200),
      nrow('Sai Clinic', 'clinic', 16.6920, 78.9175),
    ]);
    const r = await lookupFacilities(HERE);
    // The reply this fixes: a shared pin, "nearby hospitals", and an apology.
    expect(r.status).toBe('ok');
    expect(r.source).toBe('nominatim');
    expect(r.results.map((x) => x.name)).toContain('District Hospital');
    expect(r.results[0].distanceMetres).toBeGreaterThan(0);
    expect(r.results[0].mapsUrl).toContain('query=16.6');
  });

  it('searches a box around the user, never a place name', async () => {
    let fallbackUrl = '';
    stubOutage([nrow('District Hospital', 'hospital', 16.6990, 78.9200)], (u) => {
      if (u.includes('nominatim')) fallbackUrl = u;
    });
    await lookupFacilities(HERE);
    // Unbounded free text is what once returned Moroccan hospitals to a user
    // in Hyderabad; the viewbox is drawn from their own coordinates.
    expect(fallbackUrl).toContain('bounded=1');
    expect(fallbackUrl).toMatch(/viewbox=[-\d.]+%2C[-\d.]+%2C[-\d.]+%2C[-\d.]+/);
    expect(fallbackUrl).toContain('q=hospital');
  });

  it('ignores results that are not really facilities', async () => {
    stubOutage([
      { name: 'Hospital Road', category: 'highway', type: 'residential', lat: '16.69', lon: '78.91' },
      nrow('Government Hospital', 'hospital', 16.6930, 78.9180),
    ]);
    const r = await lookupFacilities(HERE);
    expect(r.results.map((x) => x.name)).toEqual(['Government Hospital']);
  });

  it('stays "unavailable" when the fallback matches nothing, never "empty"', async () => {
    stubOutage([{ name: 'Hospital Road', category: 'highway', type: 'residential', lat: '16.69', lon: '78.91' }]);
    // One keyword search finding nothing is not evidence of absence, and
    // "none are near you" is the one answer we must never guess at.
    expect((await lookupFacilities(HERE)).status).toBe('unavailable');
  });

  it('reports unavailable when the fallback fails too', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('everything down'); }));
    expect((await lookupFacilities(HERE)).status).toBe('unavailable');
  });

  it('caches the fallback only briefly, so the full directory is retried', async () => {
    vi.useFakeTimers();
    try {
      const calls = [];
      vi.stubGlobal('fetch', vi.fn(async (url) => {
        const u = String(url);
        calls.push(u);
        if (!u.includes('nominatim')) {
          if (calls.some((c) => c.includes('nominatim'))) {
            // Overpass has recovered by the second question.
            return { ok: true, json: async () => ({ elements: [node('Full Directory Hospital', 'hospital', 16.6920, 78.9175)] }) };
          }
          throw new Error('overpass down');
        }
        return { ok: true, json: async () => [nrow('Fallback Hospital', 'hospital', 16.6990, 78.9200)] };
      }));

      expect((await lookupFacilities(HERE)).results[0].name).toBe('Fallback Hospital');
      vi.advanceTimersByTime(16 * 60 * 1000);
      expect((await lookupFacilities(HERE)).results[0].name).toBe('Full Directory Hospital');
    } finally {
      vi.useRealTimers();
    }
  });
});
