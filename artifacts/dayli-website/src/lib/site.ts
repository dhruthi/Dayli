export const WHATSAPP_NUMBER: string = "";

const PREFILLED_MESSAGE = encodeURIComponent(
  "Hi dayli, I'd like to start receiving daily climate-aware health guidance."
);

export const WHATSAPP_URL = WHATSAPP_NUMBER
  ? `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, "")}?text=${PREFILLED_MESSAGE}`
  : `https://wa.me/?text=${PREFILLED_MESSAGE}`;

export const CTA_MICROCOPY =
  "Free · No app to download · Onboard in under a minute · Your data stays private.";

export const LEADS_ENDPOINT = (import.meta.env.VITE_LEADS_ENDPOINT as string | undefined) ?? "";

export type LeadType = "clinic" | "pharma";

export interface LeadPayload {
  type: LeadType;
  data: Record<string, FormDataEntryValue>;
  submittedAt: string;
  pageUrl: string;
}

export async function submitLead(type: LeadType, form: HTMLFormElement): Promise<void> {
  const formData = new FormData(form);
  const data: Record<string, FormDataEntryValue> = {};
  formData.forEach((value, key) => {
    data[key] = value;
  });

  const payload: LeadPayload = {
    type,
    data,
    submittedAt: new Date().toISOString(),
    pageUrl: typeof window !== "undefined" ? window.location.href : "",
  };

  if (LEADS_ENDPOINT) {
    const response = await fetch(LEADS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Lead submission failed: ${response.status}`);
    }
    return;
  }

  // Fallback: persist locally so submissions are never silently lost
  // when no endpoint is configured. Replace with a real endpoint via
  // VITE_LEADS_ENDPOINT in production.
  if (typeof window !== "undefined") {
    const key = "dayli.pendingLeads";
    const existing = JSON.parse(window.localStorage.getItem(key) ?? "[]") as LeadPayload[];
    existing.push(payload);
    window.localStorage.setItem(key, JSON.stringify(existing));
    // eslint-disable-next-line no-console
    console.info("[dayli] Lead captured locally (no VITE_LEADS_ENDPOINT configured):", payload);
  }
}
