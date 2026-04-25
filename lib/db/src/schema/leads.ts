import { pgTable, serial, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const clinicLeadsTable = pgTable("clinic_leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  clinic: text("clinic").notNull(),
  patients: text("patients"),
  city: text("city"),
  email: text("email").notNull(),
  message: text("message"),
  locale: text("locale"),
  pageUrl: text("page_url"),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertClinicLeadSchema = createInsertSchema(clinicLeadsTable).omit({
  id: true,
  createdAt: true,
  pageUrl: true,
  userAgent: true,
  ipAddress: true,
  locale: true,
});
export type InsertClinicLead = z.infer<typeof insertClinicLeadSchema>;
export type ClinicLead = typeof clinicLeadsTable.$inferSelect;

export const pharmaLeadsTable = pgTable("pharma_leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  company: text("company").notNull(),
  therapeutic: text("therapeutic"),
  email: text("email").notNull(),
  message: text("message"),
  locale: text("locale"),
  pageUrl: text("page_url"),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPharmaLeadSchema = createInsertSchema(pharmaLeadsTable).omit({
  id: true,
  createdAt: true,
  pageUrl: true,
  userAgent: true,
  ipAddress: true,
  locale: true,
});
export type InsertPharmaLead = z.infer<typeof insertPharmaLeadSchema>;
export type PharmaLead = typeof pharmaLeadsTable.$inferSelect;

export const chatTurnsTable = pgTable("chat_turns", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  ipAddress: text("ip_address"),
  locale: text("locale"),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  conditions: jsonb("conditions"),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
