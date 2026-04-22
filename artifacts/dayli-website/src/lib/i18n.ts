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
