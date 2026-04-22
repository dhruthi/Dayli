// Plain-JS mirror of src/lib/seo.ts + src/lib/translations.ts data,
// consumed by scripts/prerender.mjs at build time.
// Keep the per-locale TITLES/DESCRIPTIONS in sync with src/lib/translations.ts.

export const SITE_URL =
  (process.env.VITE_SITE_URL || process.env.SITE_URL || "https://dayli.ai").replace(/\/$/, "");

export const DEFAULT_OG_IMAGE = `${SITE_URL}/opengraph.png`;

export const LOCALES = ["en", "hi", "te", "ar"];
export const DEFAULT_LOCALE = "en";

export const LOCALE_META = {
  en: { htmlLang: "en", hreflang: "en", dir: "ltr" },
  hi: { htmlLang: "hi", hreflang: "hi-IN", dir: "ltr" },
  te: { htmlLang: "te", hreflang: "te-IN", dir: "ltr" },
  ar: { htmlLang: "ar", hreflang: "ar", dir: "rtl" },
};

export function localizedPath(locale, basePath) {
  const base = basePath.startsWith("/") ? basePath : `/${basePath}`;
  if (locale === DEFAULT_LOCALE) return base;
  if (base === "/") return `/${locale}`;
  return `/${locale}${base}`;
}

// Per-locale SEO title/description per page key.
// MUST mirror the seoTitle/seoDescription in src/lib/translations.ts.
const TITLE_DESC = {
  en: {
    home: { t: "dayli.ai — AI Climate Health Copilot for Women & Children", d: "dayli is an AI-powered Climate Health Copilot for women and children. Real-time, personalized guidance on WhatsApp — combining climate data, health knowledge, and AI." },
    product: { t: "How dayli Works — Climate, Health & AI on WhatsApp | dayli.ai", d: "dayli combines climate data, health knowledge, and AI personalization to deliver real-time, actionable daily guidance on WhatsApp. See how it works." },
    clinics: { t: "dayli for Clinics — Reduce No-Shows, Improve Outcomes | dayli.ai", d: "dayli helps clinics reduce missed appointments during extreme weather, keep patients engaged between visits, and identify high-risk patients early." },
    pharma: { t: "dayli for Pharma — Climate-Aware Adherence | dayli.ai", d: "Patients drop adherence during heatwaves and environmental stress. dayli ensures continuous engagement when patients need it most." },
    about: { t: "About dayli — A Daily Decision Layer for Health | dayli.ai", d: "dayli's mission is to make healthcare adaptive, personalized, and proactive in a changing climate. Learn about our vision and why now." },
    privacy: { t: "Privacy at dayli — Your Data, Your Control | dayli.ai", d: "How dayli collects, uses, and protects your information. Your data is never sold, and individual health data is never shared without your explicit consent." },
  },
  hi: {
    home: { t: "dayli.ai — महिलाओं और बच्चों के लिए AI क्लाइमेट हेल्थ कोपायलट", d: "dayli महिलाओं और बच्चों के लिए AI-संचालित क्लाइमेट हेल्थ कोपायलट है। WhatsApp पर रियल-टाइम, व्यक्तिगत मार्गदर्शन — जलवायु डेटा, स्वास्थ्य ज्ञान और AI का संगम।" },
    product: { t: "dayli कैसे काम करता है — WhatsApp पर जलवायु, स्वास्थ्य और AI | dayli.ai", d: "dayli जलवायु डेटा, स्वास्थ्य ज्ञान और AI निजीकरण को जोड़कर WhatsApp पर रियल-टाइम, कारगर दैनिक मार्गदर्शन देता है।" },
    clinics: { t: "क्लिनिकों के लिए dayli — कम मिस्ड अपॉइंटमेंट, बेहतर परिणाम | dayli.ai", d: "dayli क्लिनिकों को अत्यधिक मौसम के दौरान छूटी अपॉइंटमेंट कम करने, मरीजों को विज़िट के बीच जोड़े रखने और उच्च-जोखिम वाले मरीज़ों की जल्दी पहचान में मदद करता है।" },
    pharma: { t: "फार्मा के लिए dayli — जलवायु-संवेदी पालन | dayli.ai", d: "हीटवेव और पर्यावरणीय तनाव में मरीज़ अनुपालन छोड़ देते हैं। dayli तब निरंतर जुड़ाव सुनिश्चित करता है जब मरीज़ों को इसकी सबसे ज़्यादा ज़रूरत होती है।" },
    about: { t: "dayli के बारे में — स्वास्थ्य के लिए दैनिक निर्णय परत | dayli.ai", d: "dayli का मिशन है बदलती जलवायु में स्वास्थ्य देखभाल को अनुकूल, व्यक्तिगत और प्रोएक्टिव बनाना। हमारा दृष्टिकोण और 'अभी क्यों' जानें।" },
    privacy: { t: "dayli पर गोपनीयता — आपका डेटा, आपका नियंत्रण | dayli.ai", d: "dayli आपकी जानकारी कैसे एकत्र, उपयोग और सुरक्षित करता है। आपका डेटा कभी नहीं बेचा जाता और व्यक्तिगत स्वास्थ्य डेटा बिना आपकी स्पष्ट सहमति के साझा नहीं होता।" },
  },
  te: {
    home: { t: "dayli.ai — మహిళలు మరియు పిల్లల కోసం AI క్లైమేట్ హెల్త్ కోపైలట్", d: "dayli అనేది మహిళలు మరియు పిల్లల కోసం AI-ఆధారిత క్లైమేట్ హెల్త్ కోపైలట్. WhatsApp ద్వారా రియల్-టైమ్, వ్యక్తిగత మార్గదర్శనం — వాతావరణ డేటా, ఆరోగ్య పరిజ్ఞానం మరియు AI కలయిక." },
    product: { t: "dayli ఎలా పనిచేస్తుంది — WhatsAppలో వాతావరణం, ఆరోగ్యం & AI | dayli.ai", d: "dayli వాతావరణ డేటా, ఆరోగ్య పరిజ్ఞానం, AI వ్యక్తీకరణను కలిపి WhatsApp ద్వారా రియల్-టైమ్, ఉపయోగపడే రోజువారీ మార్గదర్శనం అందిస్తుంది." },
    clinics: { t: "క్లినిక్‌ల కోసం dayli — తక్కువ నో-షోలు, మెరుగైన ఫలితాలు | dayli.ai", d: "తీవ్ర వాతావరణ సమయాల్లో మిస్ అయిన అపాయింట్‌మెంట్‌లను తగ్గించడానికి, విజిట్‌ల మధ్య రోగులను నిమగ్నం చేయడానికి, అధిక-ప్రమాద రోగులను ముందుగా గుర్తించడానికి dayli క్లినిక్‌లకు సహాయపడుతుంది." },
    pharma: { t: "ఫార్మా కోసం dayli — వాతావరణ-అవగాహన పాటింపు | dayli.ai", d: "హీట్‌వేవ్‌లు, పర్యావరణ ఒత్తిడి సమయాల్లో రోగులు పాటింపును వదిలేస్తారు. dayli అత్యంత అవసరమైన సమయంలో నిరంతర నిమగ్నతను నిర్ధారిస్తుంది." },
    about: { t: "dayli గురించి — ఆరోగ్యానికి రోజువారీ నిర్ణయ పొర | dayli.ai", d: "మారుతున్న వాతావరణంలో ఆరోగ్య సంరక్షణను అనుకూలం, వ్యక్తిగతం, ముందస్తుగా చేయడమే dayli లక్ష్యం. మా దృష్టి, ‘ఇప్పుడు ఎందుకు’ తెలుసుకోండి." },
    privacy: { t: "dayli గోప్యత — మీ డేటా, మీ నియంత్రణ | dayli.ai", d: "dayli మీ సమాచారాన్ని ఎలా సేకరిస్తుంది, ఉపయోగిస్తుంది, రక్షిస్తుంది. మీ డేటా ఎప్పుడూ అమ్మబడదు, మీ స్పష్టమైన అనుమతి లేకుండా వ్యక్తిగత ఆరోగ్య డేటా పంచుకోబడదు." },
  },
  ar: {
    home: { t: "dayli.ai — مساعد صحي مناخي بالذكاء الاصطناعي للنساء والأطفال", d: "dayli مساعد صحي مناخي مدعوم بالذكاء الاصطناعي للنساء والأطفال. إرشاد فوري ومخصّص عبر واتساب — يجمع بيانات المناخ والمعرفة الصحية والذكاء الاصطناعي." },
    product: { t: "كيف يعمل dayli — المناخ والصحة والذكاء الاصطناعي على واتساب | dayli.ai", d: "يجمع dayli بيانات المناخ والمعرفة الصحية وتخصيص الذكاء الاصطناعي ليقدّم إرشادًا يوميًا فوريًا وقابلًا للتنفيذ عبر واتساب." },
    clinics: { t: "dayli للعيادات — تقليل الغياب وتحسين النتائج | dayli.ai", d: "يساعد dayli العيادات على تقليل المواعيد الفائتة خلال الطقس الشديد، وإبقاء المرضى منخرطين بين الزيارات، والتعرّف مبكرًا على المرضى الأكثر عرضة للخطر." },
    pharma: { t: "dayli لشركات الأدوية — التزام واعٍ بالمناخ | dayli.ai", d: "يتراجع التزام المرضى خلال موجات الحر والإجهاد البيئي. يضمن dayli انخراطًا مستمرًا حين يحتاج المرضى ذلك أكثر." },
    about: { t: "عن dayli — طبقة قرار يومية للصحة | dayli.ai", d: "مهمة dayli جعل الرعاية الصحية متكيّفة ومخصّصة واستباقية في مناخ متغيّر. تعرّف على رؤيتنا ولماذا الآن." },
    privacy: { t: "الخصوصية في dayli — بياناتك تحت سيطرتك | dayli.ai", d: "كيف يجمع dayli بياناتك ويستخدمها ويحميها. لا تُباع بياناتك أبدًا، ولا تُشارك البيانات الصحية الفردية دون موافقتك الصريحة." },
  },
};

export const PAGE_KEYS = ["home", "product", "clinics", "pharma", "about", "privacy"];
const PAGE_BASE_PATH = {
  home: "/", product: "/product", clinics: "/clinics", pharma: "/pharma", about: "/about", privacy: "/privacy",
};

const ORG = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "dayli.ai",
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.svg`,
  description: "dayli is an AI-powered Climate Health Copilot for women and children, delivering real-time personalized guidance on WhatsApp.",
  sameAs: [],
};

const WEBSITE = {
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: "dayli.ai",
  publisher: { "@id": `${SITE_URL}/#organization` },
  inLanguage: LOCALES.map((l) => LOCALE_META[l].hreflang),
};

function buildAlternates(basePath) {
  const alts = LOCALES.map((l) => ({
    hreflang: LOCALE_META[l].hreflang,
    href: `${SITE_URL}${localizedPath(l, basePath)}`,
  }));
  alts.push({ hreflang: "x-default", href: `${SITE_URL}${localizedPath(DEFAULT_LOCALE, basePath)}` });
  return alts;
}

function jsonLdFor(pageKey, locale) {
  const lang = LOCALE_META[locale].hreflang;
  const url = `${SITE_URL}${localizedPath(locale, PAGE_BASE_PATH[pageKey])}`;
  switch (pageKey) {
    case "home":
      return [
        ORG,
        WEBSITE,
        {
          "@type": "WebPage",
          "@id": `${url}#webpage`,
          url,
          inLanguage: lang,
          name: TITLE_DESC[locale].home.t,
          isPartOf: { "@id": `${SITE_URL}/#website` },
          about: { "@id": `${SITE_URL}/#organization` },
          primaryImageOfPage: { "@type": "ImageObject", url: DEFAULT_OG_IMAGE },
        },
      ];
    case "product":
      return [
        {
          "@type": "Service",
          name: "dayli — Climate Health Copilot",
          serviceType: "Climate-aware health guidance",
          provider: { "@id": `${SITE_URL}/#organization` },
          areaServed: "IN",
          inLanguage: lang,
          audience: { "@type": "PeopleAudience", audienceType: "Pregnant women and caregivers of young children" },
          availableChannel: { "@type": "ServiceChannel", name: "WhatsApp", serviceUrl: "https://wa.me/" },
        },
      ];
    case "clinics":
      return [
        {
          "@type": "Service",
          name: "dayli for Clinics",
          serviceType: "Patient engagement and adherence",
          provider: { "@id": `${SITE_URL}/#organization` },
          inLanguage: lang,
          audience: { "@type": "BusinessAudience", audienceType: "Maternal and pediatric clinics" },
        },
      ];
    case "pharma":
      return [
        {
          "@type": "Service",
          name: "dayli for Pharma",
          serviceType: "Medication adherence and patient engagement",
          provider: { "@id": `${SITE_URL}/#organization` },
          inLanguage: lang,
          audience: { "@type": "BusinessAudience", audienceType: "Pharmaceutical and life sciences companies" },
        },
      ];
    case "about":
      return [
        { "@type": "AboutPage", url, name: "About dayli", inLanguage: lang, about: { "@id": `${SITE_URL}/#organization` } },
        ORG,
      ];
    case "privacy":
      return [
        { "@type": "WebPage", url, name: "Privacy at dayli", inLanguage: lang, isPartOf: { "@id": `${SITE_URL}/#website` } },
      ];
    default:
      return undefined;
  }
}

export const PAGES = [];
for (const locale of LOCALES) {
  const meta = LOCALE_META[locale];
  for (const pageKey of PAGE_KEYS) {
    const basePath = PAGE_BASE_PATH[pageKey];
    const path = localizedPath(locale, basePath);
    const td = TITLE_DESC[locale][pageKey];
    PAGES.push({
      pageKey,
      locale,
      htmlLang: meta.htmlLang,
      dir: meta.dir,
      basePath,
      path,
      title: td.t,
      description: td.d,
      jsonLd: jsonLdFor(pageKey, locale),
      alternates: buildAlternates(basePath),
    });
  }
}

PAGES.push({
  pageKey: "notFound",
  locale: DEFAULT_LOCALE,
  htmlLang: LOCALE_META[DEFAULT_LOCALE].htmlLang,
  dir: LOCALE_META[DEFAULT_LOCALE].dir,
  basePath: "/404",
  path: "/404",
  title: "Page not found — dayli.ai",
  description: "The page you were looking for doesn't exist. Return to dayli.ai to learn how our AI Climate Health Copilot supports women and children.",
  noindex: true,
  alternates: undefined,
  jsonLd: undefined,
});

export default { SITE_URL, DEFAULT_OG_IMAGE, PAGES, LOCALES, LOCALE_META, DEFAULT_LOCALE };
