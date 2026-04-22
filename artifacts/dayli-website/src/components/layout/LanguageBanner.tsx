import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { X } from "lucide-react";
import {
  DEFAULT_LOCALE,
  LOCALE_META,
  type Locale,
  getStoredLocalePref,
  isLikelyBot,
  localizedPath,
  parseLocaleFromPath,
  pickPreferredLocale,
  setStoredLocalePref,
} from "@/lib/i18n";
import { TRANSLATIONS } from "@/lib/translations";
import { cn } from "@/lib/utils";

/**
 * One-time, dismissible banner that suggests a localized variant of the site
 * to first-time visitors whose browser language preference doesn't match the
 * page they landed on.
 *
 * Behaviour rules (kept in one place for easy auditing):
 *  - Only ever rendered after client hydration — the prerendered HTML stays
 *    identical for crawlers, so no cloaking happens.
 *  - Only suggests when the visitor is currently viewing the English default
 *    AND their browser's top non-English language is one we support.
 *  - Once the visitor accepts, dismisses, or uses the in-page language
 *    switcher, the choice is persisted to localStorage and the banner never
 *    appears again on this device.
 *  - Skipped entirely for likely bots / crawlers / link unfurlers so we don't
 *    pollute their snapshots with banner copy.
 */
export function LanguageBanner() {
  const [location, navigate] = useLocation();
  const [suggestion, setSuggestion] = useState<Locale | null>(null);

  // Re-evaluate on every route change so that:
  //  - if the visitor switches language via the header menu mid-session, the
  //    banner (which may still be on screen) hides immediately
  //  - if they navigate from / to /hi (or vice versa), suggestion state stays
  //    in sync with the page they're actually viewing
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isLikelyBot(window.navigator.userAgent)) {
      setSuggestion(null);
      return;
    }
    if (getStoredLocalePref()) {
      setSuggestion(null);
      return;
    }

    const { locale: currentLocale } = parseLocaleFromPath(
      window.location.pathname || "/",
    );
    if (currentLocale !== DEFAULT_LOCALE) {
      // The visitor is already on a localized variant — record that as their
      // preference so we don't second-guess them later, and don't show the
      // banner.
      setStoredLocalePref(currentLocale);
      setSuggestion(null);
      return;
    }

    const nav = window.navigator;
    // navigator.languages is an empty array in some older browsers; fall back
    // to the single navigator.language tag in that case.
    const tags =
      nav.languages && nav.languages.length > 0
        ? nav.languages
        : nav.language
          ? [nav.language]
          : [];
    const preferred = pickPreferredLocale(tags);
    setSuggestion(preferred);
  }, [location]);

  if (!suggestion) return null;

  const meta = LOCALE_META[suggestion];
  const copy = TRANSLATIONS[suggestion].layout.languageBanner;

  function accept() {
    if (!suggestion) return;
    setStoredLocalePref(suggestion);
    const { basePath } = parseLocaleFromPath(location || "/");
    navigate(localizedPath(suggestion, basePath));
    setSuggestion(null);
  }

  function dismiss() {
    setStoredLocalePref("dismissed");
    setSuggestion(null);
  }

  return (
    <div
      role="region"
      aria-label="Language suggestion"
      lang={meta.htmlLang}
      dir={meta.dir}
      className={cn(
        "fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-background/95 backdrop-blur-md shadow-lg",
        "animate-in slide-in-from-bottom-2",
      )}
      data-testid="language-banner"
    >
      <div className="container mx-auto px-4 md:px-6 py-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <p className="text-sm text-foreground flex-1">{copy.prompt}</p>
        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={accept}
            className="rounded-full bg-primary text-primary-foreground text-sm font-medium px-4 py-2 hover:opacity-90 transition-opacity"
            data-testid="language-banner-accept"
          >
            {copy.accept}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-full border border-border text-sm font-medium px-4 py-2 text-foreground hover:bg-muted transition-colors"
            data-testid="language-banner-dismiss"
          >
            {copy.dismiss}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="p-2 -mr-2 text-muted-foreground hover:text-foreground"
            aria-label={copy.dismiss}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
