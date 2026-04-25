import { Router, type IRouter } from "express";
import { db, clinicLeadsTable, pharmaLeadsTable } from "@workspace/db";
import {
  SubmitClinicLeadBody as ClinicLeadBodySchema,
  SubmitPharmaLeadBody as PharmaLeadBodySchema,
} from "@workspace/api-zod";
import { rateLimit, getClientIp } from "../lib/rate-limit";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// 5 lead submissions per IP per 10 minutes — generous enough for retries,
// stingy enough to discourage drive-by spam.
const leadLimiter = rateLimit({ scope: "leads", max: 5, windowMs: 10 * 60 * 1000 });

router.post("/leads/clinic", leadLimiter, async (req, res) => {
  const parsed = ClinicLeadBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "invalid_body",
      message: parsed.error.issues[0]?.message ?? "Invalid request body.",
    });
    return;
  }

  const { name, role, clinic, patients, city, email, message, locale, pageUrl } = parsed.data;

  try {
    const [row] = await db
      .insert(clinicLeadsTable)
      .values({
        name,
        role,
        clinic,
        patients: patients ?? null,
        city: city ?? null,
        email,
        message: message ?? null,
        locale: locale ?? null,
        pageUrl: pageUrl ?? null,
        userAgent: req.get("user-agent") ?? null,
        ipAddress: getClientIp(req),
      })
      .returning({ id: clinicLeadsTable.id });

    logger.info({ leadId: row.id, type: "clinic", clinic, locale }, "clinic lead captured");
    res.status(201).json({ ok: true, id: row.id });
  } catch (err) {
    logger.error({ err }, "clinic lead insert failed");
    res.status(500).json({ error: "server_error", message: "Could not save lead." });
  }
});

router.post("/leads/pharma", leadLimiter, async (req, res) => {
  const parsed = PharmaLeadBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "invalid_body",
      message: parsed.error.issues[0]?.message ?? "Invalid request body.",
    });
    return;
  }

  const { name, company, therapeutic, email, message, locale, pageUrl } = parsed.data;

  try {
    const [row] = await db
      .insert(pharmaLeadsTable)
      .values({
        name,
        company,
        therapeutic: therapeutic ?? null,
        email,
        message: message ?? null,
        locale: locale ?? null,
        pageUrl: pageUrl ?? null,
        userAgent: req.get("user-agent") ?? null,
        ipAddress: getClientIp(req),
      })
      .returning({ id: pharmaLeadsTable.id });

    logger.info({ leadId: row.id, type: "pharma", company, locale }, "pharma lead captured");
    res.status(201).json({ ok: true, id: row.id });
  } catch (err) {
    logger.error({ err }, "pharma lead insert failed");
    res.status(500).json({ error: "server_error", message: "Could not save lead." });
  }
});

export default router;
