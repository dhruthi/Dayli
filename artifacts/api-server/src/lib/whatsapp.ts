/**
 * Thin Meta WhatsApp Cloud API client and shared config / feature-flag.
 *
 * The integration is FEATURE-FLAGGED on `META_WHATSAPP_TOKEN`,
 * `META_WHATSAPP_PHONE_NUMBER_ID`, `META_WHATSAPP_VERIFY_TOKEN`,
 * `META_WHATSAPP_APP_SECRET`, and `META_WHATSAPP_HASH_SALT` all being set.
 * If any are missing the webhook routes return 503 and the rest of the
 * API keeps working unchanged. See docs/whatsapp-setup.md for how a
 * founder fills these in on Meta's side.
 */
import crypto from "crypto";
import { logger } from "./logger";

export interface WhatsappConfig {
  accessToken: string;
  phoneNumberId: string;
  verifyToken: string;
  appSecret: string;
  hashSalt: string;
  /** Onboarding template name approved in Meta Business Manager. Defaults
   * to `dayli_onboarding_v1`. The template body should be the localized
   * "What's your city or pincode?" prompt. */
  onboardingTemplateName: string;
  /** Template language code, e.g. `en`, `en_US`, `hi`. */
  onboardingTemplateLanguage: string;
  /** Pinned Graph API version. */
  graphVersion: string;
}

/**
 * Returns the WhatsApp config if and only if every required secret is
 * present. Returns `null` when the integration is disabled (the website
 * still works; CTAs stay in their disabled "setup in progress" state).
 */
export function loadWhatsappConfig(): WhatsappConfig | null {
  const accessToken = process.env.META_WHATSAPP_TOKEN?.trim();
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID?.trim();
  const verifyToken = process.env.META_WHATSAPP_VERIFY_TOKEN?.trim();
  const appSecret = process.env.META_WHATSAPP_APP_SECRET?.trim();
  const hashSalt = process.env.META_WHATSAPP_HASH_SALT?.trim();

  if (
    !accessToken ||
    !phoneNumberId ||
    !verifyToken ||
    !appSecret ||
    !hashSalt
  ) {
    return null;
  }

  return {
    accessToken,
    phoneNumberId,
    verifyToken,
    appSecret,
    hashSalt,
    onboardingTemplateName:
      process.env.META_WHATSAPP_ONBOARDING_TEMPLATE?.trim() || "dayli_onboarding_v1",
    onboardingTemplateLanguage:
      process.env.META_WHATSAPP_ONBOARDING_LANGUAGE?.trim() || "en",
    graphVersion: process.env.META_WHATSAPP_GRAPH_VERSION?.trim() || "v23.0",
  };
}

/**
 * SHA-256 HMAC of a phone number, hex-encoded. We never store the raw
 * E.164 phone number — only this digest is persisted, so a DB dump or
 * log leak cannot be used to re-identify users. The salt
 * (`META_WHATSAPP_HASH_SALT`) must be set in production and SHOULD NOT
 * be rotated casually because rotating it orphans every existing
 * conversation.
 */
export function hashPhoneNumber(phone: string, salt: string): string {
  return crypto.createHmac("sha256", salt).update(phone).digest("hex");
}

/**
 * Verify the `X-Hub-Signature-256` header that Meta attaches to every
 * webhook POST. The header is `sha256=<hex>` of the raw request body
 * keyed with our `META_WHATSAPP_APP_SECRET`. A missing or mismatched
 * signature MUST cause us to reject the request with 401, otherwise
 * anyone on the internet could POST forged "messages" to our webhook.
 */
export function verifyMetaSignature(
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
  appSecret: string,
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const provided = signatureHeader.slice("sha256=".length);
  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(typeof rawBody === "string" ? rawBody : rawBody)
    .digest("hex");
  if (provided.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(provided, "hex"),
      Buffer.from(expected, "hex"),
    );
  } catch {
    return false;
  }
}

interface SendTextOpts {
  config: WhatsappConfig;
  to: string;
  body: string;
}

interface SendTemplateOpts {
  config: WhatsappConfig;
  to: string;
  templateName: string;
  languageCode: string;
}

/**
 * POST a free-form text message back to a WhatsApp user. The recipient
 * must have messaged us within the past 24h, otherwise Meta will reject
 * the request and require a template instead.
 */
export async function sendWhatsappText(opts: SendTextOpts): Promise<void> {
  const { config, to, body } = opts;
  const url = `https://graph.facebook.com/${config.graphVersion}/${encodeURIComponent(
    config.phoneNumberId,
  )}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body },
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    logger.error(
      { status: response.status, text: text.slice(0, 500) },
      "whatsapp send-text failed",
    );
    throw new Error(`whatsapp send-text failed: ${response.status}`);
  }
}

/**
 * POST an approved template message (used for first-touch onboarding,
 * because outbound-first messages MUST be templates per Meta policy).
 */
export async function sendWhatsappTemplate(opts: SendTemplateOpts): Promise<void> {
  const { config, to, templateName, languageCode } = opts;
  const url = `https://graph.facebook.com/${config.graphVersion}/${encodeURIComponent(
    config.phoneNumberId,
  )}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
      },
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    logger.error(
      { status: response.status, text: text.slice(0, 500) },
      "whatsapp send-template failed",
    );
    throw new Error(`whatsapp send-template failed: ${response.status}`);
  }
}
