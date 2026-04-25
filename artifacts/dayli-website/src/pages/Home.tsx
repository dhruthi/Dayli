import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowRight, ThermometerSun, ShieldCheck, HeartPulse, CheckCircle2, Clock, Globe, Droplets, MapPin, Info } from "lucide-react";
import { AnimatedReveal, StaggeredList } from "@/components/ui/animated-reveal";
import { WhatsAppChatPreview } from "@/components/ui/whatsapp-chat";
import { WhatsAppCTA } from "@/components/ui/whatsapp-cta";
import { ChatDemo } from "@/components/chat/ChatDemo";
import heroImage from "@/assets/images/hero.png";
import { SEO } from "@/components/SEO";
import { FAQSection } from "@/components/FAQSection";
import { getPageSeo } from "@/lib/seo";
import { useLocale } from "@/hooks/use-locale";

export default function Home() {
  const { locale, t, href } = useLocale();
  const c = t.home;
  const featureIcons = [ThermometerSun, ShieldCheck, Clock, HeartPulse];
  return (
    <div className="flex flex-col min-h-screen">
      <SEO seo={getPageSeo("home", locale)} />
      {/* HERO SECTION */}
      <section className="relative pt-20 pb-32 overflow-hidden bg-gradient-to-b from-sun/10 to-background">
        <div className="container px-4 md:px-6 mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <AnimatedReveal direction="up" className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <ShieldCheck size={16} />
                <span>{c.badge}</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground leading-tight mb-6">
                {c.h1}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-4 leading-relaxed">{c.p1}</p>
              <p className="text-base text-foreground/70 mb-8 leading-relaxed">{c.p2}</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <WhatsAppCTA
                  label={c.ctaPrimary}
                  size="lg"
                  className="w-full sm:w-auto text-base h-12 px-8 rounded-full shadow-lg hover:shadow-xl transition-all"
                />
                <Link href={href("/clinics")}>
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-base h-12 px-8 rounded-full border-primary/20 text-primary hover:bg-primary/5">
                    {c.ctaSecondary}
                  </Button>
                </Link>
              </div>
              <p className="mt-4 text-sm text-foreground/60">{t.ctaMicrocopy}</p>
              <div className="mt-6 text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle2 size={16} className="text-primary" />
                <span>{c.tagline}</span>
              </div>
            </AnimatedReveal>

            <AnimatedReveal direction="left" delay={200} className="relative">
              <div className="max-w-md mx-auto lg:max-w-none">
                <ChatDemo />
              </div>
            </AnimatedReveal>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="py-10 bg-card border-y border-border">
        <div className="container px-4 md:px-6 mx-auto">
          <p className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-6">
            {c.trust.label}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm font-medium text-muted-foreground">
            {c.trust.items.map((item, i) => (
              <span key={i} className="flex items-center gap-x-10">
                {i > 0 && <span className="hidden md:inline">·</span>}
                <span>{item}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* DEFINITION */}
      <section aria-labelledby="what-is-dayli" className="py-16 bg-background border-b border-border">
        <div className="container px-4 md:px-6 mx-auto max-w-3xl">
          <h2 id="what-is-dayli" className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-4">
            {c.definition.heading}
          </h2>
          <p className="text-lg text-foreground/80 leading-relaxed">
            <strong>{c.definition.bodyStrong}</strong>{c.definition.body}
          </p>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="py-24 bg-background">
        <div className="container px-4 md:px-6 mx-auto">
          <AnimatedReveal className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-sm uppercase tracking-widest text-heat font-semibold">{c.problem.eyebrow}</span>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mt-4 mb-6">
              {c.problem.heading}
            </h2>
            <p className="text-lg text-muted-foreground">{c.problem.intro}</p>
          </AnimatedReveal>

          <div className="max-w-3xl mx-auto">
            <AnimatedReveal delay={100} direction="up">
              <Card className="bg-card border-none shadow-md">
                <CardContent className="p-8">
                  <div className="w-12 h-12 rounded-xl bg-heat/10 text-heat flex items-center justify-center mb-6">
                    <ThermometerSun size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-4">{c.problem.cardHeading}</h3>
                  <ul className="grid sm:grid-cols-2 gap-3 mb-6">
                    <li className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-heat"></div>
                      <span className="font-medium text-foreground">{c.problem.bullet1}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-heat"></div>
                      <span className="font-medium text-foreground">{c.problem.bullet2}</span>
                    </li>
                  </ul>
                  <p className="text-muted-foreground">{c.problem.cardBody}</p>
                </CardContent>
              </Card>
            </AnimatedReveal>
          </div>
        </div>
      </section>

      {/* SOLUTION */}
      <section className="py-24 bg-card">
        <div className="container px-4 md:px-6 mx-auto">
          <AnimatedReveal className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-sm uppercase tracking-widest text-primary font-semibold">{c.solution.eyebrow}</span>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mt-4 mb-6">
              {c.solution.heading}
            </h2>
            <p className="text-lg text-muted-foreground">{c.solution.intro}</p>
          </AnimatedReveal>

          <div className="max-w-4xl mx-auto">
            <AnimatedReveal delay={100}>
              <Card className="bg-primary text-primary-foreground border-none shadow-xl">
                <CardContent className="p-8 md:p-10">
                  <HeartPulse size={48} className="mb-6 opacity-80" />
                  <ul className="grid md:grid-cols-3 gap-6 text-base">
                    {c.solution.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-3">
                        <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </AnimatedReveal>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 bg-background">
        <div className="container px-4 md:px-6 mx-auto">
          <AnimatedReveal className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">{c.how.heading}</h2>
            <p className="text-lg text-muted-foreground">{c.how.intro}</p>
          </AnimatedReveal>

          <div className="relative max-w-5xl mx-auto">
            <div className="hidden md:block absolute top-8 left-[16.66%] right-[16.66%] h-[2px] bg-border z-0"></div>
            <StaggeredList className="relative grid md:grid-cols-3 gap-8 z-10">
              {c.how.steps.map((step, i) => (
                <div key={step.title} className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-md">{i + 1}</div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground text-sm">{step.body}</p>
                </div>
              ))}
            </StaggeredList>
          </div>
        </div>
      </section>

      {/* USE CASE */}
      <section className="py-24 bg-sun/10 relative overflow-hidden">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <AnimatedReveal>
              <div className="bg-white rounded-3xl p-8 md:p-10 shadow-xl border border-sun/20">
                <div className="flex items-center gap-3 text-heat mb-6">
                  <MapPin size={24} />
                  <span className="font-semibold text-lg uppercase tracking-wider">{c.useCase.tagline}</span>
                </div>
                <h3 className="text-3xl font-serif font-bold text-foreground mb-4">{c.useCase.quote}</h3>
                <p className="text-lg text-muted-foreground mb-6">{c.useCase.body}</p>
                <div className="flex items-start gap-2 text-xs text-foreground/60 mb-6 bg-muted/50 rounded-lg p-3 border border-border">
                  <Info size={14} className="shrink-0 mt-0.5" />
                  <span>{c.useCase.disclaimer}</span>
                </div>
                <div className="bg-sun/10 rounded-xl p-5 border border-sun/20">
                  <p className="font-serif italic text-xl text-primary text-center">
                    {c.useCase.pullQuote}
                  </p>
                </div>
              </div>
            </AnimatedReveal>

            <AnimatedReveal delay={200} className="flex justify-center">
              <WhatsAppChatPreview
                messages={[
                  { text: c.useCase.chat.intro, sender: "dayli" },
                  { text: c.useCase.chat.checkin, sender: "dayli", options: c.useCase.chat.options },
                  { text: c.useCase.chat.reply, sender: "user" },
                  { text: c.useCase.chat.clinic, sender: "dayli" },
                ]}
                animate={true}
              />
            </AnimatedReveal>
          </div>
        </div>
      </section>

      {/* FEATURES & TRUST */}
      <section className="py-24 bg-background">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid lg:grid-cols-2 gap-16">
            <div>
              <AnimatedReveal>
                <h2 className="text-3xl font-serif font-bold mb-8">{c.features.heading}</h2>
              </AnimatedReveal>
              <StaggeredList className="space-y-6">
                {c.features.items.map((item, i) => {
                  const Icon = featureIcons[i] ?? ThermometerSun;
                  return (
                    <div key={item.title} className="flex gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="text-primary" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold mb-1">{item.title}</h4>
                        <p className="text-foreground/70 text-sm">{item.body}</p>
                      </div>
                    </div>
                  );
                })}
              </StaggeredList>
            </div>

            <div>
              <AnimatedReveal>
                <h2 className="text-3xl font-serif font-bold mb-8">{c.features.trustHeading}</h2>
              </AnimatedReveal>
              <AnimatedReveal delay={200}>
                <Card className="bg-card border-none shadow-lg">
                  <CardContent className="p-8">
                    <ul className="space-y-6">
                      <li className="flex items-center gap-4">
                        <div className="bg-[#25D366]/10 p-3 rounded-full text-[#25D366]"><CheckCircle2 /></div>
                        <span className="font-medium text-lg">{c.features.trustItems[0].title}</span>
                      </li>
                      <li className="flex items-center gap-4">
                        <div className="bg-primary/10 p-3 rounded-full text-primary"><Droplets /></div>
                        <span className="font-medium text-lg">{c.features.trustItems[1].title}</span>
                      </li>
                      <li className="flex items-center gap-4">
                        <div className="bg-sun/10 p-3 rounded-full text-sun"><Globe /></div>
                        <div>
                          <div className="font-medium text-lg">{c.features.trustItems[2].title}</div>
                          <div className="text-xs text-muted-foreground mt-1">{c.features.trustItems[2].sub}</div>
                        </div>
                      </li>
                      <li className="flex items-center gap-4">
                        <div className="bg-primary/10 p-3 rounded-full text-primary"><ShieldCheck /></div>
                        <div>
                          <div className="font-medium text-lg">{c.features.trustItems[3].title}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {c.features.trustItems[3].sub}{" "}
                            <Link href={href("/privacy")} className="underline hover:text-primary">
                              {c.features.privacyLink}
                            </Link>.
                          </div>
                        </div>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </AnimatedReveal>
            </div>
          </div>
        </div>
      </section>

      <FAQSection />

      <section className="py-24 bg-primary text-primary-foreground text-center">
        <div className="container px-4 md:px-6 mx-auto">
          <AnimatedReveal className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-serif font-bold mb-8">{c.cta.heading}</h2>
            <p className="text-xl opacity-90 mb-10">{c.cta.sub}</p>
            <WhatsAppCTA
              label={c.cta.button}
              size="lg"
              variant="secondary"
              className="text-lg h-14 px-10 rounded-full shadow-xl hover:scale-105 transition-transform text-primary"
              trailingIcon={<ArrowRight className="ml-2" />}
            />
            <p className="mt-5 text-sm opacity-80">{t.ctaMicrocopy}</p>
          </AnimatedReveal>
        </div>
      </section>
    </div>
  );
}
