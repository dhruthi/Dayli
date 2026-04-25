import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout/Layout";
import NotFound from "@/pages/not-found";

import Home from "@/pages/Home";
import Product from "@/pages/Product";
import Clinics from "@/pages/Clinics";
import Pharma from "@/pages/Pharma";
import About from "@/pages/About";
import Privacy from "@/pages/Privacy";
import AdminLeads from "@/pages/AdminLeads";
import { LOCALES, DEFAULT_LOCALE } from "@/lib/i18n";

const queryClient = new QueryClient();

const PAGE_ROUTES: { path: string; component: React.ComponentType }[] = [
  { path: "/", component: Home },
  { path: "/product", component: Product },
  { path: "/clinics", component: Clinics },
  { path: "/pharma", component: Pharma },
  { path: "/about", component: About },
  { path: "/privacy", component: Privacy },
];

function Router() {
  return (
    <Switch>
      {PAGE_ROUTES.map((r) => (
        <Route key={`en-${r.path}`} path={r.path} component={r.component} />
      ))}
      {LOCALES.filter((l) => l !== DEFAULT_LOCALE).flatMap((locale) =>
        PAGE_ROUTES.map((r) => {
          const path = r.path === "/" ? `/${locale}` : `/${locale}${r.path}`;
          return <Route key={`${locale}-${r.path}`} path={path} component={r.component} />;
        }),
      )}
      <Route path="/admin/leads" component={AdminLeads} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App({ ssrPath }: { ssrPath?: string } = {}) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter
          base={import.meta.env.BASE_URL.replace(/\/$/, "")}
          ssrPath={ssrPath}
        >
          <Layout>
            <Router />
          </Layout>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
