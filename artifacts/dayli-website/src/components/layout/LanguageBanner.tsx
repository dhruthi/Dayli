import { useEffect, useRef, useState } from "react";
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
  const bannerRef = useRef<HTMLDivElement | null>(null);

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

  // Publish the banner's measured height as a CSS custom property on
  // <html> so the Layout can reserve matching bottom padding on <main>.
  // This keeps page-level CTAs (footer, "Start on WhatsApp", form submit
  // buttons on Clinics/Pharma) reachable even when long translations cause
  // the banner to wrap onto two or three lines on small phones.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    const node = bannerRef.current;
    if (!suggestion || !node) {
      root.style.removeProperty("--lang-banner-h");
      return;
    }
    const apply = () => {
      root.style.setProperty("--lang-banner-h", `${node.offsetHeight}px`);
    };
    apply();
    // ResizeObserver is supported by every browser we target, but guard
    // anyway so older clients still get an initial measurement plus a
    // window-resize fallback rather than throwing during the effect.
    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(apply) : null;
    ro?.observe(node);
    window.addEventListener("resize", apply);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", apply);
      root.style.removeProperty("--lang-banner-h");
    };
  }, [suggestion]);

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
      ref={bannerRef}
      role="region"
      aria-label="Language suggestion"
      lang={meta.htmlLang}
      dir={meta.dir}
      className={cn(
        "fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-background/95 backdrop-blur-md shadow-lg",
        "max-h-[45vh] overflow-y-auto",
        "animate-in slide-in-from-bottom-2",
      )}
      data-testid="language-banner"
    >
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-2 sm:py-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <p className="text-xs sm:text-sm text-foreground flex-1 leading-snug break-words">
            {copy.prompt}
          </p>
          {/* Close affordance lives next to the prompt on mobile so it stays
              reachable even if the action buttons wrap to a second line. */}
          <button
            type="button"
            onClick={dismiss}
            className="sm:hidden shrink-0 p-1 -mt-1 -mr-1 text-muted-foreground hover:text-foreground"
            aria-label={copy.dismiss}
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2 sm:justify-end flex-wrap">
          <button
            type="button"
            onClick={accept}
            className="flex-1 sm:flex-none rounded-full bg-primary text-primary-foreground text-xs sm:text-sm font-medium px-3 sm:px-4 py-1.5 sm:py-2 hover:opacity-90 transition-opacity"
            data-testid="language-banner-accept"
          >
            {copy.accept}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="flex-1 sm:flex-none rounded-full border border-border text-xs sm:text-sm font-medium px-3 sm:px-4 py-1.5 sm:py-2 text-foreground hover:bg-muted transition-colors"
            data-testid="language-banner-dismiss"
          >
            {copy.dismiss}
          </button>
          {/* Desktop-only X — on mobile the X above the prompt covers this. */}
          <button
            type="button"
            onClick={dismiss}
            className="hidden sm:inline-flex p-2 -mr-2 text-muted-foreground hover:text-foreground"
            aria-label={copy.dismiss}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
