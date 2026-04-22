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
import { SEO } from "@/components/SEO";
import { getPageSeo } from "@/lib/seo";
import { useLocale } from "@/hooks/use-locale";

export default function Pharma() {
  const { locale, t } = useLocale();
  const c = t.pharma;
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    setIsSubmitting(true);
    try {
      await submitLead("pharma", form);
      toast({ title: c.toastSuccessTitle, description: c.toastSuccessBody });
      form.reset();
    } catch {
      toast({ title: c.toastErrorTitle, description: c.toastErrorBody, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const useCaseIcons = [Activity, Pill, Baby];
  const useCaseTones = ["bg-primary/10 text-primary", "bg-sun/10 text-sun", "bg-heat/10 text-heat"];

  return (
    <div className="flex flex-col min-h-screen">
      <SEO seo={getPageSeo("pharma", locale)} />
      <section className="relative pt-24 pb-32 overflow-hidden bg-gradient-to-br from-card to-muted border-b border-border">
        <div className="container px-4 md:px-6 mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <AnimatedReveal>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                {c.badge}
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground mb-6 leading-tight">
                {c.h1}
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">{c.intro}</p>
            </AnimatedReveal>

            <AnimatedReveal delay={200} direction="left" className="relative hidden lg:block">
              <div className="rounded-2xl overflow-hidden shadow-2xl aspect-[4/3]">
                <img src={pharmaImage} alt="" className="object-cover w-full h-full" />
              </div>
            </AnimatedReveal>
          </div>
        </div>
      </section>

      <section className="py-24 bg-background">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <AnimatedReveal>
              <div className="bg-destructive/5 rounded-2xl p-8 border border-destructive/10 h-full">
                <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-6">
                  <AlertTriangle />
                </div>
                <h3 className="text-2xl font-serif font-bold mb-4">{c.problemHeading}</h3>
                <p className="text-lg text-muted-foreground mb-6">{c.problemIntro}</p>
                <ul className="space-y-3">
                  {c.problemBullets.map((b) => (
                    <li key={b} className="flex items-center gap-3 text-foreground font-medium">
                      <div className="w-1.5 h-1.5 rounded-full bg-destructive"></div>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </AnimatedReveal>

            <AnimatedReveal delay={200}>
              <div className="bg-primary/5 rounded-2xl p-8 border border-primary/10 h-full">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6">
                  <CheckCircle />
                </div>
                <h3 className="text-2xl font-serif font-bold mb-4">{c.solutionHeading}</h3>
                <p className="text-lg text-muted-foreground mb-6">{c.solutionIntro}</p>
                <ul className="space-y-3">
                  {c.solutionBullets.map((b) => (
                    <li key={b} className="flex items-center gap-3 text-foreground font-medium">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </AnimatedReveal>
          </div>
        </div>
      </section>

      <section className="py-24 bg-card border-y border-border">
        <div className="container px-4 md:px-6 mx-auto text-center">
          <AnimatedReveal>
            <h2 className="text-3xl font-serif font-bold mb-12">{c.useCasesHeading}</h2>
          </AnimatedReveal>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {c.useCases.map((label, i) => {
              const Icon = useCaseIcons[i] ?? Activity;
              return (
                <AnimatedReveal key={label} delay={100 * (i + 1)}>
                  <div className="p-6">
                    <div className={`w-16 h-16 rounded-2xl ${useCaseTones[i] ?? useCaseTones[0]} flex items-center justify-center mx-auto mb-4`}>
                      <Icon size={32} />
                    </div>
                    <h4 className="text-xl font-bold">{label}</h4>
                  </div>
                </AnimatedReveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-24 bg-background">
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
                <Input id="name" name="name" required placeholder={c.fields.namePh} autoComplete="name" className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">
                  {c.fields.company} <span className="text-destructive" aria-hidden="true">*</span>
                </Label>
                <Input id="company" name="company" required placeholder={c.fields.companyPh} autoComplete="organization" className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="therapeutic">{c.fields.therapeutic}</Label>
                <select id="therapeutic" name="therapeutic" defaultValue="" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <option value="" disabled>{c.fields.therapeuticPh}</option>
                  {c.fields.therapeuticOptions.map((o) => <option key={o}>{o}</option>)}
                </select>
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
