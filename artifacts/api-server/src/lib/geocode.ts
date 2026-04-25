/**
 * Free-text → lat/lon geocoding for the WhatsApp onboarding flow. We use
 * Open-Meteo's geocoding endpoint because it is keyless, supports HTTPS
 * on the free tier, and already powers the conditions snapshot the rest
 * of dayli relies on. Accepts a city name OR a numeric pincode.
 */
import { logger } from "./logger";

interface GeocodeResult {
  lat: number;
  lon: number;
  city: string | null;
  country: string | null;
}

interface OpenMeteoGeocodingResponse {
  results?: Array<{
    name?: string;
    latitude?: number;
    longitude?: number;
    country?: string;
    admin1?: string;
    postcodes?: string[];
  }>;
}

/**
 * Returns the best-match location for a free-text query, or `null` if
 * no result. The query may be a city name ("Hyderabad"), a pincode
 * ("500032"), or "City, Country" — Open-Meteo handles all three.
 */
export async function geocodePlace(
  query: string,
  fallbackCountry?: string,
): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (trimmed.length === 0 || trimmed.length > 100) return null;

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", trimmed);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  if (fallbackCountry) url.searchParams.set("countryCode", fallbackCountry);

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) {
      logger.warn({ status: res.status, query }, "geocode HTTP failure");
      return null;
    }
    const data = (await res.json()) as OpenMeteoGeocodingResponse;
    const hit = data.results?.[0];
    if (!hit || typeof hit.latitude !== "number" || typeof hit.longitude !== "number") {
      return null;
    }
    return {
      lat: hit.latitude,
      lon: hit.longitude,
      city: hit.name ?? null,
      country: hit.country ?? null,
    };
  } catch (err) {
    logger.warn({ err, query }, "geocode threw");
    return null;
  }
}
