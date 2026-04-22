import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { PAGE_SEO } from "@/lib/seo";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-6">
      <SEO seo={PAGE_SEO.notFound} />
      <div className="max-w-md text-center">
        <p className="text-sm uppercase tracking-widest text-primary font-semibold mb-4">
          404
        </p>
        <h1 className="text-3xl md:text-4xl font-serif font-bold mb-4">
          Page not found
        </h1>
        <p className="text-muted-foreground mb-8">
          The page you were looking for doesn't exist or has moved.
        </p>
        <Link href="/">
          <Button className="rounded-full">Back to home</Button>
        </Link>
      </div>
    </div>
  );
}
