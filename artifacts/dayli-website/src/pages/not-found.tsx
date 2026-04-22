import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { getPageSeo } from "@/lib/seo";
import { useLocale } from "@/hooks/use-locale";

export default function NotFound() {
  const { locale, t, href } = useLocale();
  const c = t.notFound;
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-6">
      <SEO seo={getPageSeo("notFound", locale)} />
      <div className="max-w-md text-center">
        <p className="text-sm uppercase tracking-widest text-primary font-semibold mb-4">{c.eyebrow}</p>
        <h1 className="text-3xl md:text-4xl font-serif font-bold mb-4">{c.h1}</h1>
        <p className="text-muted-foreground mb-8">{c.body}</p>
        <Link href={href("/")}>
          <Button className="rounded-full">{c.cta}</Button>
        </Link>
      </div>
    </div>
  );
}
