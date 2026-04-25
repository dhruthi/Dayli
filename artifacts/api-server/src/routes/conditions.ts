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

router.get("/conditions", conditionsLimiter, async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    res.status(400).json({ error: "invalid_coords", message: "lat and lon are required and must be valid coordinates." });
    return;
  }
  try {
    const snapshot = await fetchConditions(lat, lon);
    res.json(snapshot);
  } catch (err) {
    logger.error({ err, lat, lon }, "conditions lookup failed");
    res.status(502).json({ error: "upstream_error", message: "Could not fetch conditions." });
  }
});

export default router;
