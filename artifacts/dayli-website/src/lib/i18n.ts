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
