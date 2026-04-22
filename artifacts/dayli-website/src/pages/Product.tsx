import { Button } from "@/components/ui/button";
import { AnimatedReveal, StaggeredList } from "@/components/ui/animated-reveal";
import { WhatsAppChatPreview } from "@/components/ui/whatsapp-chat";
import { ThermometerSun, HeartPulse, BrainCircuit, ArrowRight } from "lucide-react";
import { SEO } from "@/components/SEO";
import { getPageSeo } from "@/lib/seo";
import { useLocale } from "@/hooks/use-locale";
import { WHATSAPP_URL } from "@/lib/site";

export default function Product() {
  const { locale, t } = useLocale();
  const c = t.product;
  const layerIcons = [ThermometerSun, HeartPulse, BrainCircuit];
  return (
    <div className="flex flex-col min-h-screen">
      <SEO seo={getPageSeo("product", locale)} />
      <section className="pt-24 pb-16 bg-card border-b border-border">
        <div className="container px-4 md:px-6 mx-auto text-center max-w-3xl">
          <AnimatedReveal>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-6">{c.h1}</h1>
            <p className="text-xl text-muted-foreground leading-relaxed">{c.intro}</p>
          </AnimatedReveal>
        </div>
      </section>

      <section className="py-24 bg-background">
        <div className="container px-4 md:px-6 mx-auto">
          <StaggeredList className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {c.layers.map((layer, i) => {
              const Icon = layerIcons[i] ?? ThermometerSun;
              const tone = i === 0 ? "bg-heat/10 text-heat" : i === 1 ? "bg-primary/10 text-primary" : "bg-sun/10 text-sun";
              return (
                <div key={layer.title} className="bg-card rounded-2xl p-8 border border-border shadow-sm hover:shadow-md transition-shadow">
                  <div className={`w-14 h-14 rounded-xl ${tone} flex items-center justify-center mb-6`}>
                    <Icon size={28} />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-foreground">{layer.title}</h3>
                  <p className="text-muted-foreground">{layer.body}</p>
                </div>
              );
            })}
          </StaggeredList>
        </div>
      </section>

      <section className="py-24 bg-primary/5">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
            <AnimatedReveal direction="right">
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">{c.realtime.heading}</h2>
              <p className="text-lg text-muted-foreground mb-8">{c.realtime.intro}</p>

              <ul className="space-y-6 mb-10">
                {c.realtime.steps.map((step, i) => (
                  <li key={step.title} className="flex gap-4">
                    <div className="mt-1 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 font-bold">{i + 1}</div>
                    <div>
                      <h4 className="font-bold text-lg">{step.title}</h4>
                      <p className="text-muted-foreground">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="rounded-full shadow-md">
                  {c.realtime.cta}
                  <ArrowRight className="ml-2" size={18} />
                </Button>
              </a>
            </AnimatedReveal>

            <AnimatedReveal direction="left" delay={200} className="relative">
              <WhatsAppChatPreview
                messages={[
                  { text: c.realtime.chat.msg1, sender: "dayli" },
                  { text: c.realtime.chat.checkin, sender: "dayli", delay: 2000, options: c.realtime.chat.options },
                  { text: c.realtime.chat.reply, sender: "user", delay: 2000 },
                  { text: c.realtime.chat.rest, sender: "dayli", delay: 1500 },
                ]}
                animate={true}
              />
            </AnimatedReveal>
          </div>
        </div>
      </section>
    </div>
  );
}
