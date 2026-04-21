import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X, Sun } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { WHATSAPP_URL } from "@/lib/site";

const NAV_LINKS = [
  { href: "/product", label: "Product" },
  { href: "/clinics", label: "For Clinics" },
  { href: "/pharma", label: "For Pharma" },
  { href: "/about", label: "About" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu when location changes
  useEffect(() => {
    setMobileMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location]);

  return (
    <div className="min-h-[100dvh] flex flex-col selection:bg-primary/20">
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out border-b border-transparent",
          isScrolled ? "bg-background/80 backdrop-blur-md border-border shadow-sm py-3" : "bg-transparent py-5"
        )}
      >
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center transition-transform group-hover:rotate-12">
                <Sun size={18} />
              </div>
              <span className="font-bold text-xl tracking-tight text-foreground">dayli.ai</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8" aria-label="Primary">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    location === link.href ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-4">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                <Button className="rounded-full shadow-md hover:shadow-lg transition-all active:scale-95">
                  Start on WhatsApp
                </Button>
              </a>
            </div>

            {/* Mobile Toggle */}
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

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div
            id="mobile-nav"
            className="md:hidden absolute top-full left-0 right-0 bg-background border-b border-border shadow-lg py-4 px-4 flex flex-col gap-4 animate-in slide-in-from-top-2"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-4 py-3 rounded-md text-base font-medium transition-colors",
                  location === link.href ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="px-4 pt-2 pb-1">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="block w-full">
                <Button className="w-full rounded-full">Start on WhatsApp</Button>
              </a>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 pt-[72px] md:pt-[84px]">
        {children}
      </main>

      <footer className="bg-card border-t border-border py-12 md:py-16 mt-auto">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
                  <Sun size={14} />
                </div>
                <span className="font-bold text-lg tracking-tight">dayli.ai</span>
              </Link>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                A daily decision layer for health in a changing climate.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-foreground">Solutions</h4>
              <ul className="space-y-3">
                <li><Link href="/product" className="text-sm text-muted-foreground hover:text-primary transition-colors">Product</Link></li>
                <li><Link href="/clinics" className="text-sm text-muted-foreground hover:text-primary transition-colors">For Clinics</Link></li>
                <li><Link href="/pharma" className="text-sm text-muted-foreground hover:text-primary transition-colors">For Pharma</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-foreground">Company</h4>
              <ul className="space-y-3">
                <li><Link href="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">About Us</Link></li>
                <li><Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-foreground">Get Started</h4>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-block">
                <Button variant="outline" className="rounded-full w-full justify-start text-primary border-primary/20 hover:bg-primary/5">
                  Connect on WhatsApp
                </Button>
              </a>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} dayli.ai. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground">
              Not a medical device. Always consult a healthcare professional for medical emergencies.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
