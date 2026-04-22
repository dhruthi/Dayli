import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AnimatedReveal } from "@/components/ui/animated-reveal";
import { FAQ_ITEMS } from "@/lib/seo";

export function FAQSection() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="py-24 bg-card border-t border-border"
    >
      <div className="container px-4 md:px-6 mx-auto max-w-3xl">
        <AnimatedReveal className="text-center mb-12">
          <span className="text-sm uppercase tracking-widest text-primary font-semibold">
            Frequently Asked
          </span>
          <h2
            id="faq-heading"
            className="text-3xl md:text-4xl font-serif font-bold text-foreground mt-4 mb-4"
          >
            Questions about dayli
          </h2>
          <p className="text-lg text-muted-foreground">
            Short, direct answers about how dayli works, what it costs, and how
            we handle your data.
          </p>
        </AnimatedReveal>

        <AnimatedReveal delay={100}>
          <Accordion type="single" collapsible className="w-full">
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem key={item.q} value={`item-${i}`}>
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
