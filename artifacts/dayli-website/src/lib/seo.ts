export const SITE_URL =
  ((import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "")) ||
  "https://dayli.ai";

export const SITE_NAME = "dayli.ai";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/opengraph.png`;

export interface PageSeo {
  path: string;
  title: string;
  description: string;
  ogImage?: string;
  noindex?: boolean;
  jsonLd?: object[];
}

export const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "What is dayli?",
    a: "dayli is an AI-powered Climate Health Copilot for women and children. It combines local climate data with personal health context to deliver daily, actionable guidance over WhatsApp.",
  },
  {
    q: "Is dayli a medical device?",
    a: "No. dayli is not a medical device and does not replace professional medical advice. For any medical emergency, contact your local healthcare provider or emergency services immediately.",
  },
  {
    q: "How does dayli use my data?",
    a: "Only to provide safe, personalized guidance. We combine local climate signals with your personal context to send relevant alerts, hydration reminders, and check-ins. Your data is never sold or used for advertising, and individual health data is never shared with clinics or pharma partners without your explicit consent.",
  },
  {
    q: "What languages does dayli support?",
    a: "dayli currently supports English, Hindi (हिंदी), Telugu (తెలుగు), and Arabic (العربية).",
  },
  {
    q: "How much does dayli cost?",
    a: "dayli is free to use. There is no app to download — onboarding takes under a minute on WhatsApp.",
  },
  {
    q: "Where does dayli get its climate data from?",
    a: "dayli uses WHO heat thresholds, the India Meteorological Department (IMD), and OpenWeather to monitor local heat and environmental risk in real time.",
  },
  {
    q: "Who is dayli for?",
    a: "dayli is built for pregnant women, mothers, and caregivers of young children — populations that are most vulnerable to extreme heat and climate-driven health risks.",
  },
];

const ORG = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "dayli.ai",
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.svg`,
  description:
    "dayli is an AI-powered Climate Health Copilot for women and children, delivering real-time personalized guidance on WhatsApp.",
  sameAs: [] as string[],
};

const WEBSITE = {
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: SITE_NAME,
  publisher: { "@id": `${SITE_URL}/#organization` },
  inLanguage: ["en", "hi", "te", "ar"],
};

const FAQ_PAGE = {
  "@type": "FAQPage",
  "@id": `${SITE_URL}/#faq`,
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

function breadcrumb(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export const PAGE_SEO: Record<string, PageSeo> = {
  home: {
    path: "/",
    title: "dayli.ai — AI Climate Health Copilot for Women & Children",
    description:
      "dayli is an AI-powered Climate Health Copilot for women and children. Real-time, personalized guidance on WhatsApp — combining climate data, health knowledge, and AI.",
    jsonLd: [
      ORG,
      WEBSITE,
      FAQ_PAGE,
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}/#webpage`,
        url: `${SITE_URL}/`,
        name: "dayli.ai — AI Climate Health Copilot",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#organization` },
        primaryImageOfPage: { "@type": "ImageObject", url: DEFAULT_OG_IMAGE },
      },
    ],
  },
  product: {
    path: "/product",
    title: "How dayli Works — Climate, Health & AI on WhatsApp | dayli.ai",
    description:
      "dayli combines climate data, health knowledge, and AI personalization to deliver real-time, actionable daily guidance on WhatsApp. See how it works.",
    jsonLd: [
      {
        "@type": "Service",
        name: "dayli — Climate Health Copilot",
        serviceType: "Climate-aware health guidance",
        provider: { "@id": `${SITE_URL}/#organization` },
        areaServed: "IN",
        audience: {
          "@type": "PeopleAudience",
          audienceType: "Pregnant women and caregivers of young children",
        },
        availableChannel: {
          "@type": "ServiceChannel",
          name: "WhatsApp",
          serviceUrl: "https://wa.me/",
        },
      },
      {
        "@type": "HowTo",
        name: "How dayli delivers daily climate-aware health guidance",
        step: [
          { "@type": "HowToStep", name: "Understands you", text: "dayli learns your pregnancy stage or your child's age, and your daily location conditions." },
          { "@type": "HowToStep", name: "Monitors climate risk", text: "dayli tracks heatwaves, temperature spikes, and environmental stress in real time." },
          { "@type": "HowToStep", name: "Guides you daily", text: "dayli sends hydration reminders, safe outdoor timing, alerts, and check-ins on WhatsApp." },
        ],
      },
      breadcrumb([
        { name: "Home", path: "/" },
        { name: "Product", path: "/product" },
      ]),
    ],
  },
  clinics: {
    path: "/clinics",
    title: "dayli for Clinics — Reduce No-Shows, Improve Outcomes | dayli.ai",
    description:
      "dayli helps clinics reduce missed appointments during extreme weather, keep patients engaged between visits, and identify high-risk patients early.",
    jsonLd: [
      {
        "@type": "Service",
        name: "dayli for Clinics",
        serviceType: "Patient engagement and adherence",
        provider: { "@id": `${SITE_URL}/#organization` },
        audience: { "@type": "BusinessAudience", audienceType: "Maternal and pediatric clinics" },
      },
      breadcrumb([
        { name: "Home", path: "/" },
        { name: "For Clinics", path: "/clinics" },
      ]),
    ],
  },
  pharma: {
    path: "/pharma",
    title: "dayli for Pharma — Climate-Aware Adherence | dayli.ai",
    description:
      "Patients drop adherence during heatwaves and environmental stress. dayli ensures continuous engagement when patients need it most.",
    jsonLd: [
      {
        "@type": "Service",
        name: "dayli for Pharma",
        serviceType: "Medication adherence and patient engagement",
        provider: { "@id": `${SITE_URL}/#organization` },
        audience: { "@type": "BusinessAudience", audienceType: "Pharmaceutical and life sciences companies" },
      },
      breadcrumb([
        { name: "Home", path: "/" },
        { name: "For Pharma", path: "/pharma" },
      ]),
    ],
  },
  about: {
    path: "/about",
    title: "About dayli — A Daily Decision Layer for Health | dayli.ai",
    description:
      "dayli's mission is to make healthcare adaptive, personalized, and proactive in a changing climate. Learn about our vision and why now.",
    jsonLd: [
      {
        "@type": "AboutPage",
        url: `${SITE_URL}/about`,
        name: "About dayli",
        about: { "@id": `${SITE_URL}/#organization` },
      },
      ORG,
      breadcrumb([
        { name: "Home", path: "/" },
        { name: "About", path: "/about" },
      ]),
    ],
  },
  privacy: {
    path: "/privacy",
    title: "Privacy at dayli — Your Data, Your Control | dayli.ai",
    description:
      "How dayli collects, uses, and protects your information. Your data is never sold, and individual health data is never shared without your explicit consent.",
    jsonLd: [
      {
        "@type": "WebPage",
        url: `${SITE_URL}/privacy`,
        name: "Privacy at dayli",
        isPartOf: { "@id": `${SITE_URL}/#website` },
      },
      breadcrumb([
        { name: "Home", path: "/" },
        { name: "Privacy", path: "/privacy" },
      ]),
    ],
  },
  notFound: {
    path: "/404",
    title: "Page not found — dayli.ai",
    description: "The page you were looking for doesn't exist.",
    noindex: true,
  },
};

export function buildJsonLdGraph(jsonLd?: object[]): string | null {
  if (!jsonLd || jsonLd.length === 0) return null;
  return JSON.stringify({ "@context": "https://schema.org", "@graph": jsonLd });
}
