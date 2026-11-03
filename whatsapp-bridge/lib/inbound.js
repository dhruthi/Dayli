/**
 * Inbound webhook normalization.
 *
 * Turns Meta's deeply nested payload into a flat list of events. The previous
 * handler only understood text, button and location, and silently dropped:
 *
 *   • message STATUS callbacks (sent / delivered / read / failed) — which is
 *     the only way to learn that messages are not arriving, that the number's
 *     quality rating is degrading, or that the access token has expired;
 *   • media messages — a large share of real WhatsApp traffic in this user base
 *     is voice notes and photos of a rash or a medicine strip. Dropping them
 *     leaves the user staring at silence;
 *   • list replies, reactions, and referral/click-to-WhatsApp entries.
 *
 * Every branch is defensive: a malformed payload yields an empty event list
 * rather than throwing, because a throw here means Meta retries the delivery.
 */

/**
 * @typedef {Object} InboundEvent
 * @property {'message'|'status'|'error'} kind
 * @property {string} [messageId]
 * @property {string} [from]
 * @property {string} [profileName]
 * @property {number} [timestamp]
 * @property {string} [type]        text | interactive | location | image | audio | ...
 * @property {string} [text]        best-effort textual rendering of the message
 * @property {Object} [location]
 * @property {Object} [media]
 * @property {string} [replyId]     id of the button/list option chosen
 * @property {string} [status]      sent | delivered | read | failed
 * @property {Object} [errorInfo]
 */

/** Text we route through the pipeline when a user sends media we cannot read. */
const MEDIA_PLACEHOLDER = {
  audio: '[voice note]',
  image: '[photo]',
  video: '[video]',
  document: '[document]',
  sticker: '[sticker]',
};

/**
 * @param {any} body raw webhook body
 * @returns {InboundEvent[]}
 */
export function normalizeWebhook(body) {
  const events = [];
  if (!body || body.object !== 'whatsapp_business_account' || !Array.isArray(body.entry)) {
    return events;
  }

  for (const entry of body.entry) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value;
      if (!value) continue;

      const contacts = value.contacts ?? [];
      const profileNameFor = (waId) =>
        contacts.find((c) => c?.wa_id === waId)?.profile?.name ||
        contacts[0]?.profile?.name ||
        '';

      // ── Delivery status callbacks ───────────────────────────────────────
      for (const st of value.statuses ?? []) {
        events.push({
          kind: 'status',
          messageId: st.id,
          from: st.recipient_id,
          status: st.status, // sent | delivered | read | failed
          timestamp: Number(st.timestamp) || undefined,
          errorInfo: st.errors?.[0]
            ? { code: st.errors[0].code, title: st.errors[0].title }
            : undefined,
          conversationCategory: st.conversation?.origin?.type,
          pricingCategory: st.pricing?.category,
        });
      }

      // ── Inbound messages ────────────────────────────────────────────────
      for (const msg of value.messages ?? []) {
        const base = {
          kind: 'message',
          messageId: msg.id,
          from: msg.from,
          profileName: profileNameFor(msg.from),
          timestamp: Number(msg.timestamp) || undefined,
          type: msg.type,
          // Present when the user swipe-replies to one of our messages.
          contextMessageId: msg.context?.id,
        };

        switch (msg.type) {
          case 'text':
            events.push({ ...base, text: msg.text?.body ?? '' });
            break;

          case 'interactive': {
            const i = msg.interactive ?? {};
            if (i.type === 'button_reply') {
              events.push({ ...base, text: i.button_reply?.title ?? '', replyId: i.button_reply?.id });
            } else if (i.type === 'list_reply') {
              events.push({
                ...base,
                text: i.list_reply?.title ?? '',
                replyId: i.list_reply?.id,
                replyDescription: i.list_reply?.description,
              });
            } else if (i.type === 'nfm_reply') {
              // Flow / form submission.
              events.push({ ...base, text: '[form submitted]', formResponse: i.nfm_reply?.response_json });
            } else {
              events.push({ ...base, text: '' });
            }
            break;
          }

          // Template quick-reply buttons arrive as type "button", not "interactive".
          case 'button':
            events.push({ ...base, text: msg.button?.text ?? '', replyId: msg.button?.payload });
            break;

          case 'location':
            events.push({
              ...base,
              text: '[shared location]',
              location: {
                latitude: msg.location?.latitude,
                longitude: msg.location?.longitude,
                name: msg.location?.name,
                address: msg.location?.address,
              },
            });
            break;

          case 'audio':
          case 'image':
          case 'video':
          case 'document':
          case 'sticker': {
            const m = msg[msg.type] ?? {};
            events.push({
              ...base,
              text: m.caption || MEDIA_PLACEHOLDER[msg.type] || '[attachment]',
              media: {
                id: m.id,
                mimeType: m.mime_type,
                // Voice notes set this; a forwarded audio file does not.
                isVoiceNote: msg.type === 'audio' ? Boolean(m.voice) : false,
                caption: m.caption,
                filename: m.filename,
              },
            });
            break;
          }

          case 'reaction':
            events.push({ ...base, text: msg.reaction?.emoji ?? '', reactionTo: msg.reaction?.message_id });
            break;

          case 'contacts':
            events.push({ ...base, text: '[contact card]' });
            break;

          case 'order':
            events.push({ ...base, text: '[order]' });
            break;

          case 'system':
            // e.g. the user changed their phone number.
            events.push({ ...base, text: msg.system?.body ?? '[system]', systemType: msg.system?.type });
            break;

          case 'unsupported':
            events.push({
              ...base,
              text: '[unsupported message type]',
              errorInfo: msg.errors?.[0] ? { code: msg.errors[0].code, title: msg.errors[0].title } : undefined,
            });
            break;

          default:
            events.push({ ...base, text: '[unrecognised message type]' });
        }
      }

      // ── Account-level errors (token expiry, policy violations) ──────────
      for (const err of value.errors ?? []) {
        events.push({ kind: 'error', errorInfo: { code: err.code, title: err.title, details: err.error_data?.details } });
      }
    }
  }

  return events;
}

/**
 * True when the user sent something we cannot actually read the contents of.
 * Answering a voice note as though we understood it would be a fabrication.
 */
export function isUnreadableMedia(event) {
  if (!event?.media) return false;
  // A caption gives us real text to work with; without one we have nothing.
  return !event.media.caption;
}
