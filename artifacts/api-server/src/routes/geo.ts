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

/**
 * Returns true for IPv4/IPv6 loopback or RFC1918 private addresses so we know
 * to skip the public ip-api lookup. RFC1918 ranges:
 *   10.0.0.0/8, 172.16.0.0/12 (172.16.0.0 - 172.31.255.255), 192.168.0.0/16.
 * IPv6 loopback (::1) and IPv6-mapped IPv4 addresses are also handled.
 */
function isLoopbackOrPrivate(ip: string): boolean {
  if (!ip || ip === "unknown") return true;
  if (ip === "::1" || ip === "::") return true;

  // Strip IPv6-mapped IPv4 prefix, e.g. "::ffff:10.0.0.1".
  const v4 = ip.startsWith("::ffff:") ? ip.slice(7) : ip;

  // Must look like a dotted IPv4 quad.
  const parts = v4.split(".");
  if (parts.length !== 4) {
    // IPv6 unique-local fc00::/7 (fc.., fd..) — treat as private.
    return /^f[cd][0-9a-f]{2}:/i.test(ip);
  }
  const octets = parts.map((p) => Number(p));
  if (octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;

  const [a, b] = octets;
  if (a === 127) return true; // loopback
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 169 && b === 254) return true; // link-local 169.254.0.0/16
  return false;
}

router.get("/geo", geoLimiter, async (req, res) => {
  const ip = getClientIp(req);

  // ip-api.com offers free, keyless geolocation. Localhost and private ranges
  // return no result, so for local dev we fall back to a sane default
  // (Hyderabad — the project's pilot city) so the demo is always usable.
  const isLocal = isLoopbackOrPrivate(ip);

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
