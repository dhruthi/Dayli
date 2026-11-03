/**
 * Meta WhatsApp Business Cloud API client.
 *
 * Covers the outbound surface the product actually needs: text, interactive
 * buttons and lists, location requests, templates, media, read receipts and
 * typing indicators — plus the two things that bite in production and were
 * previously unhandled:
 *
 *   1. THE 24-HOUR CUSTOMER SERVICE WINDOW. Free-form messages are only
 *      permitted within 24h of the user's last inbound message. Outside it,
 *      Meta rejects the send (error 131047) and only an approved template gets
 *      through. Callers get a typed refusal instead of a silent failure.
 *
 *   2. META ERROR SEMANTICS. Meta returns 200-with-error and a large set of
 *      codes with very different meanings — retryable rate limits, permanent
 *      template rejections, expired tokens. Treating them all as "failed" hides
 *      outages and burns quota on retries that cannot succeed.
 */

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v21.0';
const SEND_TIMEOUT_MS = parseInt(process.env.META_SEND_TIMEOUT_MS || '10000', 10);

/** Meta error codes that are worth retrying. Everything else is permanent. */
const RETRYABLE_CODES = new Set([
  1,      // unknown/transient API error
  2,      // service temporarily unavailable
  4,      // application request limit reached
  80007,  // rate limit hit
  130429, // cloud API message throughput reached
  131048, // spam rate limit
  131056, // pair rate limit
]);

/** Codes meaning "the 24h window has closed — send a template instead". */
const WINDOW_CLOSED_CODES = new Set([131047, 131051]);

/** Codes meaning the recipient cannot receive messages at all. */
const UNREACHABLE_CODES = new Set([
  131026, // message undeliverable (recipient not on WhatsApp / cannot receive)
  131052, // media download error on recipient side
  470,    // re-engagement message outside allowed window
]);

export class CloudApiClient {
  constructor({ accessToken, phoneNumberId, logger = console }) {
    this.accessToken = accessToken;
    this.phoneNumberId = phoneNumberId;
    this.log = logger;
  }

  get configured() {
    return Boolean(this.accessToken && this.phoneNumberId);
  }

  /** Low-level POST to /{phone-number-id}/messages with error classification. */
  async #post(payload, { label = 'send' } = {}) {
    if (!this.configured) {
      return { ok: false, reason: 'not_configured', retryable: false, error: 'Cloud API credentials are not set.' };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
    const started = Date.now();

    try {
      const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timer);

      const data = await res.json().catch(() => ({}));
      const latencyMs = Date.now() - started;

      if (!res.ok || data.error) {
        const code = data?.error?.code;
        const subcode = data?.error?.error_subcode;
        const reason = WINDOW_CLOSED_CODES.has(code)
          ? 'window_closed'
          : UNREACHABLE_CODES.has(code)
          ? 'unreachable'
          : code === 190
          ? 'auth_expired'
          : 'api_error';

        // Never log data.error.message verbatim — Meta echoes request content,
        // which here is patient text.
        this.log.error(`[wa:${label}] failed status=${res.status} code=${code} subcode=${subcode} reason=${reason} latency=${latencyMs}ms`);

        return {
          ok: false,
          reason,
          code,
          retryable: RETRYABLE_CODES.has(code) || res.status >= 500,
          latencyMs,
        };
      }

      const messageId = data?.messages?.[0]?.id;
      this.log.log(`[wa:${label}] ok id=${messageId || 'n/a'} latency=${latencyMs}ms`);
      return { ok: true, messageId, latencyMs };
    } catch (err) {
      clearTimeout(timer);
      const timedOut = err?.name === 'AbortError';
      this.log.error(`[wa:${label}] ${timedOut ? 'timeout' : 'network error'} after ${Date.now() - started}ms`);
      return { ok: false, reason: timedOut ? 'timeout' : 'network', retryable: true };
    }
  }

  // ── Free-form messages (24h window only) ────────────────────────────────

  /** WhatsApp caps body text at 4096 characters. Split rather than truncate. */
  static splitBody(text, limit = 4000) {
    const body = String(text || '').trim();
    if (body.length <= limit) return [body];
    const chunks = [];
    let rest = body;
    while (rest.length > limit) {
      // Break on a paragraph boundary where possible so a clinical instruction
      // is not severed mid-sentence.
      let cut = rest.lastIndexOf('\n\n', limit);
      if (cut < limit * 0.5) cut = rest.lastIndexOf('\n', limit);
      if (cut < limit * 0.5) cut = rest.lastIndexOf(' ', limit);
      if (cut <= 0) cut = limit;
      chunks.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) chunks.push(rest);
    return chunks;
  }

  async sendText(to, body, { previewUrl = false } = {}) {
    const chunks = CloudApiClient.splitBody(body);
    let last = { ok: true };
    for (const chunk of chunks) {
      last = await this.#post(
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { body: chunk, preview_url: previewUrl },
        },
        { label: 'text' }
      );
      if (!last.ok) return last;
    }
    return last;
  }

  /**
   * Reply buttons. Meta allows at most 3, with 20-char titles.
   * Anything longer is rejected outright, so titles are clamped here.
   */
  async sendButtons(to, { body, buttons, header, footer }) {
    const interactive = {
      type: 'button',
      body: { text: String(body).slice(0, 1024) },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: 'reply',
          reply: { id: String(b.id).slice(0, 256), title: String(b.title).slice(0, 20) },
        })),
      },
    };
    if (header) interactive.header = { type: 'text', text: String(header).slice(0, 60) };
    if (footer) interactive.footer = { text: String(footer).slice(0, 60) };

    return this.#post(
      { messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'interactive', interactive },
      { label: 'buttons' }
    );
  }

  /** List picker. Up to 10 rows across all sections; 24-char row titles. */
  async sendList(to, { body, buttonText, sections, header, footer }) {
    const interactive = {
      type: 'list',
      body: { text: String(body).slice(0, 1024) },
      action: {
        button: String(buttonText || 'Choose').slice(0, 20),
        sections: sections.map((s) => ({
          title: s.title ? String(s.title).slice(0, 24) : undefined,
          rows: s.rows.slice(0, 10).map((r) => ({
            id: String(r.id).slice(0, 200),
            title: String(r.title).slice(0, 24),
            description: r.description ? String(r.description).slice(0, 72) : undefined,
          })),
        })),
      },
    };
    if (header) interactive.header = { type: 'text', text: String(header).slice(0, 60) };
    if (footer) interactive.footer = { text: String(footer).slice(0, 60) };

    return this.#post(
      { messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'interactive', interactive },
      { label: 'list' }
    );
  }

  /** Native "share your location" prompt — better UX than explaining the paperclip. */
  async sendLocationRequest(to, bodyText) {
    return this.#post(
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'location_request_message',
          body: { text: String(bodyText).slice(0, 1024) },
          action: { name: 'send_location' },
        },
      },
      { label: 'location_request' }
    );
  }

  // ── Templates (the only thing permitted outside the 24h window) ─────────

  async sendTemplate(to, { name, languageCode = 'en', components = [] }) {
    return this.#post(
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template: {
          name,
          language: { code: languageCode },
          ...(components.length ? { components } : {}),
        },
      },
      { label: `template:${name}` }
    );
  }

  // ── Receipts and presence ──────────────────────────────────────────────

  /**
   * Mark a message read. Users see the blue ticks, which matters when the
   * pipeline takes a few seconds — otherwise the bot looks unresponsive.
   */
  async markRead(messageId) {
    if (!this.configured || !messageId) return { ok: false, reason: 'not_configured' };
    return this.#post(
      { messaging_product: 'whatsapp', status: 'read', message_id: messageId },
      { label: 'mark_read' }
    );
  }

  /** Typing indicator. Requires a message_id to attach to; best-effort only. */
  async sendTypingIndicator(messageId) {
    if (!this.configured || !messageId) return { ok: false, reason: 'not_configured' };
    return this.#post(
      { messaging_product: 'whatsapp', status: 'read', message_id: messageId, typing_indicator: { type: 'text' } },
      { label: 'typing' }
    );
  }

  // ── Media ──────────────────────────────────────────────────────────────

  /** Resolve a media id to a short-lived download URL (voice notes, photos). */
  async getMediaUrl(mediaId) {
    if (!this.configured) return null;
    try {
      const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.url || null;
    } catch {
      return null;
    }
  }

  /**
   * Upload a local file and return its media id.
   *
   * Note the expiry: media ids from this endpoint are valid for 30 days, so
   * an id captured once and pasted into config will silently stop working a
   * month later. Prefer a public link for artwork that ships with the app
   * (see lib/stickers.js); use this for one-off or user-supplied media.
   *
   * @param {string} filePath - Absolute path to the file.
   * @param {string} mimeType - e.g. 'image/webp' for stickers.
   * @returns {Promise<{ ok: boolean, id?: string, error?: string }>}
   */
  async uploadMedia(filePath, mimeType) {
    if (!this.configured) return { ok: false, error: 'Cloud API credentials are not set.' };
    try {
      const { readFile } = await import('node:fs/promises');
      const { basename } = await import('node:path');
      const bytes = await readFile(filePath);

      const form = new FormData();
      form.append('messaging_product', 'whatsapp');
      form.append('type', mimeType);
      form.append('file', new Blob([bytes], { type: mimeType }), basename(filePath));

      const res = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/${this.phoneNumberId}/media`,
        { method: 'POST', headers: { Authorization: `Bearer ${this.accessToken}` }, body: form }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.id) {
        return { ok: false, error: data?.error?.message || `HTTP ${res.status}` };
      }
      return { ok: true, id: data.id };
    } catch (err) {
      return { ok: false, error: err?.message || String(err) };
    }
  }

  /**
   * Upload an in-memory audio/media buffer and return its media id.
   * Essential for synthesized TTS speech audio before sending back to WhatsApp.
   *
   * @param {Buffer|Uint8Array} buffer - In-memory bytes.
   * @param {string} mimeType - e.g. 'audio/ogg; codecs=opus' or 'audio/wav'.
   * @param {string} filename - Filename for Meta upload form (defaults to 'voice_note.ogg').
   * @returns {Promise<{ ok: boolean, id?: string, error?: string }>}
   */
  async uploadMediaBuffer(buffer, mimeType, filename = 'voice_note.ogg') {
    if (!this.configured) return { ok: false, error: 'Cloud API credentials are not set.' };
    try {
      const form = new FormData();
      form.append('messaging_product', 'whatsapp');
      form.append('type', mimeType);
      form.append('file', new Blob([buffer], { type: mimeType }), filename);

      const res = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/${this.phoneNumberId}/media`,
        { method: 'POST', headers: { Authorization: `Bearer ${this.accessToken}` }, body: form }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.id) {
        return { ok: false, error: data?.error?.message || `HTTP ${res.status}` };
      }
      return { ok: true, id: data.id };
    } catch (err) {
      return { ok: false, error: err?.message || String(err) };
    }
  }

  /**
   * Send a WhatsApp sticker.
   * @param {string} to - Recipient phone number
   * @param {{ id?: string, link?: string }} sticker - Sticker media ID or hosted WebP link
   */
  async sendSticker(to, sticker) {
    const stickerPayload = sticker?.id ? { id: sticker.id } : sticker?.link ? { link: sticker.link } : sticker;
    return this.#post(
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'sticker',
        sticker: stickerPayload,
      },
      { label: 'sticker' }
    );
  }

  /**
   * Send an image with optional caption.
   * @param {string} to - Recipient phone number
   * @param {{ id?: string, link?: string, caption?: string }} image - Image media ID/link and caption
   */
  async sendImage(to, { id, link, caption } = {}) {
    const imagePayload = id ? { id } : link ? { link } : {};
    if (caption) imagePayload.caption = String(caption).slice(0, 1024);
    return this.#post(
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'image',
        image: imagePayload,
      },
      { label: 'image' }
    );
  }

  /**
   * Send an audio file or voice note.
   * @param {string} to - Recipient phone number
   * @param {{ id?: string, link?: string }} audio - Audio media ID or public link
   */
  async sendAudio(to, { id, link } = {}) {
    const audioPayload = id ? { id } : link ? { link } : {};
    return this.#post(
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'audio',
        audio: audioPayload,
      },
      { label: 'audio' }
    );
  }

  /**
   * Download a media file from Meta's Cloud API CDN.
   * Resolves the media ID to a temporary download URL, then downloads the binary.
   *
   * @param {string} mediaId - Meta media asset ID
   * @returns {Promise<{ buffer: Buffer, mimeType: string }>}
   */
  async downloadMedia(mediaId) {
    if (!this.configured) throw new Error('CloudApiClient not configured');

    // Step 1: Query Graph API to get the download URL and MIME type
    const metaRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    );
    if (!metaRes.ok) throw new Error(`Media URL lookup failed: ${metaRes.status}`);
    const { url, mime_type } = await metaRes.json();
    if (!url) throw new Error('No URL in media lookup response');

    // Step 2: Download the actual binary stream
    const dlRes = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!dlRes.ok) throw new Error(`Media download failed: ${dlRes.status}`);

    const arrayBuffer = await dlRes.arrayBuffer();
    return { buffer: Buffer.from(arrayBuffer), mimeType: mime_type || 'audio/ogg' };
  }
}

export { WINDOW_CLOSED_CODES, RETRYABLE_CODES, GRAPH_VERSION };
