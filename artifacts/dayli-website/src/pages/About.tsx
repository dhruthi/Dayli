import { useEffect } from "react";
import { AnimatedReveal, StaggeredList } from "@/components/ui/animated-reveal";
import { Target, Eye, Clock, Smartphone, Globe, Sun, GraduationCap, Code2, Baby, Sparkles } from "lucide-react";
import { SEO } from "@/components/SEO";
import { getPageSeo } from "@/lib/seo";
import { useLocale } from "@/hooks/use-locale";
import ashaWorkerPhoto from "@/assets/images/pilot-asha-worker.png";
import governmentPartnershipPhoto from "@/assets/images/pilot-government-partnership.png";

// TODO: Replace this placeholder with Dhruthi's photo when provided.
// Drop the image into `src/assets/`, import it, and pass the imported
// src to <FounderPortrait imageSrc={...} />.
const FOUNDER_PHOTO_SRC: string | null = null;

function FounderPortrait({ imageSrc }: { imageSrc?: string | null }) {
  if (imageSrc) {
    return (
      <div className="relative aspect-square w-full max-w-md mx-auto">
        <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-sun/30 via-primary/20 to-heat/20 blur-2xl" aria-hidden="true" />
        <img
          src={imageSrc}
          alt="Dhruthi Kuram, founder and CEO of dayli"
          className="relative w-full h-full object-cover rounded-[2rem] border border-border shadow-xl"
        />
      </div>
    );
  }

  return (
    <div
      className="relative aspect-square w-full max-w-md mx-auto founder-portrait"
      role="img"
      aria-label="Animated portrait placeholder for Dhruthi Kuram"
    >
      <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-sun/40 via-primary/30 to-heat/25 blur-3xl founder-glow" aria-hidden="true" />

      <div className="relative w-full h-full rounded-[2rem] overflow-hidden border border-border shadow-xl bg-gradient-to-br from-secondary via-background to-accent">
        <div className="absolute inset-0 founder-orbit" aria-hidden="true">
          <div className="absolute top-8 left-8 w-3 h-3 rounded-full bg-sun/70" />
          <div className="absolute top-12 right-12 w-2 h-2 rounded-full bg-primary/60" />
          <div className="absolute bottom-16 left-16 w-2.5 h-2.5 rounded-full bg-heat/60" />
          <div className="absolute bottom-10 right-10 w-2 h-2 rounded-full bg-primary/50" />
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
          <div className="relative mb-6">
            <div className="absolute -inset-6 rounded-full bg-sun/30 blur-2xl founder-pulse" aria-hidden="true" />
            <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-sun via-primary to-heat shadow-lg flex items-center justify-center">
              <span className="text-5xl font-serif font-bold text-primary-foreground select-none">
                DK
              </span>
            </div>
          </div>
          <p className="font-serif text-2xl font-bold text-foreground">
            Dhruthi Kuram
          </p>
          <p className="text-sm text-muted-foreground mt-1 tracking-wide uppercase">
            Founder &amp; CEO
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/70 backdrop-blur border border-border text-xs text-muted-foreground">
            <Sparkles size={12} className="text-sun" />
            Photo coming soon
          </div>
        </div>
      </div>
    </div>
  );
}

export default function About() {
  const { locale, t } = useLocale();
  const c = t.about;
  const whyIcons = [Globe, Clock, Smartphone];
  const whyTones = ["bg-heat/10 text-heat", "bg-primary/10 text-primary", "bg-sun/10 text-sun"];

  // wouter Link doesn't trigger native hash-scroll on SPA navigation, so
  // the Home "Read the case study" CTA (href=/about#pilot-story) needs us
  // to scroll to the target after mount. Initial full-page loads also benefit
  // because the section is below several heavy reveal-animated sections.
  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (!hash) return;
    const id = hash.replace(/^#/, "");
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);
  return (
    <div className="flex flex-col min-h-screen">
      <SEO seo={getPageSeo("about", locale)} />
      <section className="pt-32 pb-20 bg-background text-center">
        <div className="container px-4 md:px-6 mx-auto max-w-4xl">
          <AnimatedReveal>
            <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-8 shadow-lg">
              <Sun size={32} />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground mb-6">
              {c.h1}
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">{c.intro}</p>
          </AnimatedReveal>
        </div>
      </section>

      <section className="py-20 bg-card border-y border-border">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <AnimatedReveal>
              <div className="bg-background rounded-2xl p-10 shadow-sm border border-border h-full">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Target size={24} />
                  </div>
                  <h2 className="text-2xl font-serif font-bold">{c.missionHeading}</h2>
                </div>
                <p className="text-xl leading-relaxed text-foreground font-medium">{c.mission}</p>
              </div>
            </AnimatedReveal>

            <AnimatedReveal delay={200}>
              <div className="bg-background rounded-2xl p-10 shadow-sm border border-border h-full">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-sun/10 text-sun flex items-center justify-center">
                    <Eye size={24} />
                  </div>
                  <h2 className="text-2xl font-serif font-bold">{c.visionHeading}</h2>
                </div>
                <p className="text-xl leading-relaxed text-foreground font-medium">{c.vision}</p>
              </div>
            </AnimatedReveal>
          </div>
        </div>
      </section>

      {/* MEET THE FOUNDER (English-only for now; localize in a follow-up) */}
      <section className="py-24 bg-background" dir="ltr">
        <div className="container px-4 md:px-6 mx-auto max-w-6xl">
          <AnimatedReveal>
            <div className="text-center mb-16">
              <p className="text-sm font-semibold tracking-widest uppercase text-primary mb-3">
                Meet the Founder
              </p>
              <h2 className="text-3xl md:text-4xl font-serif font-bold">
                Built by an engineer who has spent her career protecting children's health
              </h2>
            </div>
          </AnimatedReveal>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <AnimatedReveal direction="right">
              <FounderPortrait imageSrc={FOUNDER_PHOTO_SRC} />
            </AnimatedReveal>

            <AnimatedReveal delay={150}>
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-2">
                    Dhruthi Kuram
                  </h3>
                  <p className="text-base text-muted-foreground">
                    Founder &amp; CEO, dayli
                  </p>
                </div>

                <p className="text-lg leading-relaxed text-foreground">
                  Dhruthi is a software engineer turned founder who has spent her
                  career building tools that help families make better decisions
                  about the people they love most. She holds a Master's degree in
                  Computer Science from <strong>San José State University</strong> in
                  the Bay Area, where she trained alongside engineers shipping
                  consumer products at the world's largest technology companies.
                </p>

                <p className="text-lg leading-relaxed text-foreground">
                  Before dayli, Dhruthi created <strong>BabyBoo</strong>, a growth
                  and developmental milestone tracker that helps parents understand
                  whether their child is on track week by week. Tens of thousands of
                  families used BabyBoo to catch concerns earlier, ask better
                  questions at pediatric visits, and feel less alone in the
                  uncertainty of the first years of life.
                </p>

                <p className="text-lg leading-relaxed text-foreground">
                  With dayli, she is taking that same instinct &mdash; meet families
                  where they already are, with guidance they can actually use
                  &mdash; and turning it on the most underestimated health threat of
                  our generation: a changing climate. dayli combines climate
                  intelligence, medical knowledge, and real-time AI personalization,
                  delivered through WhatsApp, so women and children get the right
                  guidance on the right day, in the language they already speak.
                </p>

                <ul className="grid sm:grid-cols-2 gap-4 pt-4">
                  <li className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <Code2 size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Engineer first</p>
                      <p className="text-sm text-muted-foreground">
                        A decade shipping production software for consumers.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sun/10 text-sun flex items-center justify-center flex-shrink-0">
                      <GraduationCap size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">SJSU, Bay Area</p>
                      <p className="text-sm text-muted-foreground">
                        Master's in Computer Science.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-heat/10 text-heat flex items-center justify-center flex-shrink-0">
                      <Baby size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">BabyBoo</p>
                      <p className="text-sm text-muted-foreground">
                        Milestone tracker trusted by tens of thousands of parents.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <Sun size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">dayli</p>
                      <p className="text-sm text-muted-foreground">
                        Real-time climate-health guidance for women &amp; children.
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
            </AnimatedReveal>
          </div>
        </div>
      </section>

      {/* PILOT STORY
          Anchor target for the Home "Read the case study" CTA — keep the
          id="pilot-story" stable so cross-page anchor links don't break. */}
      <section
        id="pilot-story"
        aria-labelledby="pilot-story-heading"
        className="py-24 bg-card border-y border-border scroll-mt-24"
      >
        <div className="container px-4 md:px-6 mx-auto max-w-5xl">
          <AnimatedReveal className="text-center mb-12">
            <span className="text-sm uppercase tracking-widest text-primary font-semibold">
              {c.pilot.eyebrow}
            </span>
            <h2
              id="pilot-story-heading"
              className="text-3xl md:text-4xl font-serif font-bold mt-4 mb-4"
            >
              {c.pilot.heading}
            </h2>
            <p className="text-base text-foreground/70 max-w-2xl mx-auto">
              {c.pilot.partner}
            </p>
          </AnimatedReveal>

          {/* AI placeholder pending real, consented WCD-Telangana ASHA-worker photography. */}
          <AnimatedReveal delay={50}>
            <div className="rounded-3xl overflow-hidden border border-border/40 shadow-sm mb-12 max-w-4xl mx-auto">
              <img
                src={ashaWorkerPhoto}
                alt={t.imagery.ashaWorker}
                width={1024}
                height={768}
                loading="lazy"
                decoding="async"
                className="w-full h-auto block"
              />
            </div>
          </AnimatedReveal>

          <StaggeredList className="grid md:grid-cols-2 gap-5 md:gap-6 mb-10">
            {c.pilot.blocks.map((block) => (
              <div
                key={block.title}
                className="bg-background rounded-2xl p-6 md:p-7 border border-border shadow-sm"
              >
                <h3 className="text-lg md:text-xl font-serif font-bold mb-3 text-primary">
                  {block.title}
                </h3>
                <p className="text-foreground/80 leading-relaxed">{block.body}</p>
              </div>
            ))}
          </StaggeredList>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-12">
            {c.pilot.metrics.map((m, i) => {
              const tones = [
                "bg-marigold/15",
                "bg-heat/15",
                "bg-coral/15",
                "bg-primary/10",
              ];
              return (
                <div
                  key={m.label}
                  className={`rounded-xl p-4 md:p-5 text-center ${tones[i % tones.length]}`}
                >
                  <div className="text-xl md:text-2xl font-serif font-bold text-foreground leading-tight">
                    {m.value}
                  </div>
                  <p className="text-xs md:text-sm text-foreground/70 mt-1">
                    {m.label}
                  </p>
                </div>
              );
            })}
          </div>

          {/* AI placeholder pending real, consented WCD-Telangana partnership photography. */}
          <AnimatedReveal>
            <div className="rounded-3xl overflow-hidden border border-border/40 shadow-sm max-w-4xl mx-auto">
              <img
                src={governmentPartnershipPhoto}
                alt={t.imagery.governmentPartnership}
                width={1280}
                height={720}
                loading="lazy"
                decoding="async"
                className="w-full h-auto block"
              />
            </div>
          </AnimatedReveal>
        </div>
      </section>

      <section className="py-24 bg-background">
        <div className="container px-4 md:px-6 mx-auto text-center">
          <AnimatedReveal>
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-16">{c.whyNowHeading}</h2>
          </AnimatedReveal>

          <StaggeredList className="grid md:grid-cols-3 gap-10 max-w-5xl mx-auto">
            {c.whyNow.map((item, i) => {
              const Icon = whyIcons[i] ?? Globe;
              return (
                <div key={item.title} className="flex flex-col items-center">
                  <div className={`w-20 h-20 rounded-full ${whyTones[i] ?? whyTones[0]} flex items-center justify-center mb-6`}>
                    <Icon size={32} />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground text-center">{item.body}</p>
                </div>
              );
            })}
          </StaggeredList>
        </div>
      </section>
    </div>
  );
}
