/**
 * Sticker registry.
 *
 * Artwork lives in assets/stickers/*.svg and is built to Meta-compliant
 * 512x512 WebP in public/stickers/ by scripts/build-stickers.sh.
 *
 * Delivery is by public link rather than uploaded media id on purpose:
 * media ids returned by the Graph API expire after 30 days, so an id baked
 * into config quietly stops working a month after deploy. The files are
 * already served by this process, so a link has no expiry to manage.
 * (cloudApi.uploadMedia() exists for anyone who does want the id route.)
 *
 * Stickers are decorative only. They are never attached to safety, symptom
 * or emergency replies — a cartoon next to "call 112" is exactly the wrong
 * register — so every call site here is a warm, non-clinical moment.
 *
 * The artwork is deliberately text-free: the bot answers in English, Telugu
 * and Hindi, and a sticker with baked-in English words would be wrong for
 * most of those users.
 */

/** Semantic name → file in public/stickers/. */
const STICKERS = {
  /** Onboarding finished. */
  bloom: 'bloom.webp',
  /** Hydration nudge in a morning brief. */
  hydrate: 'hydrate.webp',
  /** Heat / sun-safety morning brief. */
  suncare: 'suncare.webp',
  /** Warm check-in. */
  care: 'care.webp',
};

/**
 * Public base URL this server is reachable at.
 *
 * Meta fetches sticker links server-to-server, so this must be a public
 * HTTPS origin — localhost will fail with a media download error.
 */
export function stickerBaseUrl() {
  const base = process.env.PUBLIC_BASE_URL || process.env.RENDER_EXTERNAL_URL || '';
  return base.replace(/\/+$/, '');
}

/**
 * Resolve a sticker to a sendable payload.
 *
 * Returns null when the name is unknown or no public URL is configured (local
 * dev, a bare container), so callers can skip the sticker without branching —
 * a missing decoration must never block the message it decorates.
 *
 * @param {keyof STICKERS} name
 * @returns {{ link: string } | null}
 */
export function stickerFor(name) {
  const file = STICKERS[name];
  if (!file) return null;
  const base = stickerBaseUrl();
  if (!base || !/^https:\/\//i.test(base)) return null;
  return { link: `${base}/stickers/${file}` };
}

export { STICKERS };
