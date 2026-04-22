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
import { SEO } from "@/components/SEO";
import { getPageSeo } from "@/lib/seo";
import { useLocale } from "@/hooks/use-locale";

export default function Clinics() {
  const { locale, t } = useLocale();
  const c = t.clinics;
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    setIsSubmitting(true);
    try {
      await submitLead("clinic", form);
      toast({ title: c.toastSuccessTitle, description: c.toastSuccessBody });
      form.reset();
    } catch {
      toast({ title: c.toastErrorTitle, description: c.toastErrorBody, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const benefitIcons = [CalendarCheck, Users, TrendingUp];
  const benefitTones = ["bg-sun/10 text-sun", "bg-primary/10 text-primary", "bg-heat/10 text-heat"];

  return (
    <div className="flex flex-col min-h-screen">
      <SEO seo={getPageSeo("clinics", locale)} />
      <section className="relative pt-24 pb-32 overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 z-0 opacity-10" aria-hidden="true">
          <img src={clinicImage} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-primary mix-blend-multiply"></div>
        </div>
        <div className="container px-4 md:px-6 mx-auto relative z-10 text-center max-w-4xl">
          <AnimatedReveal>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-sm font-medium mb-6">
              {c.badge}
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-6">{c.h1}</h1>
            <p className="text-xl opacity-90 leading-relaxed max-w-2xl mx-auto">{c.intro}</p>
          </AnimatedReveal>
        </div>
      </section>

      <section className="py-24 bg-background">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <AnimatedReveal>
                <h2 className="text-3xl font-serif font-bold mb-10">{c.howHeading}</h2>
              </AnimatedReveal>
              <StaggeredList className="space-y-8">
                {c.steps.map((step, i) => (
                  <div key={step.title} className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-lg">{i + 1}</div>
                    <div>
                      <h4 className="text-xl font-bold mb-2">{step.title}</h4>
                      <p className="text-foreground/70">{step.body}</p>
                    </div>
                  </div>
                ))}
              </StaggeredList>
            </div>
            <AnimatedReveal delay={200}>
              <div className="bg-card rounded-2xl p-8 shadow-xl border border-border">
                <h3 className="text-2xl font-serif font-bold mb-6">{c.benefitsHeading}</h3>
                <ul className="space-y-6">
                  {c.benefits.map((benefit, i) => {
                    const Icon = benefitIcons[i] ?? CalendarCheck;
                    return (
                      <li key={benefit} className="flex items-center gap-4 bg-background p-4 rounded-lg border border-border shadow-sm">
                        <div className={`p-3 rounded-full ${benefitTones[i] ?? benefitTones[0]}`}>
                          <Icon size={24} />
                        </div>
                        <span className="font-bold text-lg">{benefit}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </AnimatedReveal>
          </div>
        </div>
      </section>

      <section className="py-24 bg-muted/50 border-t border-border">
        <div className="container px-4 md:px-6 mx-auto">
          <AnimatedReveal className="max-w-xl mx-auto bg-card rounded-2xl p-8 md:p-10 shadow-lg border border-border">
            <h2 className="text-3xl font-serif font-bold mb-2 text-center">{c.formHeading}</h2>
            <p className="text-muted-foreground text-center mb-6">{c.formIntro}</p>

            <div className="flex items-center justify-center gap-2 text-xs text-foreground/70 bg-primary/5 border border-primary/10 rounded-lg p-3 mb-8">
              <Clock size={14} className="text-primary shrink-0" />
              <span>{c.formNotice}</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div className="space-y-2">
                <Label htmlFor="name">
                  {c.fields.name} <span className="text-destructive" aria-hidden="true">*</span>
                </Label>
                <Input id="name" name="name" required placeholder={c.fields.namePh} autoComplete="name" className="bg-background invalid:border-destructive/50 focus-visible:invalid:ring-destructive/30" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">
                  {c.fields.role} <span className="text-destructive" aria-hidden="true">*</span>
                </Label>
                <select id="role" name="role" required defaultValue="" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <option value="" disabled>{c.fields.rolePh}</option>
                  {c.fields.roleOptions.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinic">
                  {c.fields.clinic} <span className="text-destructive" aria-hidden="true">*</span>
                </Label>
                <Input id="clinic" name="clinic" required placeholder={c.fields.clinicPh} autoComplete="organization" className="bg-background" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patients">{c.fields.patients}</Label>
                  <Input id="patients" name="patients" inputMode="numeric" placeholder={c.fields.patientsPh} className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">{c.fields.city}</Label>
                  <Input id="city" name="city" placeholder={c.fields.cityPh} autoComplete="address-level2" className="bg-background" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">
                  {c.fields.email} <span className="text-destructive" aria-hidden="true">*</span>
                </Label>
                <Input id="email" name="email" type="email" required placeholder={c.fields.emailPh} autoComplete="email" className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">{c.fields.message}</Label>
                <Textarea id="message" name="message" placeholder={c.fields.messagePh} className="bg-background resize-none h-24" />
              </div>
              <Button type="submit" className="w-full h-12 text-lg rounded-xl shadow-md" disabled={isSubmitting}>
                {isSubmitting ? c.submitting : (
                  <>
                    {c.submit}
                    <Send className="ml-2" size={18} />
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">{c.consent}</p>
            </form>
          </AnimatedReveal>
        </div>
      </section>
    </div>
  );
}
