export const WHATSAPP_NUMBER = "";

const PREFILLED_MESSAGE = encodeURIComponent(
  "Hi dayli, I'd like to start receiving daily climate-aware health guidance."
);

export const WHATSAPP_URL = WHATSAPP_NUMBER
  ? `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, "")}?text=${PREFILLED_MESSAGE}`
  : `https://wa.me/?text=${PREFILLED_MESSAGE}`;

export const CTA_MICROCOPY =
  "Free · No app to download · Onboard in under a minute · Your data stays private.";
