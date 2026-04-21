import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AnimatedReveal, StaggeredList } from "@/components/ui/animated-reveal";
import { Users, CalendarCheck, TrendingUp, Send } from "lucide-react";
import { useState } from "react";

export default function Clinics() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Thank you for your interest!",
        description: "Our team will be in touch with you shortly.",
      });
      (e.target as HTMLFormElement).reset();
    }, 1000);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* HEADER */}
      <section className="relative pt-24 pb-32 overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 z-0 opacity-10">
          <img src="/src/assets/images/clinic.png" alt="Clinic background" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-primary mix-blend-multiply"></div>
        </div>
        <div className="container px-4 md:px-6 mx-auto relative z-10 text-center max-w-4xl">
          <AnimatedReveal>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-sm font-medium mb-6">
              For Clinics & Providers
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-6">
              Reduce No-Shows. Improve Patient Outcomes.
            </h1>
            <p className="text-xl opacity-90 leading-relaxed max-w-2xl mx-auto">
              dayli helps clinics reduce missed appointments during extreme weather, keep patients engaged between visits, and identify high-risk patients early.
            </p>
          </AnimatedReveal>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 bg-background">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <AnimatedReveal>
                <h2 className="text-3xl font-serif font-bold mb-10">How it works for clinics</h2>
              </AnimatedReveal>
              <StaggeredList className="space-y-8">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-lg">1</div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">Patients onboard via WhatsApp</h4>
                    <p className="text-muted-foreground">Seamless, friction-free onboarding with no apps to download or passwords to remember.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-lg">2</div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">Daily guidance and reminders</h4>
                    <p className="text-muted-foreground">Patients receive climate-aware health advice and appointment nudges.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-lg">3</div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">Clinic dashboard</h4>
                    <p className="text-muted-foreground">Monitor at-risk patients and engagement levels in real-time to prioritize outreach.</p>
                  </div>
                </div>
              </StaggeredList>
            </div>
            <AnimatedReveal delay={200}>
              <div className="bg-card rounded-2xl p-8 shadow-xl border border-border">
                <h3 className="text-2xl font-serif font-bold mb-6">Key Benefits</h3>
                <ul className="space-y-6">
                  <li className="flex items-center gap-4 bg-background p-4 rounded-lg border border-border shadow-sm">
                    <div className="bg-sun/10 p-3 rounded-full text-sun">
                      <CalendarCheck size={24} />
                    </div>
                    <span className="font-bold text-lg">Increase appointment adherence</span>
                  </li>
                  <li className="flex items-center gap-4 bg-background p-4 rounded-lg border border-border shadow-sm">
                    <div className="bg-primary/10 p-3 rounded-full text-primary">
                      <Users size={24} />
                    </div>
                    <span className="font-bold text-lg">Improve patient satisfaction</span>
                  </li>
                  <li className="flex items-center gap-4 bg-background p-4 rounded-lg border border-border shadow-sm">
                    <div className="bg-heat/10 p-3 rounded-full text-heat">
                      <TrendingUp size={24} />
                    </div>
                    <span className="font-bold text-lg">Better health outcomes</span>
                  </li>
                </ul>
              </div>
            </AnimatedReveal>
          </div>
        </div>
      </section>

      {/* FORM */}
      <section className="py-24 bg-muted/50 border-t border-border">
        <div className="container px-4 md:px-6 mx-auto">
          <AnimatedReveal className="max-w-xl mx-auto bg-card rounded-2xl p-8 md:p-10 shadow-lg border border-border">
            <h2 className="text-3xl font-serif font-bold mb-2 text-center">Partner with dayli</h2>
            <p className="text-muted-foreground text-center mb-8">Fill out the form below and our team will get back to you.</p>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" required placeholder="Dr. Jane Doe" className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinic">Clinic Name</Label>
                <Input id="clinic" required placeholder="City Health Clinic" className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" required placeholder="jane@clinic.com" className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message (Optional)</Label>
                <Textarea id="message" placeholder="How can dayli help your clinic?" className="bg-background resize-none h-24" />
              </div>
              <Button type="submit" className="w-full h-12 text-lg rounded-xl shadow-md" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : (
                  <>
                    Partner with dayli
                    <Send className="ml-2" size={18} />
                  </>
                )}
              </Button>
            </form>
          </AnimatedReveal>
        </div>
      </section>
    </div>
  );
}
