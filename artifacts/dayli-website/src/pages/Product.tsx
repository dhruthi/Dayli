import { Button } from "@/components/ui/button";
import { AnimatedReveal, StaggeredList } from "@/components/ui/animated-reveal";
import { WhatsAppChatPreview } from "@/components/ui/whatsapp-chat";
import { ThermometerSun, HeartPulse, BrainCircuit, ArrowRight } from "lucide-react";

export default function Product() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* HEADER */}
      <section className="pt-24 pb-16 bg-card border-b border-border">
        <div className="container px-4 md:px-6 mx-auto text-center max-w-3xl">
          <AnimatedReveal>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-6">
              How dayli Works
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              dayli combines Climate data + Health knowledge + AI personalization to deliver real-time, actionable guidance for daily life.
            </p>
          </AnimatedReveal>
        </div>
      </section>

      {/* LAYERS */}
      <section className="py-24 bg-background">
        <div className="container px-4 md:px-6 mx-auto">
          <StaggeredList className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-card rounded-2xl p-8 border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-heat/10 text-heat flex items-center justify-center mb-6">
                <ThermometerSun size={28} />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-foreground">Climate Awareness</h3>
              <p className="text-muted-foreground">
                Tracks heat and environmental risks in your area.
              </p>
            </div>

            <div className="bg-card rounded-2xl p-8 border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                <HeartPulse size={28} />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-foreground">Health Intelligence</h3>
              <p className="text-muted-foreground">
                Understands your stage (pregnancy / child care).
              </p>
            </div>

            <div className="bg-card rounded-2xl p-8 border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-sun/10 text-sun flex items-center justify-center mb-6">
                <BrainCircuit size={28} />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-foreground">AI Copilot</h3>
              <p className="text-muted-foreground">
                Delivers simple daily actions to keep you safe.
              </p>
            </div>
          </StaggeredList>
        </div>
      </section>

      {/* INTERACTION EXAMPLE */}
      <section className="py-24 bg-primary/5">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
            <AnimatedReveal direction="right">
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">
                Real-time guidance when it matters most
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Daily health guidance powered by climate intelligence. Not a chatbot. Not a wellness app. A daily decision layer for health in a changing climate.
              </p>
              
              <ul className="space-y-6 mb-10">
                <li className="flex gap-4">
                  <div className="mt-1 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 font-bold">1</div>
                  <div>
                    <h4 className="font-bold text-lg">Morning Message</h4>
                    <p className="text-muted-foreground">Proactive alerts based on the day's forecast.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="mt-1 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 font-bold">2</div>
                  <div>
                    <h4 className="font-bold text-lg">Check-in</h4>
                    <p className="text-muted-foreground">Simple check-ins to monitor your condition.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="mt-1 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 font-bold">3</div>
                  <div>
                    <h4 className="font-bold text-lg">Risk Response</h4>
                    <p className="text-muted-foreground">Immediate guidance if a risk is detected.</p>
                  </div>
                </li>
              </ul>

              <a href="https://wa.me/" target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="rounded-full shadow-md">
                  Experience dayli on WhatsApp
                  <ArrowRight className="ml-2" size={18} />
                </Button>
              </a>
            </AnimatedReveal>

            <AnimatedReveal direction="left" delay={200} className="relative">
              <WhatsAppChatPreview 
                messages={[
                  { text: "Today will be very hot (44°C). Drink water every hour and avoid going outside between 12–4 PM.", sender: "dayli" },
                  { text: "How are you feeling today?", sender: "dayli", delay: 2000, options: ["Fine", "Tired", "Dizzy"] },
                  { text: "Dizzy", sender: "user", delay: 2000 },
                  { text: "Please rest and consider visiting a clinic nearby.", sender: "dayli", delay: 1500 }
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
