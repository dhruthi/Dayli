import { AnimatedReveal, StaggeredList } from "@/components/ui/animated-reveal";
import { Target, Eye, Clock, Smartphone, Globe, Sun } from "lucide-react";
import { SEO } from "@/components/SEO";
import { PAGE_SEO } from "@/lib/seo";

export default function About() {
  return (
    <div className="flex flex-col min-h-screen">
      <SEO seo={PAGE_SEO.about} />
      {/* HEADER */}
      <section className="pt-32 pb-20 bg-background text-center">
        <div className="container px-4 md:px-6 mx-auto max-w-4xl">
          <AnimatedReveal>
            <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-8 shadow-lg">
              <Sun size={32} />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground mb-6">
              About dayli
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              A daily decision layer for health in a changing climate.
            </p>
          </AnimatedReveal>
        </div>
      </section>

      {/* MISSION & VISION */}
      <section className="py-20 bg-card border-y border-border">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <AnimatedReveal>
              <div className="bg-background rounded-2xl p-10 shadow-sm border border-border h-full">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Target size={24} />
                  </div>
                  <h2 className="text-2xl font-serif font-bold">Mission</h2>
                </div>
                <p className="text-xl leading-relaxed text-foreground font-medium">
                  "To make healthcare adaptive, personalized, and proactive in a changing climate."
                </p>
              </div>
            </AnimatedReveal>

            <AnimatedReveal delay={200}>
              <div className="bg-background rounded-2xl p-10 shadow-sm border border-border h-full">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-sun/10 text-sun flex items-center justify-center">
                    <Eye size={24} />
                  </div>
                  <h2 className="text-2xl font-serif font-bold">Vision</h2>
                </div>
                <p className="text-xl leading-relaxed text-foreground font-medium">
                  "A world where every individual has access to real-time health guidance based on their environment."
                </p>
              </div>
            </AnimatedReveal>
          </div>
        </div>
      </section>

      {/* WHY NOW */}
      <section className="py-24 bg-background">
        <div className="container px-4 md:px-6 mx-auto text-center">
          <AnimatedReveal>
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-16">Why Now</h2>
          </AnimatedReveal>

          <StaggeredList className="grid md:grid-cols-3 gap-10 max-w-5xl mx-auto">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-heat/10 text-heat flex items-center justify-center mb-6">
                <Globe size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3">Climate risks are increasing</h3>
              <p className="text-muted-foreground text-center">
                Extreme weather events are becoming more frequent, directly impacting vulnerable populations.
              </p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6">
                <Clock size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3">AI enables real-time decision-making</h3>
              <p className="text-muted-foreground text-center">
                We now have the technology to process complex data and deliver personalized guidance instantly.
              </p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-sun/10 text-sun flex items-center justify-center mb-6">
                <Smartphone size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3">Mobile access is universal</h3>
              <p className="text-muted-foreground text-center">
                Platforms like WhatsApp reach billions, making it possible to deliver care everywhere.
              </p>
            </div>
          </StaggeredList>
        </div>
      </section>
    </div>
  );
}
