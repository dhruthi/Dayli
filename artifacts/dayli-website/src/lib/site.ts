import type { Locale } from "./i18n";

const PREFILLED_MESSAGE = encodeURIComponent(
  "Hi dayli, I'd like to start receiving daily climate-aware health guidance.",
);

/**
 * Build-time fallback for the WhatsApp number. Kept so that local dev
 * setups without the api-server reachable can still render the wa.me
 * link, but it is NEVER used to decide whether the CTA is enabled —
 * the CTA's enabled state is driven by the api-server's runtime
 * `/whatsapp/status` endpoint so we cannot accidentally show users a
 * working CTA while the backend is feature-flag-disabled (and the
 * webhook would 503).
 */
const BUILD_TIME_NUMBER: string =
  (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined)?.trim() ?? "";

export type WhatsappStatus = {
  enabled: boolean;
  number: string;
  url: string;
};

export function buildWhatsappUrl(number: string): string {
  const digits = number.replace(/\D/g, "");
  if (digits.length === 0) return "";
  return `https://wa.me/${digits}?text=${PREFILLED_MESSAGE}`;
}

/**
 * Initial CTA state used during the very first render before the
 * status fetch completes. We default to DISABLED so users never see a
 * working CTA that would silently fail; once the status endpoint
 * resolves the hook flips it on if (and only if) the backend is
 * actually wired up.
 */
export const INITIAL_WHATSAPP_STATUS: WhatsappStatus = {
  enabled: false,
  number: BUILD_TIME_NUMBER,
  url: buildWhatsappUrl(BUILD_TIME_NUMBER),
};

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
