import type { Locale } from "./i18n";

export const WHATSAPP_NUMBER: string =
  (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined)?.trim() ?? "";

const PREFILLED_MESSAGE = encodeURIComponent(
  "Hi dayli, I'd like to start receiving daily climate-aware health guidance.",
);

export const WHATSAPP_ENABLED = WHATSAPP_NUMBER.length > 0;

export const WHATSAPP_URL = WHATSAPP_ENABLED
  ? `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, "")}?text=${PREFILLED_MESSAGE}`
  : "";

export const CTA_MICROCOPY =
  "Free · No app to download · Onboard in under a minute · Your data stays private.";

const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") ??
  "/api";

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

export type LeadType = "clinic" | "pharma";

const STRING_FIELDS_BY_TYPE: Record<LeadType, readonly string[]> = {
  clinic: ["name", "role", "clinic", "patients", "city", "email", "message"],
  pharma: ["name", "company", "therapeutic", "email", "message"],
};

function formToPayload(
  type: LeadType,
  form: HTMLFormElement,
  locale: Locale,
): Record<string, string> {
  const formData = new FormData(form);
  const payload: Record<string, string> = {
    locale,
    pageUrl:
      typeof window !== "undefined" ? window.location.href.slice(0, 1024) : "",
  };
  for (const key of STRING_FIELDS_BY_TYPE[type]) {
    const v = formData.get(key);
    if (typeof v === "string" && v.trim().length > 0) {
      payload[key] = v.trim();
    }
  }
  return payload;
}

export async function submitLead(
  type: LeadType,
  form: HTMLFormElement,
  locale: Locale = "en",
): Promise<void> {
  const payload = formToPayload(type, form, locale);
  const response = await fetch(apiUrl(`/leads/${type}`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { error?: string };
      detail = body?.error ? `: ${body.error}` : "";
    } catch {
      // ignore
    }
    throw new Error(`Lead submission failed (${response.status})${detail}`);
  }
}
