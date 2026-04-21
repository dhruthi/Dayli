import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AnimatedReveal } from "@/components/ui/animated-reveal";
import { Pill, Baby, Activity, Send, AlertTriangle, CheckCircle } from "lucide-react";
import { useState } from "react";
import pharmaImage from "@/assets/images/pharma.png";

export default function Pharma() {
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
        description: "Our partnership team will contact you soon.",
      });
      (e.target as HTMLFormElement).reset();
    }, 1000);
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
            <p className="text-muted-foreground text-center mb-8">Discuss adherence solutions for your portfolios.</p>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" required placeholder="John Smith" className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company Name</Label>
                <Input id="company" required placeholder="PharmaCorp Inc." className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Work Email</Label>
                <Input id="email" type="email" required placeholder="john@pharmacorp.com" className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message (Optional)</Label>
                <Textarea id="message" placeholder="Tell us about your therapeutic areas of interest" className="bg-background resize-none h-24" />
              </div>
              <Button type="submit" className="w-full h-12 text-lg rounded-xl shadow-md" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : (
                  <>
                    Submit Inquiry
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
