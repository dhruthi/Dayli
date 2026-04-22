import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AnimatedReveal, StaggeredList } from "@/components/ui/animated-reveal";
import { Users, CalendarCheck, TrendingUp, Send, Clock } from "lucide-react";
import { useState } from "react";
import clinicImage from "@/assets/images/clinic.png";
import { submitLead } from "@/lib/site";

export default function Clinics() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    setIsSubmitting(true);
    try {
      await submitLead("clinic", form);
      toast({
        title: "Thank you for your interest!",
        description: "We'll respond within 2 working days with a 20-minute intro call.",
      });
      form.reset();
    } catch {
      toast({
        title: "Something went wrong",
        description: "Please try again, or email us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* HEADER */}
      <section className="relative pt-24 pb-32 overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 z-0 opacity-10" aria-hidden="true">
          <img src={clinicImage} alt="" className="w-full h-full object-cover" />
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
                    <p className="text-foreground/70">Seamless, friction-free onboarding with no apps to download or passwords to remember.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-lg">2</div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">Daily guidance and reminders</h4>
                    <p className="text-foreground/70">Patients receive climate-aware health advice and appointment nudges.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-lg">3</div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">Clinic dashboard</h4>
                    <p className="text-foreground/70">Monitor at-risk patients and engagement levels in real-time to prioritize outreach.</p>
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
            <p className="text-muted-foreground text-center mb-6">Tell us a bit about your clinic and our team will be in touch.</p>

            <div className="flex items-center justify-center gap-2 text-xs text-foreground/70 bg-primary/5 border border-primary/10 rounded-lg p-3 mb-8">
              <Clock size={14} className="text-primary shrink-0" />
              <span>We respond within 2 working days with a 20-minute intro call.</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div className="space-y-2">
                <Label htmlFor="name">
                  Full Name <span className="text-destructive" aria-hidden="true">*</span>
                </Label>
                <Input id="name" name="name" required placeholder="Dr. Jane Doe" autoComplete="name" className="bg-background invalid:border-destructive/50 focus-visible:invalid:ring-destructive/30" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">
                  Your Role <span className="text-destructive" aria-hidden="true">*</span>
                </Label>
                <select
                  id="role"
                  name="role"
                  required
                  defaultValue=""
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="" disabled>Select your role</option>
                  <option>Doctor</option>
                  <option>Clinic Administrator</option>
                  <option>Care Coordinator</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinic">
                  Clinic Name <span className="text-destructive" aria-hidden="true">*</span>
                </Label>
                <Input id="clinic" name="clinic" required placeholder="City Health Clinic" autoComplete="organization" className="bg-background" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patients">Approx. patients / month</Label>
                  <Input id="patients" name="patients" inputMode="numeric" placeholder="e.g. 800" className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City / Region</Label>
                  <Input id="city" name="city" placeholder="Hyderabad" autoComplete="address-level2" className="bg-background" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address <span className="text-destructive" aria-hidden="true">*</span>
                </Label>
                <Input id="email" name="email" type="email" required placeholder="jane@clinic.com" autoComplete="email" className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message (Optional)</Label>
                <Textarea id="message" name="message" placeholder="How can dayli help your clinic?" className="bg-background resize-none h-24" />
              </div>
              <Button type="submit" className="w-full h-12 text-lg rounded-xl shadow-md" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : (
                  <>
                    Partner with dayli
                    <Send className="ml-2" size={18} />
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                By submitting, you agree to be contacted about a dayli partnership. We never share your details.
              </p>
            </form>
          </AnimatedReveal>
        </div>
      </section>
    </div>
  );
}
