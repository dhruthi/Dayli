import { Router, type IRouter } from "express";
import { rateLimit, getClientIp } from "../lib/rate-limit";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const geoLimiter = rateLimit({ scope: "geo", max: 30, windowMs: 60 * 60 * 1000 });

interface IpApiResponse {
  status?: string;
  lat?: number;
  lon?: number;
  city?: string;
  country?: string;
  message?: string;
}

router.get("/geo", geoLimiter, async (req, res) => {
  const ip = getClientIp(req);

  // ip-api.com offers free, keyless geolocation. Localhost and private ranges
  // return no result, so for local dev we fall back to a sane default
  // (Hyderabad — the project's pilot city) so the demo is always usable.
  const isLocal =
    ip === "unknown" ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("172.16.") ||
    ip.startsWith("172.17.") ||
    ip.startsWith("172.18.") ||
    ip.startsWith("172.19.") ||
    ip.startsWith("172.2") ||
    ip.startsWith("172.3");

  if (isLocal) {
    res.json({
      lat: 17.385,
      lon: 78.4867,
      city: "Hyderabad",
      country: "India",
      source: "fallback",
    });
    return;
  }

  try {
    const response = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,city,lat,lon`,
      { signal: AbortSignal.timeout(3000) },
    );
    if (!response.ok) {
      throw new Error(`ip-api responded ${response.status}`);
    }
    const data = (await response.json()) as IpApiResponse;
    if (data.status !== "success" || typeof data.lat !== "number" || typeof data.lon !== "number") {
      throw new Error(data.message ?? "no location");
    }
    res.json({
      lat: data.lat,
      lon: data.lon,
      city: data.city ?? null,
      country: data.country ?? null,
      source: "ip",
    });
  } catch (err) {
    logger.warn({ err, ip }, "geo lookup failed, returning fallback");
    res.json({
      lat: 17.385,
      lon: 78.4867,
      city: "Hyderabad",
      country: "India",
      source: "fallback",
    });
  }
});

export default router;
