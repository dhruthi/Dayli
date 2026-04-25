import { Router, type IRouter } from "express";
import { fetchConditions } from "../lib/conditions";
import { rateLimit } from "../lib/rate-limit";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const conditionsLimiter = rateLimit({
  scope: "conditions",
  max: 60,
  windowMs: 60 * 60 * 1000,
});

function asString(value: unknown, max = 200): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

router.get("/conditions", conditionsLimiter, async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    res.status(400).json({ error: "invalid_coords", message: "lat and lon are required and must be valid coordinates." });
    return;
  }
  const city = asString(req.query.city);
  const region = asString(req.query.region);
  const country = asString(req.query.country);
  const source = asString(req.query.source) === "client-geolocation"
    ? "client-geolocation"
    : "ip-fallback";
  try {
    const snapshot = await fetchConditions(lat, lon, city, country);
    res.json({ ...snapshot, region, source });
  } catch (err) {
    logger.error({ err, lat, lon }, "conditions lookup failed");
    res.status(502).json({ error: "upstream_error", message: "Could not fetch conditions." });
  }
});

export default router;
