import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowRight, ThermometerSun, ShieldCheck, HeartPulse, CheckCircle2, Clock, Globe, Droplets, MapPin } from "lucide-react";
import { AnimatedReveal, StaggeredList } from "@/components/ui/animated-reveal";
import { WhatsAppChatPreview } from "@/components/ui/whatsapp-chat";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* HERO SECTION */}
      <section className="relative pt-20 pb-32 overflow-hidden bg-gradient-to-b from-sun/10 to-background">
        <div className="container px-4 md:px-6 mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <AnimatedReveal direction="up" className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <ShieldCheck size={16} />
                <span>AI-powered Climate Health Copilot</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground leading-tight mb-6">
                Your daily health, powered by climate intelligence
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
                AI that helps women and children stay safe, healthy, and one step ahead of extreme heat and climate risks.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a href="https://wa.me/" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="w-full sm:w-auto text-base h-12 px-8 rounded-full shadow-lg hover:shadow-xl transition-all">
                    Start on WhatsApp
                  </Button>
                </a>
                <Link href="/clinics">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-base h-12 px-8 rounded-full border-primary/20 text-primary hover:bg-primary/5">
                    For Clinics & Partners
                  </Button>
                </Link>
              </div>
              <div className="mt-8 text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle2 size={16} className="text-primary" />
                <span>Not a chatbot. Not a wellness app. A daily decision layer for health.</span>
              </div>
            </AnimatedReveal>

            <AnimatedReveal direction="left" delay={200} className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-[4/3] max-w-md mx-auto lg:max-w-none">
                <img 
                  src="/src/assets/images/hero.png" 
                  alt="Woman checking phone outdoors in heat" 
                  className="object-cover w-full h-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-heat/40 to-transparent mix-blend-overlay"></div>
              </div>
              
              <div className="absolute -bottom-10 -left-6 md:-left-12 max-w-[280px] sm:max-w-[320px]">
                <WhatsAppChatPreview 
                  messages={[
                    { text: "Tomorrow will be extremely hot (45°C). Ensure you drink water frequently and stay indoors between 12-4 PM.", sender: "dayli" }
                  ]}
                  animate={true}
                />
              </div>
            </AnimatedReveal>
          </div>
        </div>
      </section>

      {/* PROBLEM SECTION */}
      <section className="py-24 bg-card">
        <div className="container px-4 md:px-6 mx-auto">
          <AnimatedReveal className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-6">
              Climate is already impacting your health
            </h2>
            <p className="text-lg text-muted-foreground">
              Today, no system connects climate to your daily health decisions.
            </p>
          </AnimatedReveal>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <AnimatedReveal delay={100} direction="up">
              <Card className="bg-background border-none shadow-md h-full">
                <CardContent className="p-8">
                  <div className="w-12 h-12 rounded-xl bg-heat/10 text-heat flex items-center justify-center mb-6">
                    <ThermometerSun size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-4">Extreme heat increases risks for:</h3>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-heat"></div>
                      <span className="font-medium text-foreground">Pregnant women</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-heat"></div>
                      <span className="font-medium text-foreground">Young children</span>
                    </li>
                  </ul>
                  <p className="text-muted-foreground">
                    Dehydration, fatigue, and missed care lead to avoidable complications.
                  </p>
                </CardContent>
              </Card>
            </AnimatedReveal>

            <AnimatedReveal delay={200} direction="up">
              <Card className="bg-primary text-primary-foreground border-none shadow-md h-full">
                <CardContent className="p-8 flex flex-col justify-center h-full">
                  <HeartPulse size={48} className="mb-6 opacity-80" />
                  <h3 className="text-2xl font-serif font-bold mb-4">
                    Meet dayli
                  </h3>
                  <p className="text-lg opacity-90 leading-relaxed mb-6">
                    Your AI health companion that adapts to your environment in real time.
                  </p>
                  <ul className="space-y-3 text-sm opacity-90">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                      <span>Tracks local weather and heat conditions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                      <span>Understands your health needs</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                      <span>Guides you daily with simple, actionable advice</span>
                    </li>
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
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground">Simple, actionable, real-time guidance.</p>
          </AnimatedReveal>

          <StaggeredList className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold mx-auto mb-6">1</div>
              <h3 className="text-xl font-bold mb-3">Understands You</h3>
              <p className="text-muted-foreground text-sm">
                Knows your pregnancy stage or child's age, and your daily location conditions.
              </p>
            </div>
            <div className="text-center relative">
              <div className="hidden md:block absolute top-8 left-0 right-0 h-[2px] bg-border -z-10 w-[calc(100%-4rem)] mx-auto transform translate-x-[50%]"></div>
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold mx-auto mb-6">2</div>
              <h3 className="text-xl font-bold mb-3">Monitors Climate Risk</h3>
              <p className="text-muted-foreground text-sm">
                Tracks heatwaves, temperature spikes, and environmental stress in real-time.
              </p>
            </div>
            <div className="text-center relative">
              <div className="hidden md:block absolute top-8 left-0 right-0 h-[2px] bg-border -z-10 w-[calc(100%-4rem)] mx-auto transform -translate-x-[50%]"></div>
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold mx-auto mb-6">3</div>
              <h3 className="text-xl font-bold mb-3">Guides You Daily</h3>
              <p className="text-muted-foreground text-sm">
                Provides hydration reminders, safe outdoor timing, alerts, and check-ins.
              </p>
            </div>
          </StaggeredList>
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
                  <span className="font-semibold text-lg uppercase tracking-wider">Hyderabad Heat</span>
                </div>
                <h3 className="text-3xl font-serif font-bold text-foreground mb-4">
                  "Tomorrow: 45°C in your area"
                </h3>
                <p className="text-lg text-muted-foreground mb-8">
                  dayli will alert you in advance, recommend hydration and rest, suggest avoiding peak heat hours (12–4 PM), and check on your symptoms.
                </p>
                <div className="bg-sun/10 rounded-xl p-5 border border-sun/20">
                  <p className="font-serif italic text-xl text-primary text-center">
                    "Simple actions. Real impact."
                  </p>
                </div>
              </div>
            </AnimatedReveal>

            <AnimatedReveal delay={200} className="flex justify-center">
              <WhatsAppChatPreview 
                messages={[
                  { text: "Tomorrow will be extremely hot (45°C). Ensure you drink water frequently and stay indoors between 12-4 PM.", sender: "dayli" },
                  { text: "How are you feeling today?", sender: "dayli", options: ["Fine", "Tired", "Dizzy"] },
                  { text: "Tired", sender: "user" },
                  { text: "Please rest and consider visiting a clinic nearby. Would you like me to find one?", sender: "dayli" }
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
                <h2 className="text-3xl font-serif font-bold mb-8">Product Features</h2>
              </AnimatedReveal>
              <StaggeredList className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <ThermometerSun className="text-primary" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-1">Daily Health Alerts</h4>
                    <p className="text-muted-foreground text-sm">Know when heat or weather conditions can affect you</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <ShieldCheck className="text-primary" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-1">Personalized Guidance</h4>
                    <p className="text-muted-foreground text-sm">Advice tailored to you—not generic recommendations</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="text-primary" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-1">Daily Check-ins</h4>
                    <p className="text-muted-foreground text-sm">Track how you feel and get help when needed</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <HeartPulse className="text-primary" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-1">Clinic Support (Optional)</h4>
                    <p className="text-muted-foreground text-sm">Stay connected with your healthcare provider</p>
                  </div>
                </div>
              </StaggeredList>
            </div>

            <div>
              <AnimatedReveal>
                <h2 className="text-3xl font-serif font-bold mb-8">Built for real-world conditions</h2>
              </AnimatedReveal>
              <AnimatedReveal delay={200}>
                <Card className="bg-card border-none shadow-lg">
                  <CardContent className="p-8">
                    <ul className="space-y-6">
                      <li className="flex items-center gap-4">
                        <div className="bg-[#25D366]/10 p-3 rounded-full text-[#25D366]">
                          <CheckCircle2 />
                        </div>
                        <span className="font-medium text-lg">Works on WhatsApp (no app needed)</span>
                      </li>
                      <li className="flex items-center gap-4">
                        <div className="bg-primary/10 p-3 rounded-full text-primary">
                          <Droplets />
                        </div>
                        <span className="font-medium text-lg">Designed for low data usage</span>
                      </li>
                      <li className="flex items-center gap-4">
                        <div className="bg-sun/10 p-3 rounded-full text-sun">
                          <Globe />
                        </div>
                        <span className="font-medium text-lg">Supports multiple languages</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </AnimatedReveal>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-primary text-primary-foreground text-center">
        <div className="container px-4 md:px-6 mx-auto">
          <AnimatedReveal className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-serif font-bold mb-8">
              Take control of your health—every day
            </h2>
            <p className="text-xl opacity-90 mb-10">
              Prevent problems before they happen.
            </p>
            <a href="https://wa.me/" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="secondary" className="text-lg h-14 px-10 rounded-full shadow-xl hover:scale-105 transition-transform text-primary">
                Start with dayli on WhatsApp
                <ArrowRight className="ml-2" />
              </Button>
            </a>
          </AnimatedReveal>
        </div>
      </section>
    </div>
  );
}
