import { AnimatedReveal } from "@/components/ui/animated-reveal";
import { ShieldCheck } from "lucide-react";

export default function Privacy() {
  return (
    <div className="flex flex-col min-h-screen">
      <section className="pt-20 pb-16 bg-gradient-to-b from-primary/5 to-background border-b border-border">
        <div className="container px-4 md:px-6 mx-auto max-w-3xl">
          <AnimatedReveal>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <ShieldCheck size={16} />
              <span>Your data, your control</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Privacy at dayli</h1>
            <p className="text-lg text-muted-foreground">
              dayli supports women and children with sensitive health guidance. We treat your data with
              the care that responsibility demands.
            </p>
          </AnimatedReveal>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="container px-4 md:px-6 mx-auto max-w-3xl space-y-10">
          <AnimatedReveal>
            <h2 className="text-2xl font-serif font-bold mb-3">What we collect</h2>
            <p className="text-muted-foreground leading-relaxed">
              Only what is needed to give you safe, personalized guidance: your WhatsApp number, your
              pregnancy stage or your child's age, your approximate location, and the daily check-in
              responses you choose to share.
            </p>
          </AnimatedReveal>

          <AnimatedReveal>
            <h2 className="text-2xl font-serif font-bold mb-3">How we use it</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your information is used to combine local climate signals with your personal context so
              dayli can send relevant alerts, hydration reminders, and check-ins. It is never used for
              advertising.
            </p>
          </AnimatedReveal>

          <AnimatedReveal>
            <h2 className="text-2xl font-serif font-bold mb-3">What we do not do</h2>
            <ul className="space-y-3 text-muted-foreground leading-relaxed list-disc pl-5">
              <li>We do not sell or share your personal data with third parties for marketing.</li>
              <li>We do not share individual health data with clinics or pharma partners without your explicit consent.</li>
              <li>We do not store WhatsApp message content longer than needed to provide the service.</li>
            </ul>
          </AnimatedReveal>

          <AnimatedReveal>
            <h2 className="text-2xl font-serif font-bold mb-3">Your choices</h2>
            <p className="text-muted-foreground leading-relaxed">
              You can pause dayli at any time by replying STOP on WhatsApp. You can ask us to delete
              your data by replying DELETE, or by contacting our team.
            </p>
          </AnimatedReveal>

          <AnimatedReveal>
            <h2 className="text-2xl font-serif font-bold mb-3">Important notice</h2>
            <p className="text-muted-foreground leading-relaxed">
              dayli is not a medical device and does not replace professional medical advice. For any
              medical emergency, contact your local healthcare provider or emergency services
              immediately.
            </p>
          </AnimatedReveal>

          <AnimatedReveal>
            <p className="text-sm text-muted-foreground italic">
              This page describes our commitments. A complete legal privacy policy is being prepared and
              will replace this summary.
            </p>
          </AnimatedReveal>
        </div>
      </section>
    </div>
  );
}
