export const LOCALES = ["en", "hi", "te", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export interface LocaleMeta {
  code: Locale;
  htmlLang: string;
  hreflang: string;
  label: string;
  nativeLabel: string;
  dir: "ltr" | "rtl";
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: {
    code: "en",
    htmlLang: "en",
    hreflang: "en",
    label: "English",
    nativeLabel: "English",
    dir: "ltr",
  },
  hi: {
    code: "hi",
    htmlLang: "hi",
    hreflang: "hi-IN",
    label: "Hindi",
    nativeLabel: "हिंदी",
    dir: "ltr",
  },
  te: {
    code: "te",
    htmlLang: "te",
    hreflang: "te-IN",
    label: "Telugu",
    nativeLabel: "తెలుగు",
    dir: "ltr",
  },
  ar: {
    code: "ar",
    htmlLang: "ar",
    hreflang: "ar",
    label: "Arabic",
    nativeLabel: "العربية",
    dir: "rtl",
  },
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/**
 * Given an absolute pathname like `/hi/product`, return the locale and the
 * canonical (English) base path: `{ locale: "hi", basePath: "/product" }`.
 * For `/`, returns `{ locale: "en", basePath: "/" }`.
 */
export function parseLocaleFromPath(pathname: string): {
  locale: Locale;
  basePath: string;
} {
  const clean = pathname.replace(/\/+$/g, "") || "/";
  const segments = clean.split("/").filter(Boolean);
  if (segments.length > 0 && isLocale(segments[0])) {
    const locale = segments[0] as Locale;
    const rest = "/" + segments.slice(1).join("/");
    return { locale, basePath: rest === "/" ? "/" : rest };
  }
  return { locale: DEFAULT_LOCALE, basePath: clean === "" ? "/" : clean };
}

/**
 * Build a path for a given locale + canonical base path.
 * en stays at the root; non-en is prefixed with the locale segment.
 */
export function localizedPath(locale: Locale, basePath: string): string {
  const base = basePath.startsWith("/") ? basePath : `/${basePath}`;
  if (locale === DEFAULT_LOCALE) {
    return base;
  }
  if (base === "/") return `/${locale}`;
  return `/${locale}${base}`;
}

/**
 * Persistent storage key for the visitor's language preference. The stored
 * value is either a Locale code or the sentinel "dismissed" — once set, the
 * auto-detect banner will not be shown again.
 */
export const LOCALE_PREF_STORAGE_KEY = "dayli:locale-pref";

/**
 * Cookie name mirrored to the server. The production HTTP server
 * (server/serve.mjs) reads this cookie to decide whether a first-time
 * visitor on a canonical English URL should be 302-redirected to a localized
 * variant based on their Accept-Language header. Once the cookie is
 * present (any value), the server stops auto-redirecting — that's how an
 * explicit choice from the in-page switcher overrides the server hint.
 *
 * Cookie names cannot contain ":" so we use an underscore variant; the
 * localStorage key keeps the original ":" form for backward compatibility.
 */
export const LOCALE_PREF_COOKIE = "dayli_locale_pref";

export function getStoredLocalePref(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LOCALE_PREF_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredLocalePref(value: Locale | "dismissed"): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCALE_PREF_STORAGE_KEY, value);
  } catch {
    /* ignore quota/private mode errors */
  }
  // Mirror to a cookie so the server-side language hint respects the
  // visitor's explicit choice on every subsequent navigation. 1-year expiry
  // matches the "remember forever" semantics of the localStorage entry.
  try {
    if (typeof document === "undefined") return;
    const oneYear = 60 * 60 * 24 * 365;
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie =
      `${LOCALE_PREF_COOKIE}=${encodeURIComponent(value)}` +
      `; Path=/; Max-Age=${oneYear}; SameSite=Lax${secure}`;
  } catch {
    /* ignore — cookies blocked is not fatal */
  }
}

/**
 * Inspect a list of BCP-47 language tags (typically `navigator.languages`)
 * and return the first supported non-default locale, or null if the visitor's
 * top preference is already English / no supported match exists.
 *
 * We deliberately stop at the first English entry — a visitor whose top
 * preference is English should not be redirected, even if they also list
 * Hindi further down.
 */
export function pickPreferredLocale(
  languages: readonly string[] | undefined,
): Locale | null {
  if (!languages || languages.length === 0) return null;
  for (const tag of languages) {
    if (!tag) continue;
    const primary = tag.toLowerCase().split("-")[0];
    if (primary === DEFAULT_LOCALE) return null;
    if (isLocale(primary)) return primary as Locale;
  }
  return null;
}

const BOT_UA_RE =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|preview|outbrain|pinterest|whatsapp|telegram|lighthouse|headlesschrome|prerender/i;

export function isLikelyBot(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  return BOT_UA_RE.test(userAgent);
}
