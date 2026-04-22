import { useLocation } from "wouter";
import {
  parseLocaleFromPath,
  localizedPath,
  type Locale,
  LOCALES,
  DEFAULT_LOCALE,
} from "@/lib/i18n";
import { TRANSLATIONS } from "@/lib/translations";

/**
 * Returns the active locale and a helper to build locale-aware hrefs that
 * preserve the current language across in-app navigation.
 */
export function useLocale() {
  const [pathname] = useLocation();
  const { locale, basePath } = parseLocaleFromPath(pathname || "/");
  return {
    locale,
    basePath,
    t: TRANSLATIONS[locale],
    href: (target: string) => localizedPath(locale, target),
  };
}

export { LOCALES, DEFAULT_LOCALE };
export type { Locale };
