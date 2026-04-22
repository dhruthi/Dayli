import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AnimatedReveal } from "@/components/ui/animated-reveal";
import { useLocale } from "@/hooks/use-locale";

export function FAQSection() {
  const { t } = useLocale();
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="py-24 bg-card border-t border-border"
    >
      <div className="container px-4 md:px-6 mx-auto max-w-3xl">
        <AnimatedReveal className="text-center mb-12">
          <span className="text-sm uppercase tracking-widest text-primary font-semibold">
            {t.faqSection.eyebrow}
          </span>
          <h2
            id="faq-heading"
            className="text-3xl md:text-4xl font-serif font-bold text-foreground mt-4 mb-4"
          >
            {t.faqSection.heading}
          </h2>
          <p className="text-lg text-muted-foreground">{t.faqSection.intro}</p>
        </AnimatedReveal>

        <AnimatedReveal delay={100}>
          <Accordion type="single" collapsible className="w-full">
            {t.faq.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-lg font-semibold">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </AnimatedReveal>
      </div>
    </section>
  );
}
