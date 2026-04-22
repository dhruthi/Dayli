import { AnimatedReveal } from "@/components/ui/animated-reveal";
import { ShieldCheck } from "lucide-react";
import { SEO } from "@/components/SEO";
import { getPageSeo } from "@/lib/seo";
import { useLocale } from "@/hooks/use-locale";

export default function Privacy() {
  const { locale, t } = useLocale();
  const c = t.privacy;
  return (
    <div className="flex flex-col min-h-screen">
      <SEO seo={getPageSeo("privacy", locale)} />
      <section className="pt-20 pb-16 bg-gradient-to-b from-primary/5 to-background border-b border-border">
        <div className="container px-4 md:px-6 mx-auto max-w-3xl">
          <AnimatedReveal>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <ShieldCheck size={16} />
              <span>{c.badge}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">{c.h1}</h1>
            <p className="text-lg text-muted-foreground">{c.intro}</p>
          </AnimatedReveal>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="container px-4 md:px-6 mx-auto max-w-3xl space-y-10">
          {c.sections.map((s) => (
            <AnimatedReveal key={s.heading}>
              <h2 className="text-2xl font-serif font-bold mb-3">{s.heading}</h2>
              {s.body && (
                <p className="text-muted-foreground leading-relaxed">{s.body}</p>
              )}
              {s.bullets && (
                <ul className="space-y-3 text-muted-foreground leading-relaxed list-disc pl-5">
                  {s.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
            </AnimatedReveal>
          ))}

          <AnimatedReveal>
            <p className="text-sm text-muted-foreground italic">{c.note}</p>
          </AnimatedReveal>
        </div>
      </section>
    </div>
  );
}
