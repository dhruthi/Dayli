import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X, Sun, Globe } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { WhatsAppCTA } from "@/components/ui/whatsapp-cta";
import { WHATSAPP_ENABLED } from "@/lib/site";
import { useLocale } from "@/hooks/use-locale";
import { LOCALES, LOCALE_META, localizedPath, parseLocaleFromPath, setStoredLocalePref } from "@/lib/i18n";
import { LanguageBanner } from "@/components/layout/LanguageBanner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { locale, basePath, t, href } = useLocale();
  const meta = LOCALE_META[locale];
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const NAV_LINKS = [
    { basePath: "/product", label: t.layout.nav.product },
    { basePath: "/clinics", label: t.layout.nav.clinics },
    { basePath: "/pharma", label: t.layout.nav.pharma },
    { basePath: "/about", label: t.layout.nav.about },
  ];

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location]);

  // Keep <html lang/dir> in sync as a safety net (SEO component does this too,
  // but Layout runs even on routes without an explicit SEO config).
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = meta.htmlLang;
      document.documentElement.dir = meta.dir;
    }
  }, [meta.htmlLang, meta.dir]);

  function isActive(linkBase: string) {
    return basePath === linkBase;
  }

  function switchLocale(targetLocale: typeof locale) {
    const { basePath: currentBase } = parseLocaleFromPath(location || "/");
    // Record the explicit choice so the auto-detect banner doesn't second-
    // guess them on a future visit.
    setStoredLocalePref(targetLocale);
    navigate(localizedPath(targetLocale, currentBase));
  }

  return (
    <div
      className="min-h-[100dvh] flex flex-col selection:bg-primary/20"
      dir={meta.dir}
      // Reserve space at the very bottom of the page when the language
      // suggestion banner is visible, so the footer and any in-page CTAs
      // (e.g. clinic/pharma form submit buttons) aren't obscured by the
      // fixed banner — particularly important on narrow phones where long
      // translations cause the banner to wrap to multiple lines.
      style={{ paddingBottom: "var(--lang-banner-h, 0px)" }}
    >
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out border-b border-transparent",
          isScrolled ? "bg-background/80 backdrop-blur-md border-border shadow-sm py-3" : "bg-transparent py-5"
        )}
      >
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between">
            <Link href={href("/")} className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center transition-transform group-hover:rotate-12">
                <Sun size={18} />
              </div>
              <span className="font-bold text-xl tracking-tight text-foreground">dayli.ai</span>
            </Link>

            <nav className="hidden md:flex items-center gap-8" aria-label="Primary">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.basePath}
                  href={href(link.basePath)}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    isActive(link.basePath) ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-muted-foreground hover:text-foreground"
                    aria-label={t.layout.languageMenuLabel}
                  >
                    <Globe size={16} />
                    <span>{meta.nativeLabel}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{t.layout.languageMenuLabel}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {LOCALES.map((l) => (
                    <DropdownMenuItem
                      key={l}
                      onSelect={() => switchLocale(l)}
                      className={cn("cursor-pointer", l === locale && "font-semibold text-primary")}
                    >
                      {LOCALE_META[l].nativeLabel}
                      <span className="ml-2 text-xs text-muted-foreground">{LOCALE_META[l].label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <WhatsAppCTA
                label={t.layout.ctaWhatsapp}
                className="rounded-full shadow-md hover:shadow-lg transition-all active:scale-95"
              />
            </div>

            <button
              type="button"
              className="md:hidden p-2 -mr-2 text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav"
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div
            id="mobile-nav"
            className="md:hidden absolute top-full left-0 right-0 bg-background border-b border-border shadow-lg py-4 px-4 flex flex-col gap-4 animate-in slide-in-from-top-2"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.basePath}
                href={href(link.basePath)}
                className={cn(
                  "px-4 py-3 rounded-md text-base font-medium transition-colors",
                  isActive(link.basePath) ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="px-4 pt-2 border-t border-border">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                {t.layout.languageMenuLabel}
              </p>
              <div className="flex flex-wrap gap-2">
                {LOCALES.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => switchLocale(l)}
                    className={cn(
                      "text-sm px-3 py-1.5 rounded-full border transition-colors",
                      l === locale
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border text-foreground hover:bg-muted",
                    )}
                  >
                    {LOCALE_META[l].nativeLabel}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-4 pt-2 pb-1">
              <WhatsAppCTA
                label={t.layout.ctaWhatsapp}
                block
                className="rounded-full"
              />
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 pt-[72px] md:pt-[84px]">{children}</main>

      <LanguageBanner />

      <footer className="bg-card border-t border-border py-12 md:py-16 mt-auto">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="md:col-span-1">
              <Link href={href("/")} className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
                  <Sun size={14} />
                </div>
                <span className="font-bold text-lg tracking-tight">dayli.ai</span>
              </Link>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                {t.layout.footer.tagline}
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-foreground">{t.layout.footer.solutions}</h4>
              <ul className="space-y-3">
                <li><Link href={href("/product")} className="text-sm text-muted-foreground hover:text-primary transition-colors">{t.layout.footer.product}</Link></li>
                <li><Link href={href("/clinics")} className="text-sm text-muted-foreground hover:text-primary transition-colors">{t.layout.footer.clinics}</Link></li>
                <li><Link href={href("/pharma")} className="text-sm text-muted-foreground hover:text-primary transition-colors">{t.layout.footer.pharma}</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-foreground">{t.layout.footer.company}</h4>
              <ul className="space-y-3">
                <li><Link href={href("/about")} className="text-sm text-muted-foreground hover:text-primary transition-colors">{t.layout.footer.about}</Link></li>
                <li><Link href={href("/privacy")} className="text-sm text-muted-foreground hover:text-primary transition-colors">{t.layout.footer.privacy}</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-foreground">{t.layout.footer.getStarted}</h4>
              <WhatsAppCTA
                label={t.layout.footer.connect}
                block
                variant="outline"
                className="rounded-full justify-start text-primary border-primary/20 hover:bg-primary/5"
              />
              {!WHATSAPP_ENABLED && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t.layout.whatsappPending}
                </p>
              )}
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {t.layout.footer.copyright(new Date().getFullYear())}
            </p>
            <p className="text-xs text-muted-foreground">
              {t.layout.footer.disclaimer}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
