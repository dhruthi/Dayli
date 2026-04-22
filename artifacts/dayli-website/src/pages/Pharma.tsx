import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AnimatedReveal } from "@/components/ui/animated-reveal";
import { Pill, Baby, Activity, Send, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useState } from "react";
import pharmaImage from "@/assets/images/pharma.png";
import { submitLead } from "@/lib/site";

export default function Pharma() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    setIsSubmitting(true);
    try {
      await submitLead("pharma", form);
      toast({
        title: "Thank you for your interest!",
        description: "Our partnership team will reach out within 2 working days.",
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
      <section className="relative pt-24 pb-32 overflow-hidden bg-gradient-to-br from-card to-muted border-b border-border">
        <div className="container px-4 md:px-6 mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <AnimatedReveal>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                For Pharma & Life Sciences
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground mb-6 leading-tight">
                Improve Adherence in Real-World Conditions
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Patients often drop adherence during heatwaves and environmental stress. dayli ensures continuous engagement when patients need it most.
              </p>
            </AnimatedReveal>

            <AnimatedReveal delay={200} direction="left" className="relative hidden lg:block">
              <div className="rounded-2xl overflow-hidden shadow-2xl aspect-[4/3]">
                <img
                  src={pharmaImage}
                  alt="Outdoor health and adherence"
                  className="object-cover w-full h-full"
                />
              </div>
            </AnimatedReveal>
          </div>
        </div>
      </section>

      {/* PROBLEM & SOLUTION */}
      <section className="py-24 bg-background">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <AnimatedReveal>
              <div className="bg-destructive/5 rounded-2xl p-8 border border-destructive/10 h-full">
                <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-6">
                  <AlertTriangle />
                </div>
                <h3 className="text-2xl font-serif font-bold mb-4">The Problem</h3>
                <p className="text-lg text-muted-foreground mb-6">
                  Patients often drop adherence during:
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-foreground font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-destructive"></div>
                    Heatwaves
                  </li>
                  <li className="flex items-center gap-3 text-foreground font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-destructive"></div>
                    Environmental stress
                  </li>
                </ul>
              </div>
            </AnimatedReveal>

            <AnimatedReveal delay={200}>
              <div className="bg-primary/5 rounded-2xl p-8 border border-primary/10 h-full">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6">
                  <CheckCircle />
                </div>
                <h3 className="text-2xl font-serif font-bold mb-4">The Solution</h3>
                <p className="text-lg text-muted-foreground mb-6">
                  dayli ensures:
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-foreground font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                    Continuous engagement
                  </li>
                  <li className="flex items-center gap-3 text-foreground font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                    Climate-aware adherence nudges
                  </li>
                  <li className="flex items-center gap-3 text-foreground font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                    Better treatment outcomes
                  </li>
                </ul>
              </div>
            </AnimatedReveal>
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="py-24 bg-card border-y border-border">
        <div className="container px-4 md:px-6 mx-auto text-center">
          <AnimatedReveal>
            <h2 className="text-3xl font-serif font-bold mb-12">Core Use Cases</h2>
          </AnimatedReveal>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <AnimatedReveal delay={100}>
              <div className="p-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                  <Activity size={32} />
                </div>
                <h4 className="text-xl font-bold">Chronic conditions</h4>
              </div>
            </AnimatedReveal>
            <AnimatedReveal delay={200}>
              <div className="p-6">
                <div className="w-16 h-16 rounded-2xl bg-sun/10 text-sun flex items-center justify-center mx-auto mb-4">
                  <Pill size={32} />
                </div>
                <h4 className="text-xl font-bold">Maternal health</h4>
              </div>
            </AnimatedReveal>
            <AnimatedReveal delay={300}>
              <div className="p-6">
                <div className="w-16 h-16 rounded-2xl bg-heat/10 text-heat flex items-center justify-center mx-auto mb-4">
                  <Baby size={32} />
                </div>
                <h4 className="text-xl font-bold">Pediatric care</h4>
              </div>
            </AnimatedReveal>
          </div>
        </div>
      </section>

      {/* FORM */}
      <section className="py-24 bg-background">
        <div className="container px-4 md:px-6 mx-auto">
          <AnimatedReveal className="max-w-xl mx-auto bg-card rounded-2xl p-8 md:p-10 shadow-lg border border-border">
            <h2 className="text-3xl font-serif font-bold mb-2 text-center">Partner with us</h2>
            <p className="text-muted-foreground text-center mb-6">Discuss adherence solutions for your portfolios.</p>

            <div className="flex items-center justify-center gap-2 text-xs text-foreground/70 bg-primary/5 border border-primary/10 rounded-lg p-3 mb-8">
              <Clock size={14} className="text-primary shrink-0" />
              <span>We respond within 2 working days with a tailored intro call.</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div className="space-y-2">
                <Label htmlFor="name">
                  Full Name <span className="text-destructive" aria-hidden="true">*</span>
                </Label>
                <Input id="name" name="name" required placeholder="John Smith" autoComplete="name" className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">
                  Company Name <span className="text-destructive" aria-hidden="true">*</span>
                </Label>
                <Input id="company" name="company" required placeholder="PharmaCorp Inc." autoComplete="organization" className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="therapeutic">Therapeutic Area</Label>
                <select
                  id="therapeutic"
                  name="therapeutic"
                  defaultValue=""
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="" disabled>Select an area</option>
                  <option>Maternal &amp; women's health</option>
                  <option>Pediatrics</option>
                  <option>Cardiometabolic</option>
                  <option>Respiratory</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">
                  Work Email <span className="text-destructive" aria-hidden="true">*</span>
                </Label>
                <Input id="email" name="email" type="email" required placeholder="john@pharmacorp.com" autoComplete="email" className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message (Optional)</Label>
                <Textarea id="message" name="message" placeholder="Tell us about your therapeutic areas of interest" className="bg-background resize-none h-24" />
              </div>
              <Button type="submit" className="w-full h-12 text-lg rounded-xl shadow-md" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : (
                  <>
                    Submit Inquiry
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
