import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, clinicLeadsTable, pharmaLeadsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { logger } from "../lib/logger";
import { rateLimit } from "../lib/rate-limit";

const router: IRouter = Router();

const adminLimiter = rateLimit({ scope: "admin", max: 60, windowMs: 60 * 60 * 1000 });

function basicAuth(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.LEADS_ADMIN_PASSWORD;
  if (!expected) {
    res.status(503).json({
      error: "not_configured",
      message: "Admin auth is not configured. Set LEADS_ADMIN_PASSWORD.",
    });
    return;
  }

  const header = req.headers.authorization ?? "";
  if (!header.toLowerCase().startsWith("basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="dayli admin"');
    res.status(401).json({ error: "unauthorized", message: "Authentication required." });
    return;
  }
  let user = "";
  let pass = "";
  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf-8");
    const idx = decoded.indexOf(":");
    user = decoded.slice(0, idx);
    pass = decoded.slice(idx + 1);
  } catch {
    res.status(401).json({ error: "unauthorized", message: "Invalid credentials." });
    return;
  }

  if (pass !== expected) {
    res.setHeader("WWW-Authenticate", 'Basic realm="dayli admin"');
    res.status(401).json({ error: "unauthorized", message: "Invalid credentials." });
    return;
  }
  // Username is currently ignored — any value works.
  void user;
  next();
}

router.get("/admin/leads", adminLimiter, basicAuth, async (_req, res) => {
  try {
    const [clinics, pharmas] = await Promise.all([
      db.select().from(clinicLeadsTable).orderBy(desc(clinicLeadsTable.createdAt)).limit(500),
      db.select().from(pharmaLeadsTable).orderBy(desc(pharmaLeadsTable.createdAt)).limit(500),
    ]);

    res.json({
      clinic: clinics.map((row) => ({
        id: String(row.id),
        name: row.name,
        role: row.role,
        clinic: row.clinic,
        patients: row.patients,
        city: row.city,
        email: row.email,
        message: row.message,
        locale: row.locale,
        pageUrl: row.pageUrl,
        createdAt: row.createdAt.toISOString(),
      })),
      pharma: pharmas.map((row) => ({
        id: String(row.id),
        name: row.name,
        company: row.company,
        therapeutic: row.therapeutic,
        email: row.email,
        message: row.message,
        locale: row.locale,
        pageUrl: row.pageUrl,
        createdAt: row.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    logger.error({ err }, "admin leads query failed");
    res.status(500).json({ error: "server_error", message: "Could not load leads." });
  }
});

export default router;
