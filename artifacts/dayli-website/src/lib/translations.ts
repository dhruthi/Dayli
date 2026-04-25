import type { Locale } from "./i18n";

export interface PageContent {
  // Layout
  layout: {
    nav: { product: string; clinics: string; pharma: string; about: string };
    ctaWhatsapp: string;
    whatsappPending: string;
    whatsappSoon: string;
    languageMenuLabel: string;
    languageBanner: { prompt: string; accept: string; dismiss: string };
    footer: {
      tagline: string;
      solutions: string;
      company: string;
      getStarted: string;
      product: string;
      clinics: string;
      pharma: string;
      about: string;
      privacy: string;
      connect: string;
      copyright: (year: number) => string;
      disclaimer: string;
    };
  };

  // Reusable CTA microcopy
  ctaMicrocopy: string;

  // FAQ items
  faq: { q: string; a: string }[];
  faqSection: { eyebrow: string; heading: string; intro: string };

  // Home
  home: {
    seoTitle: string;
    seoDescription: string;
    badge: string;
    h1: string;
    p1: string;
    p2: string;
    ctaPrimary: string;
    ctaSecondary: string;
    tagline: string;
    chatHero: string;
    chatDemo: {
      title: string;
      subtitle: string;
      introHeading: string;
      introBody: string;
      startButton: string;
      loading: string;
      retry: string;
      errorBody: string;
      examplesLabel: string;
      examplePrompts: string[];
      inputPlaceholder: string;
      inputDisabledPlaceholder: string;
      sendLabel: string;
      formLabel: string;
      disclaimer: string;
      sourceGps: string;
      sourceIp: string;
      locationUnknown: string;
      heatRiskLabels: { low: string; moderate: string; high: string; very_high: string; extreme: string };
      aqiLabels: { good: string; moderate: string; unhealthy_sensitive: string; unhealthy: string; very_unhealthy: string; hazardous: string; unknown: string };
    };
    trust: { label: string; items: string[] };
    definition: { heading: string; body: string; bodyStrong: string };
    problem: { eyebrow: string; heading: string; intro: string; cardHeading: string; bullet1: string; bullet2: string; cardBody: string };
    solution: { eyebrow: string; heading: string; intro: string; bullets: string[] };
    how: { heading: string; intro: string; steps: { title: string; body: string }[] };
    useCase: { tagline: string; quote: string; body: string; disclaimer: string; pullQuote: string; chat: { intro: string; checkin: string; options: string[]; reply: string; clinic: string } };
    features: { heading: string; items: { title: string; body: string }[]; trustHeading: string; trustItems: { title: string; sub?: string }[]; privacyLink: string };
    cta: { heading: string; sub: string; button: string };
  };

  // Product
  product: {
    seoTitle: string;
    seoDescription: string;
    h1: string;
    intro: string;
    layers: { title: string; body: string }[];
    realtime: {
      heading: string;
      intro: string;
      steps: { title: string; body: string }[];
      cta: string;
      chat: { msg1: string; checkin: string; options: string[]; reply: string; rest: string };
    };
  };

  // Clinics
  clinics: {
    seoTitle: string;
    seoDescription: string;
    badge: string;
    h1: string;
    intro: string;
    howHeading: string;
    steps: { title: string; body: string }[];
    benefitsHeading: string;
    benefits: string[];
    formHeading: string;
    formIntro: string;
    formNotice: string;
    fields: {
      name: string; namePh: string;
      role: string; rolePh: string; roleOptions: string[];
      clinic: string; clinicPh: string;
      patients: string; patientsPh: string;
      city: string; cityPh: string;
      email: string; emailPh: string;
      message: string; messagePh: string;
    };
    submit: string;
    submitting: string;
    consent: string;
    toastSuccessTitle: string;
    toastSuccessBody: string;
    toastErrorTitle: string;
    toastErrorBody: string;
  };

  // Pharma
  pharma: {
    seoTitle: string;
    seoDescription: string;
    badge: string;
    h1: string;
    intro: string;
    problemHeading: string;
    problemIntro: string;
    problemBullets: string[];
    solutionHeading: string;
    solutionIntro: string;
    solutionBullets: string[];
    useCasesHeading: string;
    useCases: string[];
    formHeading: string;
    formIntro: string;
    formNotice: string;
    fields: {
      name: string; namePh: string;
      company: string; companyPh: string;
      therapeutic: string; therapeuticPh: string; therapeuticOptions: string[];
      email: string; emailPh: string;
      message: string; messagePh: string;
    };
    submit: string;
    submitting: string;
    consent: string;
    toastSuccessTitle: string;
    toastSuccessBody: string;
    toastErrorTitle: string;
    toastErrorBody: string;
  };

  // About
  about: {
    seoTitle: string;
    seoDescription: string;
    h1: string;
    intro: string;
    missionHeading: string;
    mission: string;
    visionHeading: string;
    vision: string;
    whyNowHeading: string;
    whyNow: { title: string; body: string }[];
  };

  // Privacy
  privacy: {
    seoTitle: string;
    seoDescription: string;
    badge: string;
    h1: string;
    intro: string;
    sections: { heading: string; body?: string; bullets?: string[] }[];
    note: string;
  };

  // 404
  notFound: {
    seoTitle: string;
    seoDescription: string;
    eyebrow: string;
    h1: string;
    body: string;
    cta: string;
  };
}

const en: PageContent = {
  layout: {
    nav: { product: "Product", clinics: "For Clinics", pharma: "For Pharma", about: "About" },
    ctaWhatsapp: "Start on WhatsApp",
    whatsappPending: "WhatsApp setup in progress — leave your details below and we'll reach out as soon as it's live.",
    whatsappSoon: "launching soon",
    languageMenuLabel: "Language",
    languageBanner: {
      prompt: "Would you prefer to view this site in English?",
      accept: "Continue in English",
      dismiss: "No thanks",
    },
    footer: {
      tagline: "A daily decision layer for health in a changing climate.",
      solutions: "Solutions",
      company: "Company",
      getStarted: "Get Started",
      product: "Product",
      clinics: "For Clinics",
      pharma: "For Pharma",
      about: "About Us",
      privacy: "Privacy",
      connect: "Connect on WhatsApp",
      copyright: (year) => `© ${year} dayli.ai. All rights reserved.`,
      disclaimer: "Not a medical device. Always consult a healthcare professional for medical emergencies.",
    },
  },
  ctaMicrocopy: "Free · No app to download · Onboard in under a minute · Your data stays private.",
  faq: [
    { q: "What is dayli?", a: "dayli is an AI-powered Climate Health Copilot for women and children. It combines local climate data with personal health context to deliver daily, actionable guidance over WhatsApp." },
    { q: "Is dayli a medical device?", a: "No. dayli is not a medical device and does not replace professional medical advice. For any medical emergency, contact your local healthcare provider or emergency services immediately." },
    { q: "How does dayli use my data?", a: "Only to provide safe, personalized guidance. We combine local climate signals with your personal context to send relevant alerts, hydration reminders, and check-ins. Your data is never sold or used for advertising, and individual health data is never shared with clinics or pharma partners without your explicit consent." },
    { q: "What languages does dayli support?", a: "dayli currently supports English, Hindi (हिंदी), Telugu (తెలుగు), and Arabic (العربية)." },
    { q: "How much does dayli cost?", a: "dayli is free to use. There is no app to download — onboarding takes under a minute on WhatsApp." },
    { q: "Where does dayli get its climate data from?", a: "dayli uses WHO heat thresholds, the India Meteorological Department (IMD), and OpenWeather to monitor local heat and environmental risk in real time." },
    { q: "Who is dayli for?", a: "dayli is built for pregnant women, mothers, and caregivers of young children — populations that are most vulnerable to extreme heat and climate-driven health risks." },
  ],
  faqSection: {
    eyebrow: "Frequently Asked",
    heading: "Questions about dayli",
    intro: "Short, direct answers about how dayli works, what it costs, and how we handle your data.",
  },
  home: {
    seoTitle: "dayli.ai — AI Climate Health Copilot for Women & Children",
    seoDescription: "dayli is an AI-powered Climate Health Copilot for women and children. Real-time, personalized guidance on WhatsApp — combining climate data, health knowledge, and AI.",
    badge: "AI-powered Climate Health Copilot",
    h1: "Your daily health, powered by climate intelligence",
    p1: "AI that helps women and children stay safe, healthy, and one step ahead of extreme heat and climate risks.",
    p2: "A WhatsApp companion — not an app you download.",
    ctaPrimary: "Start on WhatsApp",
    ctaSecondary: "For Clinics & Partners",
    tagline: "Not a chatbot. Not a wellness app. A daily decision layer for health.",
    chatHero: "Tomorrow will be extremely hot (45°C). Ensure you drink water frequently and stay indoors between 12-4 PM.",
    chatDemo: {
      title: "dayli copilot",
      subtitle: "Live demo — climate-aware health guidance",
      introHeading: "Try a live conversation",
      introBody: "Share your location and ask a question. dayli will use today's local weather and air quality to tailor practical, plain-language guidance.",
      startButton: "Use my location",
      loading: "Reading local weather and air quality…",
      retry: "Try again",
      errorBody: "We couldn't reach the local conditions service. Please try again.",
      examplesLabel: "Try one of these:",
      examplePrompts: [
        "My child has asthma. Is it safe to play outside this afternoon?",
        "I have high blood pressure. Any heat tips for today?",
        "Is the air clean enough for a morning walk?",
      ],
      inputPlaceholder: "Ask about today's weather, air quality, or your symptoms…",
      inputDisabledPlaceholder: "Share your location to start the demo",
      sendLabel: "Send",
      formLabel: "Chat with dayli",
      disclaimer: "Demo only. Educational guidance — not a medical diagnosis. Call your local emergency number for chest pain, difficulty breathing, or other emergencies.",
      sourceGps: "from your device",
      sourceIp: "estimated from your network",
      locationUnknown: "Your area",
      heatRiskLabels: {
        low: "Low heat",
        moderate: "Moderate heat",
        high: "High heat",
        very_high: "Very high heat",
        extreme: "Extreme heat",
      },
      aqiLabels: {
        good: "Good air",
        moderate: "Moderate air",
        unhealthy_sensitive: "Unhealthy for sensitive groups",
        unhealthy: "Unhealthy air",
        very_unhealthy: "Very unhealthy air",
        hazardous: "Hazardous air",
        unknown: "Air quality unavailable",
      },
    },
    trust: {
      label: "Built with climate and health expertise",
      items: [
        "Climate data: WHO heat thresholds, IMD & OpenWeather",
        "Piloting with maternal & pediatric clinics in Hyderabad",
        "Built on WhatsApp Business API",
      ],
    },
    definition: {
      heading: "What is dayli?",
      bodyStrong: "dayli",
      body: " is an AI-powered Climate Health Copilot for women and children. It combines local climate data, health knowledge, and AI personalization to deliver real-time, actionable guidance on WhatsApp — helping pregnant women, mothers, and caregivers stay safe during heatwaves and other climate-driven health risks. dayli is free, requires no app download, and supports English, Hindi, Telugu, and Arabic.",
    },
    problem: {
      eyebrow: "The Problem",
      heading: "Climate is already impacting your health",
      intro: "Today, no system connects climate to your daily health decisions.",
      cardHeading: "Extreme heat increases risks for:",
      bullet1: "Pregnant women",
      bullet2: "Young children",
      cardBody: "Dehydration, fatigue, and missed care lead to avoidable complications.",
    },
    solution: {
      eyebrow: "The Solution",
      heading: "Meet dayli",
      intro: "Your AI health companion that adapts to your environment in real time.",
      bullets: [
        "Tracks local weather and heat conditions",
        "Understands your health needs",
        "Guides you daily with simple, actionable advice",
      ],
    },
    how: {
      heading: "How It Works",
      intro: "Simple, actionable, real-time guidance.",
      steps: [
        { title: "Understands You", body: "Knows your pregnancy stage or child's age, and your daily location conditions." },
        { title: "Monitors Climate Risk", body: "Tracks heatwaves, temperature spikes, and environmental stress in real-time." },
        { title: "Guides You Daily", body: "Provides hydration reminders, safe outdoor timing, alerts, and check-ins." },
      ],
    },
    useCase: {
      tagline: "Hyderabad Heat",
      quote: "\"Tomorrow: 45°C in your area\"",
      body: "dayli will alert you in advance, recommend hydration and rest, suggest avoiding peak heat hours (12–4 PM), and check on your symptoms.",
      disclaimer: "dayli provides supportive guidance, not medical diagnosis. For emergencies, contact your local healthcare provider.",
      pullQuote: "\"Simple actions. Real impact.\"",
      chat: {
        intro: "Tomorrow will be extremely hot (45°C). Ensure you drink water frequently and stay indoors between 12-4 PM.",
        checkin: "How are you feeling today?",
        options: ["Fine", "Tired", "Dizzy"],
        reply: "Tired",
        clinic: "Please rest and consider visiting a clinic nearby. Would you like me to find one?",
      },
    },
    features: {
      heading: "Product Features",
      items: [
        { title: "Daily Health Alerts", body: "Know when heat or weather conditions can affect you" },
        { title: "Personalized Guidance", body: "Advice tailored to you—not generic recommendations" },
        { title: "Daily Check-ins", body: "Track how you feel and get help when needed" },
        { title: "Clinic Support (Optional)", body: "Stay connected with your healthcare provider" },
      ],
      trustHeading: "Built for real-world conditions",
      trustItems: [
        { title: "Works on WhatsApp (no app needed)" },
        { title: "Designed for low data usage" },
        { title: "Supports multiple languages", sub: "English · हिंदी · తెలుగు · العربية" },
        { title: "Your data stays private", sub: "Never sold." },
      ],
      privacyLink: "Read our approach",
    },
    cta: {
      heading: "Take control of your health—every day",
      sub: "Prevent problems before they happen.",
      button: "Start with dayli on WhatsApp",
    },
  },
  product: {
    seoTitle: "How dayli Works — Climate, Health & AI on WhatsApp | dayli.ai",
    seoDescription: "dayli combines climate data, health knowledge, and AI personalization to deliver real-time, actionable daily guidance on WhatsApp. See how it works.",
    h1: "How dayli Works",
    intro: "dayli combines Climate data + Health knowledge + AI personalization to deliver real-time, actionable guidance for daily life.",
    layers: [
      { title: "Climate Awareness", body: "Tracks heat and environmental risks in your area." },
      { title: "Health Intelligence", body: "Understands your stage (pregnancy / child care)." },
      { title: "AI Copilot", body: "Delivers simple daily actions to keep you safe." },
    ],
    realtime: {
      heading: "Real-time guidance when it matters most",
      intro: "Daily health guidance powered by climate intelligence. Not a chatbot. Not a wellness app. A daily decision layer for health in a changing climate.",
      steps: [
        { title: "Morning Message", body: "Proactive alerts based on the day's forecast." },
        { title: "Check-in", body: "Simple check-ins to monitor your condition." },
        { title: "Risk Response", body: "Immediate guidance if a risk is detected." },
      ],
      cta: "Experience dayli on WhatsApp",
      chat: {
        msg1: "Today will be very hot (44°C). Drink water every hour and avoid going outside between 12–4 PM.",
        checkin: "How are you feeling today?",
        options: ["Fine", "Tired", "Dizzy"],
        reply: "Dizzy",
        rest: "Please rest and consider visiting a clinic nearby.",
      },
    },
  },
  clinics: {
    seoTitle: "dayli for Clinics — Reduce No-Shows, Improve Outcomes | dayli.ai",
    seoDescription: "dayli helps clinics reduce missed appointments during extreme weather, keep patients engaged between visits, and identify high-risk patients early.",
    badge: "For Clinics & Providers",
    h1: "Reduce No-Shows. Improve Patient Outcomes.",
    intro: "dayli helps clinics reduce missed appointments during extreme weather, keep patients engaged between visits, and identify high-risk patients early.",
    howHeading: "How it works for clinics",
    steps: [
      { title: "Patients onboard via WhatsApp", body: "Seamless, friction-free onboarding with no apps to download or passwords to remember." },
      { title: "Daily guidance and reminders", body: "Patients receive climate-aware health advice and appointment nudges." },
      { title: "Clinic dashboard", body: "Monitor at-risk patients and engagement levels in real-time to prioritize outreach." },
    ],
    benefitsHeading: "Key Benefits",
    benefits: ["Increase appointment adherence", "Improve patient satisfaction", "Better health outcomes"],
    formHeading: "Partner with dayli",
    formIntro: "Tell us a bit about your clinic and our team will be in touch.",
    formNotice: "We respond within 2 working days with a 20-minute intro call.",
    fields: {
      name: "Full Name", namePh: "Dr. Jane Doe",
      role: "Your Role", rolePh: "Select your role",
      roleOptions: ["Doctor", "Clinic Administrator", "Care Coordinator", "Other"],
      clinic: "Clinic Name", clinicPh: "City Health Clinic",
      patients: "Approx. patients / month", patientsPh: "e.g. 800",
      city: "City / Region", cityPh: "Hyderabad",
      email: "Email Address", emailPh: "jane@clinic.com",
      message: "Message (Optional)", messagePh: "How can dayli help your clinic?",
    },
    submit: "Partner with dayli",
    submitting: "Sending...",
    consent: "By submitting, you agree to be contacted about a dayli partnership. We never share your details.",
    toastSuccessTitle: "Thank you for your interest!",
    toastSuccessBody: "We'll respond within 2 working days with a 20-minute intro call.",
    toastErrorTitle: "Something went wrong",
    toastErrorBody: "Please try again, or email us directly.",
  },
  pharma: {
    seoTitle: "dayli for Pharma — Climate-Aware Adherence | dayli.ai",
    seoDescription: "Patients drop adherence during heatwaves and environmental stress. dayli ensures continuous engagement when patients need it most.",
    badge: "For Pharma & Life Sciences",
    h1: "Improve Adherence in Real-World Conditions",
    intro: "Patients often drop adherence during heatwaves and environmental stress. dayli ensures continuous engagement when patients need it most.",
    problemHeading: "The Problem",
    problemIntro: "Patients often drop adherence during:",
    problemBullets: ["Heatwaves", "Environmental stress"],
    solutionHeading: "The Solution",
    solutionIntro: "dayli ensures:",
    solutionBullets: ["Continuous engagement", "Climate-aware adherence nudges", "Better treatment outcomes"],
    useCasesHeading: "Core Use Cases",
    useCases: ["Chronic conditions", "Maternal health", "Pediatric care"],
    formHeading: "Partner with us",
    formIntro: "Discuss adherence solutions for your portfolios.",
    formNotice: "We respond within 2 working days with a tailored intro call.",
    fields: {
      name: "Full Name", namePh: "John Smith",
      company: "Company Name", companyPh: "PharmaCorp Inc.",
      therapeutic: "Therapeutic Area", therapeuticPh: "Select an area",
      therapeuticOptions: ["Maternal & women's health", "Pediatrics", "Cardiometabolic", "Respiratory", "Other"],
      email: "Work Email", emailPh: "john@pharmacorp.com",
      message: "Message (Optional)", messagePh: "Tell us about your therapeutic areas of interest",
    },
    submit: "Submit Inquiry",
    submitting: "Sending...",
    consent: "By submitting, you agree to be contacted about a dayli partnership. We never share your details.",
    toastSuccessTitle: "Thank you for your interest!",
    toastSuccessBody: "Our partnership team will reach out within 2 working days.",
    toastErrorTitle: "Something went wrong",
    toastErrorBody: "Please try again, or email us directly.",
  },
  about: {
    seoTitle: "About dayli — A Daily Decision Layer for Health | dayli.ai",
    seoDescription: "dayli's mission is to make healthcare adaptive, personalized, and proactive in a changing climate. Learn about our vision and why now.",
    h1: "About dayli",
    intro: "A daily decision layer for health in a changing climate.",
    missionHeading: "Mission",
    mission: "\"To make healthcare adaptive, personalized, and proactive in a changing climate.\"",
    visionHeading: "Vision",
    vision: "\"A world where every individual has access to real-time health guidance based on their environment.\"",
    whyNowHeading: "Why Now",
    whyNow: [
      { title: "Climate risks are increasing", body: "Extreme weather events are becoming more frequent, directly impacting vulnerable populations." },
      { title: "AI enables real-time decision-making", body: "We now have the technology to process complex data and deliver personalized guidance instantly." },
      { title: "Mobile access is universal", body: "Platforms like WhatsApp reach billions, making it possible to deliver care everywhere." },
    ],
  },
  privacy: {
    seoTitle: "Privacy at dayli — Your Data, Your Control | dayli.ai",
    seoDescription: "How dayli collects, uses, and protects your information. Your data is never sold, and individual health data is never shared without your explicit consent.",
    badge: "Your data, your control",
    h1: "Privacy at dayli",
    intro: "dayli supports women and children with sensitive health guidance. We treat your data with the care that responsibility demands.",
    sections: [
      { heading: "What we collect", body: "Only what is needed to give you safe, personalized guidance: your WhatsApp number, your pregnancy stage or your child's age, your approximate location, and the daily check-in responses you choose to share." },
      { heading: "How we use it", body: "Your information is used to combine local climate signals with your personal context so dayli can send relevant alerts, hydration reminders, and check-ins. It is never used for advertising." },
      { heading: "What we do not do", bullets: [
        "We do not sell or share your personal data with third parties for marketing.",
        "We do not share individual health data with clinics or pharma partners without your explicit consent.",
        "We do not store WhatsApp message content longer than needed to provide the service.",
      ]},
      { heading: "Your choices", body: "You can pause dayli at any time by replying STOP on WhatsApp. You can ask us to delete your data by replying DELETE, or by contacting our team." },
      { heading: "Important notice", body: "dayli is not a medical device and does not replace professional medical advice. For any medical emergency, contact your local healthcare provider or emergency services immediately." },
    ],
    note: "This page describes our commitments. A complete legal privacy policy is being prepared and will replace this summary.",
  },
  notFound: {
    seoTitle: "Page not found — dayli.ai",
    seoDescription: "The page you were looking for doesn't exist.",
    eyebrow: "404",
    h1: "Page not found",
    body: "The page you were looking for doesn't exist or has moved.",
    cta: "Back to home",
  },
};

const hi: PageContent = {
  layout: {
    nav: { product: "उत्पाद", clinics: "क्लिनिकों के लिए", pharma: "फार्मा के लिए", about: "हमारे बारे में" },
    ctaWhatsapp: "WhatsApp पर शुरू करें",
    whatsappPending: "WhatsApp सेटअप जारी है — नीचे अपनी जानकारी छोड़ें, चालू होते ही हम संपर्क करेंगे।",
    whatsappSoon: "जल्द आ रहा है",
    languageMenuLabel: "भाषा",
    languageBanner: {
      prompt: "क्या आप यह साइट हिंदी में देखना पसंद करेंगे?",
      accept: "हिंदी में देखें",
      dismiss: "नहीं, धन्यवाद",
    },
    footer: {
      tagline: "बदलती जलवायु में स्वास्थ्य के लिए एक दैनिक निर्णय परत।",
      solutions: "समाधान",
      company: "कंपनी",
      getStarted: "शुरू करें",
      product: "उत्पाद",
      clinics: "क्लिनिकों के लिए",
      pharma: "फार्मा के लिए",
      about: "हमारे बारे में",
      privacy: "गोपनीयता",
      connect: "WhatsApp पर जुड़ें",
      copyright: (year) => `© ${year} dayli.ai. सर्वाधिकार सुरक्षित।`,
      disclaimer: "यह कोई चिकित्सा उपकरण नहीं है। आपातकाल में हमेशा स्वास्थ्य पेशेवर से सलाह लें।",
    },
  },
  ctaMicrocopy: "मुफ़्त · कोई ऐप डाउनलोड नहीं · एक मिनट में शुरुआत · आपका डेटा निजी रहता है।",
  faq: [
    { q: "dayli क्या है?", a: "dayli महिलाओं और बच्चों के लिए एक AI-संचालित क्लाइमेट हेल्थ कोपायलट है। यह स्थानीय जलवायु डेटा को आपके व्यक्तिगत स्वास्थ्य संदर्भ के साथ जोड़कर WhatsApp पर रोज़ाना सरल और कारगर मार्गदर्शन देता है।" },
    { q: "क्या dayli एक चिकित्सा उपकरण है?", a: "नहीं। dayli कोई चिकित्सा उपकरण नहीं है और पेशेवर चिकित्सा सलाह की जगह नहीं ले सकता। किसी भी आपात स्थिति में तुरंत अपने स्थानीय स्वास्थ्य प्रदाता या आपातकालीन सेवाओं से संपर्क करें।" },
    { q: "dayli मेरे डेटा का उपयोग कैसे करता है?", a: "केवल सुरक्षित और व्यक्तिगत मार्गदर्शन देने के लिए। हम स्थानीय जलवायु संकेतों को आपके संदर्भ के साथ जोड़कर अलर्ट, पानी पीने के अनुस्मारक और चेक-इन भेजते हैं। आपका डेटा कभी बेचा नहीं जाता और न ही विज्ञापन के लिए उपयोग होता है। आपकी स्पष्ट सहमति के बिना व्यक्तिगत स्वास्थ्य डेटा किसी क्लिनिक या फार्मा पार्टनर के साथ साझा नहीं किया जाता।" },
    { q: "dayli किन भाषाओं का समर्थन करता है?", a: "dayli फ़िलहाल अंग्रेज़ी, हिंदी, तेलुगू और अरबी का समर्थन करता है।" },
    { q: "dayli की लागत कितनी है?", a: "dayli का उपयोग पूरी तरह मुफ़्त है। कोई ऐप डाउनलोड करने की ज़रूरत नहीं — WhatsApp पर एक मिनट से कम में जुड़ जाइए।" },
    { q: "dayli का जलवायु डेटा कहाँ से आता है?", a: "dayli WHO के हीट थ्रेशोल्ड, भारत मौसम विज्ञान विभाग (IMD) और OpenWeather का उपयोग करके स्थानीय गर्मी और पर्यावरणीय जोखिम पर रियल-टाइम नज़र रखता है।" },
    { q: "dayli किसके लिए है?", a: "dayli गर्भवती महिलाओं, माताओं और छोटे बच्चों की देखभाल करने वालों के लिए बना है — वे समूह जो अत्यधिक गर्मी और जलवायु-जनित स्वास्थ्य जोखिमों के सबसे संवेदनशील हैं।" },
  ],
  faqSection: {
    eyebrow: "अक्सर पूछे जाने वाले प्रश्न",
    heading: "dayli के बारे में सवाल",
    intro: "dayli कैसे काम करता है, कितना खर्च है और हम आपके डेटा की सुरक्षा कैसे करते हैं — संक्षिप्त, स्पष्ट जवाब।",
  },
  home: {
    seoTitle: "dayli.ai — महिलाओं और बच्चों के लिए AI क्लाइमेट हेल्थ कोपायलट",
    seoDescription: "dayli महिलाओं और बच्चों के लिए AI-संचालित क्लाइमेट हेल्थ कोपायलट है। WhatsApp पर रियल-टाइम, व्यक्तिगत मार्गदर्शन — जलवायु डेटा, स्वास्थ्य ज्ञान और AI का संगम।",
    badge: "AI-संचालित क्लाइमेट हेल्थ कोपायलट",
    h1: "आपका रोज़ का स्वास्थ्य, जलवायु बुद्धिमत्ता से सशक्त",
    p1: "एक AI जो महिलाओं और बच्चों को अत्यधिक गर्मी और जलवायु जोखिमों से एक कदम आगे, सुरक्षित और स्वस्थ रखने में मदद करता है।",
    p2: "एक WhatsApp साथी — कोई ऐप डाउनलोड करने की ज़रूरत नहीं।",
    ctaPrimary: "WhatsApp पर शुरू करें",
    ctaSecondary: "क्लिनिकों और भागीदारों के लिए",
    tagline: "कोई चैटबॉट नहीं। कोई वेलनेस ऐप नहीं। स्वास्थ्य के लिए एक दैनिक निर्णय परत।",
    chatHero: "कल बहुत गर्मी होगी (45°C)। बार-बार पानी पिएं और दोपहर 12 से 4 बजे के बीच घर के अंदर रहें।",
    chatDemo: {
      title: "dayli कोपायलट",
      subtitle: "लाइव डेमो — मौसम-आधारित स्वास्थ्य मार्गदर्शन",
      introHeading: "एक लाइव बातचीत आज़माएँ",
      introBody: "अपना स्थान साझा करें और कोई प्रश्न पूछें। dayli आज के स्थानीय मौसम और वायु गुणवत्ता के आधार पर सरल भाषा में व्यावहारिक सलाह देगा।",
      startButton: "मेरा स्थान उपयोग करें",
      loading: "स्थानीय मौसम और वायु गुणवत्ता पढ़ रहे हैं…",
      retry: "फिर से प्रयास करें",
      errorBody: "स्थानीय जानकारी सेवा से संपर्क नहीं हो सका। कृपया फिर से कोशिश करें।",
      examplesLabel: "इनमें से एक आज़माएँ:",
      examplePrompts: [
        "मेरे बच्चे को अस्थमा है। क्या आज दोपहर बाहर खेलना सुरक्षित है?",
        "मेरा रक्तचाप अधिक है। आज की गर्मी के लिए कोई सुझाव?",
        "क्या सुबह की सैर के लिए हवा साफ है?",
      ],
      inputPlaceholder: "आज के मौसम, वायु गुणवत्ता या लक्षणों के बारे में पूछें…",
      inputDisabledPlaceholder: "डेमो शुरू करने के लिए अपना स्थान साझा करें",
      sendLabel: "भेजें",
      formLabel: "dayli के साथ चैट करें",
      disclaimer: "केवल डेमो। शैक्षिक मार्गदर्शन — चिकित्सीय निदान नहीं। सीने में दर्द, साँस लेने में कठिनाई या अन्य आपातकाल पर अपनी स्थानीय आपातकालीन सेवा को कॉल करें।",
      sourceGps: "आपके उपकरण से",
      sourceIp: "आपके नेटवर्क से अनुमानित",
      locationUnknown: "आपका क्षेत्र",
      heatRiskLabels: {
        low: "कम गर्मी",
        moderate: "मध्यम गर्मी",
        high: "अधिक गर्मी",
        very_high: "बहुत अधिक गर्मी",
        extreme: "अत्यधिक गर्मी",
      },
      aqiLabels: {
        good: "अच्छी हवा",
        moderate: "मध्यम हवा",
        unhealthy_sensitive: "संवेदनशील समूहों के लिए अस्वास्थ्यकर",
        unhealthy: "अस्वास्थ्यकर हवा",
        very_unhealthy: "बहुत अस्वास्थ्यकर हवा",
        hazardous: "खतरनाक हवा",
        unknown: "वायु गुणवत्ता उपलब्ध नहीं",
      },
    },
    trust: {
      label: "जलवायु और स्वास्थ्य विशेषज्ञता से निर्मित",
      items: [
        "जलवायु डेटा: WHO हीट थ्रेशोल्ड, IMD और OpenWeather",
        "हैदराबाद के मातृ एवं बाल क्लिनिकों के साथ पायलट",
        "WhatsApp Business API पर निर्मित",
      ],
    },
    definition: {
      heading: "dayli क्या है?",
      bodyStrong: "dayli",
      body: " महिलाओं और बच्चों के लिए AI-संचालित क्लाइमेट हेल्थ कोपायलट है। यह स्थानीय जलवायु डेटा, स्वास्थ्य ज्ञान और AI निजीकरण को जोड़कर WhatsApp पर रियल-टाइम, कारगर मार्गदर्शन देता है — गर्भवती महिलाओं, माताओं और देखभाल करने वालों को हीटवेव और अन्य जलवायु-जनित स्वास्थ्य जोखिमों में सुरक्षित रखता है। dayli मुफ़्त है, ऐप डाउनलोड की ज़रूरत नहीं और अंग्रेज़ी, हिंदी, तेलुगू व अरबी का समर्थन करता है।",
    },
    problem: {
      eyebrow: "समस्या",
      heading: "जलवायु पहले से ही आपके स्वास्थ्य को प्रभावित कर रही है",
      intro: "आज कोई भी सिस्टम जलवायु को आपके दैनिक स्वास्थ्य निर्णयों से नहीं जोड़ता।",
      cardHeading: "अत्यधिक गर्मी जोखिम बढ़ाती है:",
      bullet1: "गर्भवती महिलाएं",
      bullet2: "छोटे बच्चे",
      cardBody: "निर्जलीकरण, थकान और छूटी देखभाल टाली जा सकने वाली जटिलताओं की वजह बनती हैं।",
    },
    solution: {
      eyebrow: "समाधान",
      heading: "मिलिए dayli से",
      intro: "आपका AI स्वास्थ्य साथी जो आपके परिवेश के अनुसार रियल-टाइम में ढलता है।",
      bullets: [
        "स्थानीय मौसम और गर्मी पर नज़र रखता है",
        "आपकी स्वास्थ्य ज़रूरतों को समझता है",
        "रोज़ाना सरल, कारगर सलाह देता है",
      ],
    },
    how: {
      heading: "यह कैसे काम करता है",
      intro: "सरल, कारगर, रियल-टाइम मार्गदर्शन।",
      steps: [
        { title: "आपको समझता है", body: "आपकी गर्भावस्था की अवस्था या बच्चे की उम्र और रोज़ की लोकेशन को जानता है।" },
        { title: "जलवायु जोखिम पर नज़र", body: "हीटवेव, तापमान वृद्धि और पर्यावरणीय तनाव को रियल-टाइम में ट्रैक करता है।" },
        { title: "रोज़ मार्गदर्शन", body: "हाइड्रेशन रिमाइंडर, सुरक्षित बाहरी समय, अलर्ट और चेक-इन भेजता है।" },
      ],
    },
    useCase: {
      tagline: "हैदराबाद की गर्मी",
      quote: "\"कल: आपके इलाके में 45°C\"",
      body: "dayli पहले से अलर्ट देगा, हाइड्रेशन और आराम की सलाह देगा, चरम गर्मी के घंटों (दोपहर 12–4) से बचने को कहेगा और आपके लक्षणों पर नज़र रखेगा।",
      disclaimer: "dayli सहायक मार्गदर्शन देता है, चिकित्सा निदान नहीं। आपात में अपने स्थानीय स्वास्थ्य प्रदाता से संपर्क करें।",
      pullQuote: "\"सरल कदम। असली असर।\"",
      chat: {
        intro: "कल बहुत गर्मी होगी (45°C)। बार-बार पानी पिएं और दोपहर 12 से 4 बजे के बीच घर के अंदर रहें।",
        checkin: "आज आप कैसा महसूस कर रहे हैं?",
        options: ["ठीक", "थकान", "चक्कर"],
        reply: "थकान",
        clinic: "कृपया आराम करें और पास के क्लिनिक जाने पर विचार करें। क्या मैं आपके लिए कोई पास का क्लिनिक ढूँढूँ?",
      },
    },
    features: {
      heading: "उत्पाद की विशेषताएँ",
      items: [
        { title: "दैनिक स्वास्थ्य अलर्ट", body: "जानें कब गर्मी या मौसम आपको प्रभावित कर सकते हैं" },
        { title: "व्यक्तिगत मार्गदर्शन", body: "सिर्फ़ आपके लिए सलाह — कोई सामान्य सिफ़ारिश नहीं" },
        { title: "दैनिक चेक-इन", body: "अपने हाल पर नज़र रखें और ज़रूरत पड़ने पर मदद पाएं" },
        { title: "क्लिनिक सहयोग (वैकल्पिक)", body: "अपने स्वास्थ्य प्रदाता से जुड़े रहें" },
      ],
      trustHeading: "वास्तविक परिस्थितियों के लिए बना",
      trustItems: [
        { title: "WhatsApp पर काम करता है (कोई ऐप नहीं)" },
        { title: "कम डेटा उपयोग के लिए डिज़ाइन" },
        { title: "कई भाषाओं का समर्थन", sub: "English · हिंदी · తెలుగు · العربية" },
        { title: "आपका डेटा निजी रहता है", sub: "कभी नहीं बेचा जाता।" },
      ],
      privacyLink: "हमारा रवैया पढ़ें",
    },
    cta: {
      heading: "अपने स्वास्थ्य का नियंत्रण लीजिए — हर दिन",
      sub: "समस्या होने से पहले रोकें।",
      button: "WhatsApp पर dayli शुरू करें",
    },
  },
  product: {
    seoTitle: "dayli कैसे काम करता है — WhatsApp पर जलवायु, स्वास्थ्य और AI | dayli.ai",
    seoDescription: "dayli जलवायु डेटा, स्वास्थ्य ज्ञान और AI निजीकरण को जोड़कर WhatsApp पर रियल-टाइम, कारगर दैनिक मार्गदर्शन देता है।",
    h1: "dayli कैसे काम करता है",
    intro: "dayli जलवायु डेटा + स्वास्थ्य ज्ञान + AI निजीकरण को जोड़कर रोज़मर्रा की ज़िंदगी के लिए रियल-टाइम, कारगर मार्गदर्शन देता है।",
    layers: [
      { title: "जलवायु जागरूकता", body: "आपके इलाके में गर्मी और पर्यावरणीय जोखिम पर नज़र।" },
      { title: "स्वास्थ्य बुद्धिमत्ता", body: "आपकी अवस्था (गर्भावस्था / बाल देखभाल) को समझती है।" },
      { title: "AI कोपायलट", body: "आपको सुरक्षित रखने के लिए सरल दैनिक कदम बताता है।" },
    ],
    realtime: {
      heading: "जब सबसे ज़रूरी हो, तब रियल-टाइम मार्गदर्शन",
      intro: "जलवायु बुद्धिमत्ता से सशक्त दैनिक स्वास्थ्य मार्गदर्शन। कोई चैटबॉट नहीं। कोई वेलनेस ऐप नहीं। बदलती जलवायु में स्वास्थ्य के लिए दैनिक निर्णय परत।",
      steps: [
        { title: "सुबह का संदेश", body: "दिन के पूर्वानुमान पर आधारित प्रोएक्टिव अलर्ट।" },
        { title: "चेक-इन", body: "आपकी स्थिति पर नज़र रखने के लिए सरल चेक-इन।" },
        { title: "जोखिम प्रतिक्रिया", body: "जोखिम मिलने पर तुरंत मार्गदर्शन।" },
      ],
      cta: "WhatsApp पर dayli का अनुभव लें",
      chat: {
        msg1: "आज बहुत गर्मी होगी (44°C)। हर घंटे पानी पिएं और दोपहर 12–4 के बीच बाहर न जाएं।",
        checkin: "आज आप कैसा महसूस कर रहे हैं?",
        options: ["ठीक", "थकान", "चक्कर"],
        reply: "चक्कर",
        rest: "कृपया आराम करें और पास के क्लिनिक जाने पर विचार करें।",
      },
    },
  },
  clinics: {
    seoTitle: "क्लिनिकों के लिए dayli — कम मिस्ड अपॉइंटमेंट, बेहतर परिणाम | dayli.ai",
    seoDescription: "dayli क्लिनिकों को अत्यधिक मौसम के दौरान छूटी अपॉइंटमेंट कम करने, मरीजों को विज़िट के बीच जोड़े रखने और उच्च-जोखिम वाले मरीज़ों की जल्दी पहचान में मदद करता है।",
    badge: "क्लिनिकों और प्रदाताओं के लिए",
    h1: "मिस्ड अपॉइंटमेंट घटाएँ। मरीज़ों के परिणाम सुधारें।",
    intro: "dayli क्लिनिकों को अत्यधिक मौसम के दौरान छूटी अपॉइंटमेंट घटाने, विज़िट के बीच मरीजों को जोड़े रखने और उच्च-जोखिम वाले मरीज़ों की जल्दी पहचान में मदद करता है।",
    howHeading: "क्लिनिकों के लिए यह कैसे काम करता है",
    steps: [
      { title: "मरीज़ WhatsApp से जुड़ते हैं", body: "बिना ऐप या पासवर्ड के सहज और आसान ऑनबोर्डिंग।" },
      { title: "दैनिक मार्गदर्शन और रिमाइंडर", body: "मरीज़ों को जलवायु-संवेदी स्वास्थ्य सलाह और अपॉइंटमेंट रिमाइंडर मिलते हैं।" },
      { title: "क्लिनिक डैशबोर्ड", body: "उच्च-जोखिम वाले मरीज़ों और उनके जुड़ाव को रियल-टाइम में देखें ताकि प्राथमिकता तय की जा सके।" },
    ],
    benefitsHeading: "मुख्य लाभ",
    benefits: ["अपॉइंटमेंट पालन बढ़ाएँ", "मरीज़ संतुष्टि सुधारें", "बेहतर स्वास्थ्य परिणाम"],
    formHeading: "dayli के साथ साझेदारी करें",
    formIntro: "अपने क्लिनिक के बारे में थोड़ा बताएं और हमारी टीम संपर्क करेगी।",
    formNotice: "हम 2 कार्यदिवसों में 20-मिनट की परिचय कॉल के साथ जवाब देते हैं।",
    fields: {
      name: "पूरा नाम", namePh: "डॉ. जाह्नवी शर्मा",
      role: "आपकी भूमिका", rolePh: "अपनी भूमिका चुनें",
      roleOptions: ["डॉक्टर", "क्लिनिक प्रशासक", "केयर कोऑर्डिनेटर", "अन्य"],
      clinic: "क्लिनिक का नाम", clinicPh: "सिटी हेल्थ क्लिनिक",
      patients: "लगभग मरीज़ / माह", patientsPh: "जैसे 800",
      city: "शहर / क्षेत्र", cityPh: "हैदराबाद",
      email: "ईमेल पता", emailPh: "name@clinic.com",
      message: "संदेश (वैकल्पिक)", messagePh: "dayli आपके क्लिनिक की कैसे मदद कर सकता है?",
    },
    submit: "dayli के साथ साझेदारी करें",
    submitting: "भेजा जा रहा है...",
    consent: "सबमिट करके आप dayli की साझेदारी के बारे में संपर्क के लिए सहमत होते हैं। हम आपकी जानकारी कभी साझा नहीं करते।",
    toastSuccessTitle: "रुचि के लिए धन्यवाद!",
    toastSuccessBody: "हम 2 कार्यदिवसों में 20-मिनट की परिचय कॉल के साथ जवाब देंगे।",
    toastErrorTitle: "कुछ गलत हो गया",
    toastErrorBody: "कृपया फिर कोशिश करें या हमें सीधे ईमेल करें।",
  },
  pharma: {
    seoTitle: "फार्मा के लिए dayli — जलवायु-संवेदी पालन | dayli.ai",
    seoDescription: "हीटवेव और पर्यावरणीय तनाव में मरीज़ अनुपालन छोड़ देते हैं। dayli तब निरंतर जुड़ाव सुनिश्चित करता है जब मरीज़ों को इसकी सबसे ज़्यादा ज़रूरत होती है।",
    badge: "फार्मा और जीवन विज्ञान के लिए",
    h1: "वास्तविक परिस्थितियों में पालन सुधारें",
    intro: "हीटवेव और पर्यावरणीय तनाव में मरीज़ अक्सर अनुपालन छोड़ देते हैं। dayli तब निरंतर जुड़ाव सुनिश्चित करता है जब मरीज़ों को इसकी सबसे ज़्यादा ज़रूरत होती है।",
    problemHeading: "समस्या",
    problemIntro: "मरीज़ अक्सर इन स्थितियों में अनुपालन छोड़ देते हैं:",
    problemBullets: ["हीटवेव", "पर्यावरणीय तनाव"],
    solutionHeading: "समाधान",
    solutionIntro: "dayli सुनिश्चित करता है:",
    solutionBullets: ["निरंतर जुड़ाव", "जलवायु-संवेदी पालन रिमाइंडर", "बेहतर इलाज परिणाम"],
    useCasesHeading: "मुख्य उपयोग केस",
    useCases: ["क्रोनिक स्थितियाँ", "मातृ स्वास्थ्य", "बाल देखभाल"],
    formHeading: "हमारे साथ साझेदारी करें",
    formIntro: "अपने पोर्टफोलियो के लिए पालन समाधानों पर चर्चा करें।",
    formNotice: "हम 2 कार्यदिवसों में अनुकूलित परिचय कॉल के साथ जवाब देते हैं।",
    fields: {
      name: "पूरा नाम", namePh: "जॉन स्मिथ",
      company: "कंपनी का नाम", companyPh: "PharmaCorp Inc.",
      therapeutic: "थेराप्यूटिक क्षेत्र", therapeuticPh: "एक क्षेत्र चुनें",
      therapeuticOptions: ["मातृ एवं महिला स्वास्थ्य", "बाल चिकित्सा", "कार्डियोमेटाबोलिक", "श्वसन", "अन्य"],
      email: "कार्य ईमेल", emailPh: "john@pharmacorp.com",
      message: "संदेश (वैकल्पिक)", messagePh: "अपने रुचि के थेराप्यूटिक क्षेत्रों के बारे में बताएं",
    },
    submit: "पूछताछ भेजें",
    submitting: "भेजा जा रहा है...",
    consent: "सबमिट करके आप dayli की साझेदारी के बारे में संपर्क के लिए सहमत होते हैं। हम आपकी जानकारी कभी साझा नहीं करते।",
    toastSuccessTitle: "रुचि के लिए धन्यवाद!",
    toastSuccessBody: "हमारी पार्टनरशिप टीम 2 कार्यदिवसों में संपर्क करेगी।",
    toastErrorTitle: "कुछ गलत हो गया",
    toastErrorBody: "कृपया फिर कोशिश करें या हमें सीधे ईमेल करें।",
  },
  about: {
    seoTitle: "dayli के बारे में — स्वास्थ्य के लिए दैनिक निर्णय परत | dayli.ai",
    seoDescription: "dayli का मिशन है बदलती जलवायु में स्वास्थ्य देखभाल को अनुकूल, व्यक्तिगत और प्रोएक्टिव बनाना। हमारा दृष्टिकोण और 'अभी क्यों' जानें।",
    h1: "dayli के बारे में",
    intro: "बदलती जलवायु में स्वास्थ्य के लिए एक दैनिक निर्णय परत।",
    missionHeading: "मिशन",
    mission: "\"बदलती जलवायु में स्वास्थ्य देखभाल को अनुकूल, व्यक्तिगत और प्रोएक्टिव बनाना।\"",
    visionHeading: "दृष्टिकोण",
    vision: "\"एक ऐसी दुनिया जहाँ हर व्यक्ति को अपने परिवेश के आधार पर रियल-टाइम स्वास्थ्य मार्गदर्शन उपलब्ध हो।\"",
    whyNowHeading: "अभी क्यों",
    whyNow: [
      { title: "जलवायु जोखिम बढ़ रहे हैं", body: "अत्यधिक मौसम की घटनाएँ बढ़ रही हैं और सीधे संवेदनशील आबादी को प्रभावित कर रही हैं।" },
      { title: "AI रियल-टाइम निर्णय संभव बनाता है", body: "अब हमारे पास जटिल डेटा को संसाधित करने और तुरंत व्यक्तिगत मार्गदर्शन देने की तकनीक है।" },
      { title: "मोबाइल पहुंच सर्वव्यापी है", body: "WhatsApp जैसे प्लेटफ़ॉर्म अरबों लोगों तक पहुँचते हैं, जिससे हर जगह देखभाल देना संभव है।" },
    ],
  },
  privacy: {
    seoTitle: "dayli पर गोपनीयता — आपका डेटा, आपका नियंत्रण | dayli.ai",
    seoDescription: "dayli आपकी जानकारी कैसे एकत्र, उपयोग और सुरक्षित करता है। आपका डेटा कभी नहीं बेचा जाता और व्यक्तिगत स्वास्थ्य डेटा बिना आपकी स्पष्ट सहमति के साझा नहीं होता।",
    badge: "आपका डेटा, आपका नियंत्रण",
    h1: "dayli पर गोपनीयता",
    intro: "dayli महिलाओं और बच्चों के लिए संवेदनशील स्वास्थ्य मार्गदर्शन देता है। इस ज़िम्मेदारी के अनुरूप हम आपके डेटा की पूरी देखभाल करते हैं।",
    sections: [
      { heading: "हम क्या एकत्र करते हैं", body: "केवल वह जानकारी जो सुरक्षित, व्यक्तिगत मार्गदर्शन के लिए ज़रूरी हो: आपका WhatsApp नंबर, गर्भावस्था की अवस्था या बच्चे की उम्र, आपका अनुमानित स्थान और आप जो दैनिक चेक-इन साझा करते हैं।" },
      { heading: "हम इसका उपयोग कैसे करते हैं", body: "आपकी जानकारी को स्थानीय जलवायु संकेतों के साथ जोड़कर dayli प्रासंगिक अलर्ट, हाइड्रेशन रिमाइंडर और चेक-इन भेजता है। इसका उपयोग कभी विज्ञापन के लिए नहीं होता।" },
      { heading: "हम क्या नहीं करते", bullets: [
        "हम आपका व्यक्तिगत डेटा मार्केटिंग के लिए तीसरे पक्ष को नहीं बेचते या साझा नहीं करते।",
        "आपकी स्पष्ट सहमति के बिना व्यक्तिगत स्वास्थ्य डेटा क्लिनिक या फार्मा पार्टनर्स से साझा नहीं करते।",
        "WhatsApp संदेशों की सामग्री को सेवा के लिए ज़रूरी से अधिक समय तक संग्रहीत नहीं करते।",
      ]},
      { heading: "आपके विकल्प", body: "आप कभी भी WhatsApp पर STOP लिखकर dayli रोक सकते हैं। DELETE लिखकर डेटा हटाने का अनुरोध कर सकते हैं या हमारी टीम से संपर्क कर सकते हैं।" },
      { heading: "महत्वपूर्ण सूचना", body: "dayli कोई चिकित्सा उपकरण नहीं है और पेशेवर चिकित्सा सलाह की जगह नहीं ले सकता। किसी भी आपात स्थिति में तुरंत अपने स्थानीय स्वास्थ्य प्रदाता या आपातकालीन सेवाओं से संपर्क करें।" },
    ],
    note: "यह पृष्ठ हमारी प्रतिबद्धताओं का वर्णन करता है। एक संपूर्ण कानूनी गोपनीयता नीति तैयार की जा रही है जो इस सारांश की जगह लेगी।",
  },
  notFound: {
    seoTitle: "पृष्ठ नहीं मिला — dayli.ai",
    seoDescription: "जिस पृष्ठ की आप तलाश कर रहे थे वह मौजूद नहीं है।",
    eyebrow: "404",
    h1: "पृष्ठ नहीं मिला",
    body: "जिस पृष्ठ की आप तलाश कर रहे थे वह मौजूद नहीं है या स्थानांतरित कर दिया गया है।",
    cta: "मुख पृष्ठ पर वापस जाएँ",
  },
};

const te: PageContent = {
  layout: {
    nav: { product: "ఉత్పత్తి", clinics: "క్లినిక్‌ల కోసం", pharma: "ఫార్మా కోసం", about: "మా గురించి" },
    ctaWhatsapp: "WhatsAppలో మొదలుపెట్టండి",
    whatsappPending: "WhatsApp సెటప్ జరుగుతోంది — క్రింద మీ వివరాలు ఇవ్వండి, ప్రారంభమైన వెంటనే సంప్రదిస్తాము.",
    whatsappSoon: "త్వరలో వస్తోంది",
    languageMenuLabel: "భాష",
    languageBanner: {
      prompt: "మీరు ఈ సైట్‌ను తెలుగులో చూడాలనుకుంటున్నారా?",
      accept: "తెలుగులో చూడండి",
      dismiss: "వద్దు, ధన్యవాదాలు",
    },
    footer: {
      tagline: "మారుతున్న వాతావరణంలో ఆరోగ్యానికి ఒక రోజువారీ నిర్ణయ పొర.",
      solutions: "సొల్యూషన్స్",
      company: "కంపెనీ",
      getStarted: "మొదలుపెట్టండి",
      product: "ఉత్పత్తి",
      clinics: "క్లినిక్‌ల కోసం",
      pharma: "ఫార్మా కోసం",
      about: "మా గురించి",
      privacy: "గోప్యత",
      connect: "WhatsAppలో కనెక్ట్ అవ్వండి",
      copyright: (year) => `© ${year} dayli.ai. అన్ని హక్కులూ సంరక్షించబడ్డాయి.`,
      disclaimer: "ఇది వైద్య పరికరం కాదు. వైద్య అత్యవసర సందర్భాలలో ఎల్లప్పుడూ ఆరోగ్య నిపుణుడిని సంప్రదించండి.",
    },
  },
  ctaMicrocopy: "ఉచితం · యాప్ డౌన్‌లోడ్ అక్కరలేదు · నిమిషంలోపే ఆన్‌బోర్డ్ · మీ డేటా గోప్యంగా ఉంటుంది.",
  faq: [
    { q: "dayli అంటే ఏమిటి?", a: "dayli అనేది మహిళలు మరియు పిల్లల కోసం AI-ఆధారిత క్లైమేట్ హెల్త్ కోపైలట్. ఇది స్థానిక వాతావరణ డేటాను మీ వ్యక్తిగత ఆరోగ్య సందర్భంతో కలిపి WhatsApp ద్వారా ప్రతి రోజూ ఉపయోగపడే మార్గదర్శనం అందిస్తుంది." },
    { q: "dayli వైద్య పరికరమా?", a: "కాదు. dayli వైద్య పరికరం కాదు మరియు వృత్తిపరమైన వైద్య సలహాకు ప్రత్యామ్నాయం కాదు. ఏవైనా అత్యవసర పరిస్థితులలో, వెంటనే మీ స్థానిక ఆరోగ్య ప్రదాతను లేదా అత్యవసర సేవలను సంప్రదించండి." },
    { q: "dayli నా డేటాను ఎలా ఉపయోగిస్తుంది?", a: "సురక్షితమైన, వ్యక్తిగత మార్గదర్శనం అందించడానికి మాత్రమే. స్థానిక వాతావరణ సంకేతాలను మీ సందర్భంతో కలిపి సంబంధిత హెచ్చరికలు, నీరు త్రాగే గుర్తుచేతలు, చెక్-ఇన్‌లు పంపుతాము. మీ డేటా ఎప్పుడూ అమ్మబడదు లేదా ప్రకటనల కోసం ఉపయోగించబడదు, మీ స్పష్టమైన అనుమతి లేకుండా క్లినిక్‌లు లేదా ఫార్మా భాగస్వాములతో వ్యక్తిగత ఆరోగ్య డేటా పంచుకోబడదు." },
    { q: "dayli ఏ భాషలను సపోర్ట్ చేస్తుంది?", a: "dayli ప్రస్తుతం ఇంగ్లీష్, హిందీ, తెలుగు మరియు అరబిక్ భాషలను సపోర్ట్ చేస్తుంది." },
    { q: "dayli ఎంత ఖర్చు అవుతుంది?", a: "dayli ఉచితం. డౌన్‌లోడ్ చేయడానికి యాప్ లేదు — WhatsAppలో నిమిషంలోపు ఆన్‌బోర్డింగ్ పూర్తవుతుంది." },
    { q: "dayli వాతావరణ డేటాను ఎక్కడి నుంచి తీసుకుంటుంది?", a: "dayli WHO హీట్ థ్రెషోల్డ్‌లు, భారత వాతావరణ శాఖ (IMD) మరియు OpenWeather ద్వారా స్థానిక వేడిమి మరియు పర్యావరణ ప్రమాదాన్ని రియల్-టైమ్‌లో పర్యవేక్షిస్తుంది." },
    { q: "dayli ఎవరి కోసం?", a: "dayli గర్భిణీ స్త్రీలు, తల్లులు, చిన్న పిల్లల సంరక్షకుల కోసం రూపొందించబడింది — తీవ్ర వేడిమి మరియు వాతావరణ ఆధారిత ఆరోగ్య ప్రమాదాలకు అత్యంత హాని కలిగే వర్గాలు." },
  ],
  faqSection: {
    eyebrow: "తరచుగా అడిగే ప్రశ్నలు",
    heading: "dayli గురించి ప్రశ్నలు",
    intro: "dayli ఎలా పనిచేస్తుంది, ఖర్చు ఎంత, మీ డేటాను ఎలా చూసుకుంటాము — చిన్న, స్పష్టమైన సమాధానాలు.",
  },
  home: {
    seoTitle: "dayli.ai — మహిళలు మరియు పిల్లల కోసం AI క్లైమేట్ హెల్త్ కోపైలట్",
    seoDescription: "dayli అనేది మహిళలు మరియు పిల్లల కోసం AI-ఆధారిత క్లైమేట్ హెల్త్ కోపైలట్. WhatsApp ద్వారా రియల్-టైమ్, వ్యక్తిగత మార్గదర్శనం — వాతావరణ డేటా, ఆరోగ్య పరిజ్ఞానం మరియు AI కలయిక.",
    badge: "AI-ఆధారిత క్లైమేట్ హెల్త్ కోపైలట్",
    h1: "మీ రోజువారీ ఆరోగ్యం, వాతావరణ తెలివితో శక్తిమంతం",
    p1: "మహిళలు మరియు పిల్లలను తీవ్రమైన వేడిమి, వాతావరణ ప్రమాదాలకు ముందుగానే సురక్షితంగా, ఆరోగ్యంగా ఉంచేందుకు సహాయపడే AI.",
    p2: "ఒక WhatsApp సహచరి — డౌన్‌లోడ్ చేయాల్సిన యాప్ కాదు.",
    ctaPrimary: "WhatsAppలో మొదలుపెట్టండి",
    ctaSecondary: "క్లినిక్‌లు & భాగస్వాముల కోసం",
    tagline: "ఇది చాట్‌బాట్ కాదు. వెల్‌నెస్ యాప్ కాదు. ఆరోగ్యం కోసం ఒక రోజువారీ నిర్ణయ పొర.",
    chatHero: "రేపు చాలా వేడిగా ఉంటుంది (45°C). తరచుగా నీరు త్రాగండి మరియు మధ్యాహ్నం 12-4 మధ్య ఇంట్లో ఉండండి.",
    chatDemo: {
      title: "dayli కోపైలట్",
      subtitle: "లైవ్ డెమో — వాతావరణ ఆధారిత ఆరోగ్య సూచనలు",
      introHeading: "ఒక లైవ్ సంభాషణను ప్రయత్నించండి",
      introBody: "మీ స్థానాన్ని పంచుకుని ఒక ప్రశ్న అడగండి. dayli ఈరోజు స్థానిక వాతావరణం, గాలి నాణ్యత ఆధారంగా సరళమైన భాషలో ఆచరణాత్మక సలహాలు ఇస్తుంది.",
      startButton: "నా స్థానాన్ని ఉపయోగించండి",
      loading: "స్థానిక వాతావరణం, గాలి నాణ్యతను చదువుతున్నాం…",
      retry: "మళ్ళీ ప్రయత్నించండి",
      errorBody: "స్థానిక సమాచార సేవను చేరుకోలేకపోయాం. దయచేసి మళ్ళీ ప్రయత్నించండి.",
      examplesLabel: "వీటిలో ఒకటి ప్రయత్నించండి:",
      examplePrompts: [
        "నా బిడ్డకు ఆస్తమా ఉంది. ఈరోజు మధ్యాహ్నం బయట ఆడటం సురక్షితమేనా?",
        "నాకు అధిక రక్తపోటు. ఈరోజు వేడికి ఏవైనా చిట్కాలు?",
        "ఉదయం నడకకు గాలి తగినంత శుభ్రంగా ఉందా?",
      ],
      inputPlaceholder: "ఈరోజు వాతావరణం, గాలి నాణ్యత లేదా లక్షణాల గురించి అడగండి…",
      inputDisabledPlaceholder: "డెమోను ప్రారంభించడానికి మీ స్థానాన్ని పంచుకోండి",
      sendLabel: "పంపండి",
      formLabel: "dayli తో చాట్ చేయండి",
      disclaimer: "డెమో మాత్రమే. విద్యాపరమైన సూచనలు — వైద్య నిర్ధారణ కాదు. ఛాతీ నొప్పి, శ్వాస తీసుకోవడంలో కష్టం లేదా అత్యవసర పరిస్థితుల్లో మీ స్థానిక అత్యవసర నంబర్‌కు ఫోన్ చేయండి.",
      sourceGps: "మీ పరికరం నుండి",
      sourceIp: "మీ నెట్‌వర్క్ ఆధారంగా అంచనా",
      locationUnknown: "మీ ప్రాంతం",
      heatRiskLabels: {
        low: "తక్కువ వేడి",
        moderate: "మధ్యస్థ వేడి",
        high: "ఎక్కువ వేడి",
        very_high: "చాలా ఎక్కువ వేడి",
        extreme: "విపరీతమైన వేడి",
      },
      aqiLabels: {
        good: "మంచి గాలి",
        moderate: "మధ్యస్థ గాలి",
        unhealthy_sensitive: "సున్నితమైన వారికి అనారోగ్యకరం",
        unhealthy: "అనారోగ్యకర గాలి",
        very_unhealthy: "చాలా అనారోగ్యకర గాలి",
        hazardous: "ప్రమాదకర గాలి",
        unknown: "గాలి నాణ్యత అందుబాటులో లేదు",
      },
    },
    trust: {
      label: "వాతావరణ మరియు ఆరోగ్య నిపుణతతో నిర్మితం",
      items: [
        "వాతావరణ డేటా: WHO హీట్ థ్రెషోల్డ్‌లు, IMD & OpenWeather",
        "హైదరాబాద్‌లో మాతృ & పీడియాట్రిక్ క్లినిక్‌లతో పైలట్",
        "WhatsApp Business APIపై నిర్మితం",
      ],
    },
    definition: {
      heading: "dayli అంటే ఏమిటి?",
      bodyStrong: "dayli",
      body: " అనేది మహిళలు మరియు పిల్లల కోసం AI-ఆధారిత క్లైమేట్ హెల్త్ కోపైలట్. ఇది స్థానిక వాతావరణ డేటా, ఆరోగ్య పరిజ్ఞానం మరియు AI వ్యక్తీకరణను కలిపి WhatsApp ద్వారా రియల్-టైమ్, ఉపయోగపడే మార్గదర్శనం అందిస్తుంది — హీట్‌వేవ్‌లు, ఇతర వాతావరణ ఆధారిత ఆరోగ్య ప్రమాదాల్లో గర్భిణీ స్త్రీలు, తల్లులు, సంరక్షకులకు సురక్షితంగా ఉండేలా సహాయపడుతుంది. dayli ఉచితం, యాప్ డౌన్‌లోడ్ అక్కరలేదు, ఇంగ్లీష్, హిందీ, తెలుగు, అరబిక్‌ను సపోర్ట్ చేస్తుంది.",
    },
    problem: {
      eyebrow: "సమస్య",
      heading: "వాతావరణం ఇప్పటికే మీ ఆరోగ్యాన్ని ప్రభావితం చేస్తోంది",
      intro: "ఈ రోజు, వాతావరణాన్ని మీ రోజువారీ ఆరోగ్య నిర్ణయాలతో కలిపే వ్యవస్థ ఏదీ లేదు.",
      cardHeading: "తీవ్ర వేడిమి వీటికి ప్రమాదాన్ని పెంచుతుంది:",
      bullet1: "గర్భిణీ స్త్రీలు",
      bullet2: "చిన్న పిల్లలు",
      cardBody: "నిర్జలీకరణ, అలసట, చేజారిన చికిత్స నివారించగల సమస్యలకు దారితీస్తాయి.",
    },
    solution: {
      eyebrow: "పరిష్కారం",
      heading: "dayliని కలవండి",
      intro: "మీ పరిసరాలకు రియల్-టైమ్‌లో అనుగుణంగా మారే మీ AI ఆరోగ్య సహచరి.",
      bullets: [
        "స్థానిక వాతావరణం, వేడిమిని పర్యవేక్షిస్తుంది",
        "మీ ఆరోగ్య అవసరాలను అర్థం చేసుకుంటుంది",
        "సరళమైన, ఉపయోగపడే సలహాతో రోజువారీగా మార్గనిర్దేశం చేస్తుంది",
      ],
    },
    how: {
      heading: "ఇది ఎలా పనిచేస్తుంది",
      intro: "సరళం, ఉపయోగపడేది, రియల్-టైమ్ మార్గదర్శనం.",
      steps: [
        { title: "మిమ్మల్ని అర్థం చేసుకుంటుంది", body: "మీ గర్భిణి దశ లేదా బిడ్డ వయసు మరియు రోజువారీ స్థానిక పరిస్థితులు తెలుసుకుంటుంది." },
        { title: "వాతావరణ ప్రమాదాన్ని పర్యవేక్షిస్తుంది", body: "హీట్‌వేవ్‌లు, ఉష్ణోగ్రత పెరుగుదలలు, పర్యావరణ ఒత్తిడిని రియల్-టైమ్‌లో ట్రాక్ చేస్తుంది." },
        { title: "రోజువారీ మార్గనిర్దేశం", body: "హైడ్రేషన్ గుర్తుచేతలు, సురక్షిత బయట సమయం, హెచ్చరికలు, చెక్-ఇన్‌లు అందిస్తుంది." },
      ],
    },
    useCase: {
      tagline: "హైదరాబాద్ వేడిమి",
      quote: "\"రేపు: మీ ప్రాంతంలో 45°C\"",
      body: "dayli ముందుగానే హెచ్చరిస్తుంది, హైడ్రేషన్‌, విశ్రాంతి సూచిస్తుంది, పీక్ హీట్ గంటల్ని (మ. 12–4) తప్పించుకోమని చెబుతుంది, మీ లక్షణాల్ని పరిశీలిస్తుంది.",
      disclaimer: "dayli వైద్య నిర్ధారణ కాదు, ఇది కేవలం సహాయక మార్గదర్శనం. అత్యవసర పరిస్థితుల్లో మీ స్థానిక ఆరోగ్య ప్రదాతను సంప్రదించండి.",
      pullQuote: "\"సరళమైన చర్యలు. నిజమైన ప్రభావం.\"",
      chat: {
        intro: "రేపు చాలా వేడిగా ఉంటుంది (45°C). తరచుగా నీరు త్రాగండి మరియు మధ్యాహ్నం 12-4 మధ్య ఇంట్లో ఉండండి.",
        checkin: "ఈరోజు మీరు ఎలా అనిపిస్తున్నారు?",
        options: ["బాగున్నాను", "అలసిపోయాను", "తల తిరుగుతోంది"],
        reply: "అలసిపోయాను",
        clinic: "దయచేసి విశ్రాంతి తీసుకోండి, దగ్గర్లోని క్లినిక్‌కు వెళ్లడాన్ని ఆలోచించండి. మీ కోసం ఒకటి వెతకమంటారా?",
      },
    },
    features: {
      heading: "ఉత్పత్తి ఫీచర్లు",
      items: [
        { title: "రోజువారీ ఆరోగ్య హెచ్చరికలు", body: "వేడిమి లేదా వాతావరణం మిమ్మల్ని ఎప్పుడు ప్రభావితం చేస్తుందో తెలుసుకోండి" },
        { title: "వ్యక్తిగత మార్గదర్శనం", body: "మీ కోసం ప్రత్యేకంగా రూపొందిన సలహా — సాధారణ సిఫార్సులు కాదు" },
        { title: "రోజువారీ చెక్-ఇన్‌లు", body: "మీరు ఎలా ఫీలవుతున్నారో ట్రాక్ చేయండి, అవసరమైనప్పుడు సహాయం పొందండి" },
        { title: "క్లినిక్ మద్దతు (ఐచ్ఛికం)", body: "మీ ఆరోగ్య ప్రదాతతో అనుసంధానంగా ఉండండి" },
      ],
      trustHeading: "నిజ-ప్రపంచ పరిస్థితుల కోసం నిర్మితం",
      trustItems: [
        { title: "WhatsAppలో పనిచేస్తుంది (యాప్ అవసరం లేదు)" },
        { title: "తక్కువ డేటా వినియోగం కోసం రూపొందించబడింది" },
        { title: "అనేక భాషలు సపోర్ట్ చేస్తుంది", sub: "English · हिंदी · తెలుగు · العربية" },
        { title: "మీ డేటా గోప్యంగా ఉంటుంది", sub: "ఎప్పుడూ అమ్మబడదు." },
      ],
      privacyLink: "మా విధానం చదవండి",
    },
    cta: {
      heading: "మీ ఆరోగ్యాన్ని నియంత్రణలో ఉంచండి — ప్రతి రోజూ",
      sub: "సమస్యలు రావడానికి ముందే నివారించండి.",
      button: "WhatsAppలో dayliతో మొదలుపెట్టండి",
    },
  },
  product: {
    seoTitle: "dayli ఎలా పనిచేస్తుంది — WhatsAppలో వాతావరణం, ఆరోగ్యం & AI | dayli.ai",
    seoDescription: "dayli వాతావరణ డేటా, ఆరోగ్య పరిజ్ఞానం, AI వ్యక్తీకరణను కలిపి WhatsApp ద్వారా రియల్-టైమ్, ఉపయోగపడే రోజువారీ మార్గదర్శనం అందిస్తుంది.",
    h1: "dayli ఎలా పనిచేస్తుంది",
    intro: "dayli వాతావరణ డేటా + ఆరోగ్య పరిజ్ఞానం + AI వ్యక్తీకరణను కలిపి రోజువారీ జీవితానికి రియల్-టైమ్, ఉపయోగపడే మార్గదర్శనం అందిస్తుంది.",
    layers: [
      { title: "వాతావరణ అవగాహన", body: "మీ ప్రాంతంలో వేడిమి, పర్యావరణ ప్రమాదాల్ని ట్రాక్ చేస్తుంది." },
      { title: "ఆరోగ్య తెలివి", body: "మీ దశని (గర్భిణి / బాల సంరక్షణ) అర్థం చేసుకుంటుంది." },
      { title: "AI కోపైలట్", body: "మిమ్మల్ని సురక్షితంగా ఉంచే సరళమైన రోజువారీ చర్యలను అందిస్తుంది." },
    ],
    realtime: {
      heading: "అవసరమైనప్పుడు రియల్-టైమ్ మార్గదర్శనం",
      intro: "వాతావరణ తెలివితో శక్తివంతమైన రోజువారీ ఆరోగ్య మార్గదర్శనం. చాట్‌బాట్ కాదు. వెల్‌నెస్ యాప్ కాదు. మారుతున్న వాతావరణంలో ఆరోగ్యానికి రోజువారీ నిర్ణయ పొర.",
      steps: [
        { title: "ఉదయం సందేశం", body: "రోజు అంచనా ఆధారంగా ముందుజాగ్రత్త హెచ్చరికలు." },
        { title: "చెక్-ఇన్", body: "మీ స్థితిని పర్యవేక్షించడానికి సరళమైన చెక్-ఇన్‌లు." },
        { title: "ప్రమాద ప్రతిస్పందన", body: "ప్రమాదం గుర్తించబడితే వెంటనే మార్గదర్శనం." },
      ],
      cta: "WhatsAppలో dayli అనుభవించండి",
      chat: {
        msg1: "ఈరోజు చాలా వేడిగా ఉంటుంది (44°C). ప్రతి గంటకు నీరు త్రాగండి, మ. 12–4 మధ్య బయటకు వెళ్లకండి.",
        checkin: "ఈరోజు మీరు ఎలా అనిపిస్తున్నారు?",
        options: ["బాగున్నాను", "అలసిపోయాను", "తల తిరుగుతోంది"],
        reply: "తల తిరుగుతోంది",
        rest: "దయచేసి విశ్రాంతి తీసుకోండి, దగ్గర్లోని క్లినిక్‌కు వెళ్లడాన్ని ఆలోచించండి.",
      },
    },
  },
  clinics: {
    seoTitle: "క్లినిక్‌ల కోసం dayli — తక్కువ నో-షోలు, మెరుగైన ఫలితాలు | dayli.ai",
    seoDescription: "తీవ్ర వాతావరణ సమయాల్లో మిస్ అయిన అపాయింట్‌మెంట్‌లను తగ్గించడానికి, విజిట్‌ల మధ్య రోగులను నిమగ్నం చేయడానికి, అధిక-ప్రమాద రోగులను ముందుగా గుర్తించడానికి dayli క్లినిక్‌లకు సహాయపడుతుంది.",
    badge: "క్లినిక్‌లు మరియు ప్రదాతల కోసం",
    h1: "నో-షోలను తగ్గించండి. రోగుల ఫలితాలను మెరుగుపరచండి.",
    intro: "తీవ్ర వాతావరణ సమయాల్లో మిస్ అయిన అపాయింట్‌మెంట్‌లను తగ్గించడానికి, విజిట్‌ల మధ్య రోగులను నిమగ్నం చేయడానికి, అధిక-ప్రమాద రోగులను ముందుగా గుర్తించడానికి dayli క్లినిక్‌లకు సహాయపడుతుంది.",
    howHeading: "క్లినిక్‌లకు ఇది ఎలా పనిచేస్తుంది",
    steps: [
      { title: "రోగులు WhatsApp ద్వారా జాయిన్ అవుతారు", body: "యాప్ డౌన్‌లోడ్‌లు లేదా పాస్‌వర్డ్‌లు లేకుండా సులువైన ఆన్‌బోర్డింగ్." },
      { title: "రోజువారీ మార్గదర్శనం, గుర్తుచేతలు", body: "రోగులు వాతావరణ-అవగాహనతో కూడిన ఆరోగ్య సలహా, అపాయింట్‌మెంట్ గుర్తుచేతలు పొందుతారు." },
      { title: "క్లినిక్ డాష్‌బోర్డ్", body: "రియల్-టైమ్‌లో అధిక-ప్రమాద రోగులను, నిమగ్నతను చూడండి, ప్రాధాన్యత ఇవ్వండి." },
    ],
    benefitsHeading: "ముఖ్య ప్రయోజనాలు",
    benefits: ["అపాయింట్‌మెంట్ పాటించడం పెరుగుతుంది", "రోగి సంతృప్తి మెరుగవుతుంది", "మెరుగైన ఆరోగ్య ఫలితాలు"],
    formHeading: "dayliతో భాగస్వామ్యం",
    formIntro: "మీ క్లినిక్ గురించి కొంచెం చెప్పండి, మా బృందం సంప్రదిస్తుంది.",
    formNotice: "మేము 2 పనిదినాల్లో 20-నిమిషాల పరిచయ కాల్‌తో స్పందిస్తాము.",
    fields: {
      name: "పూర్తి పేరు", namePh: "డా. జాహ్నవి శర్మ",
      role: "మీ పాత్ర", rolePh: "మీ పాత్ర ఎంచుకోండి",
      roleOptions: ["డాక్టర్", "క్లినిక్ అడ్మినిస్ట్రేటర్", "కేర్ కోఆర్డినేటర్", "ఇతర"],
      clinic: "క్లినిక్ పేరు", clinicPh: "సిటీ హెల్త్ క్లినిక్",
      patients: "నెలకు సుమారు రోగులు", patientsPh: "ఉదా. 800",
      city: "నగరం / ప్రాంతం", cityPh: "హైదరాబాద్",
      email: "ఇమెయిల్ చిరునామా", emailPh: "name@clinic.com",
      message: "సందేశం (ఐచ్ఛికం)", messagePh: "dayli మీ క్లినిక్‌కి ఎలా సహాయపడుతుంది?",
    },
    submit: "dayliతో భాగస్వామ్యం",
    submitting: "పంపుతోంది...",
    consent: "సమర్పించడం ద్వారా dayli భాగస్వామ్యం గురించి సంప్రదించడానికి అంగీకరిస్తున్నారు. మీ వివరాలు ఎప్పుడూ పంచుకోము.",
    toastSuccessTitle: "మీ ఆసక్తికి ధన్యవాదాలు!",
    toastSuccessBody: "మేము 2 పనిదినాల్లో 20-నిమిషాల పరిచయ కాల్‌తో స్పందిస్తాము.",
    toastErrorTitle: "ఏదో తప్పయింది",
    toastErrorBody: "మళ్ళీ ప్రయత్నించండి, లేదా మాకు నేరుగా ఇమెయిల్ చేయండి.",
  },
  pharma: {
    seoTitle: "ఫార్మా కోసం dayli — వాతావరణ-అవగాహన పాటింపు | dayli.ai",
    seoDescription: "హీట్‌వేవ్‌లు, పర్యావరణ ఒత్తిడి సమయాల్లో రోగులు పాటింపును వదిలేస్తారు. dayli అత్యంత అవసరమైన సమయంలో నిరంతర నిమగ్నతను నిర్ధారిస్తుంది.",
    badge: "ఫార్మా & లైఫ్ సైన్సెస్ కోసం",
    h1: "వాస్తవ పరిస్థితుల్లో పాటింపును మెరుగుపరచండి",
    intro: "హీట్‌వేవ్‌లు, పర్యావరణ ఒత్తిడి సమయాల్లో రోగులు తరచుగా పాటింపును వదిలేస్తారు. dayli అత్యంత అవసరమైన సమయంలో నిరంతర నిమగ్నతను నిర్ధారిస్తుంది.",
    problemHeading: "సమస్య",
    problemIntro: "రోగులు తరచుగా ఈ సమయాల్లో పాటింపును వదిలేస్తారు:",
    problemBullets: ["హీట్‌వేవ్‌లు", "పర్యావరణ ఒత్తిడి"],
    solutionHeading: "పరిష్కారం",
    solutionIntro: "dayli నిర్ధారిస్తుంది:",
    solutionBullets: ["నిరంతర నిమగ్నత", "వాతావరణ-అవగాహన పాటింపు గుర్తుచేతలు", "మెరుగైన చికిత్స ఫలితాలు"],
    useCasesHeading: "ముఖ్య వినియోగ సందర్భాలు",
    useCases: ["దీర్ఘకాలిక పరిస్థితులు", "మాతృ ఆరోగ్యం", "పీడియాట్రిక్ సంరక్షణ"],
    formHeading: "మాతో భాగస్వామ్యం",
    formIntro: "మీ పోర్ట్‌ఫోలియోల కోసం పాటింపు పరిష్కారాలను చర్చించండి.",
    formNotice: "మేము 2 పనిదినాల్లో అనుకూలమైన పరిచయ కాల్‌తో స్పందిస్తాము.",
    fields: {
      name: "పూర్తి పేరు", namePh: "జాన్ స్మిత్",
      company: "కంపెనీ పేరు", companyPh: "PharmaCorp Inc.",
      therapeutic: "థెరప్యూటిక్ ప్రాంతం", therapeuticPh: "ప్రాంతం ఎంచుకోండి",
      therapeuticOptions: ["మాతృ & మహిళా ఆరోగ్యం", "పీడియాట్రిక్స్", "కార్డియోమెటబాలిక్", "శ్వాసకోశ", "ఇతర"],
      email: "వర్క్ ఇమెయిల్", emailPh: "john@pharmacorp.com",
      message: "సందేశం (ఐచ్ఛికం)", messagePh: "మీ ఆసక్తి ఉన్న థెరప్యూటిక్ ప్రాంతాల గురించి చెప్పండి",
    },
    submit: "విచారణ సమర్పించండి",
    submitting: "పంపుతోంది...",
    consent: "సమర్పించడం ద్వారా dayli భాగస్వామ్యం గురించి సంప్రదించడానికి అంగీకరిస్తున్నారు. మీ వివరాలు ఎప్పుడూ పంచుకోము.",
    toastSuccessTitle: "మీ ఆసక్తికి ధన్యవాదాలు!",
    toastSuccessBody: "మా భాగస్వామ్య బృందం 2 పనిదినాల్లో సంప్రదిస్తుంది.",
    toastErrorTitle: "ఏదో తప్పయింది",
    toastErrorBody: "మళ్ళీ ప్రయత్నించండి, లేదా మాకు నేరుగా ఇమెయిల్ చేయండి.",
  },
  about: {
    seoTitle: "dayli గురించి — ఆరోగ్యానికి రోజువారీ నిర్ణయ పొర | dayli.ai",
    seoDescription: "మారుతున్న వాతావరణంలో ఆరోగ్య సంరక్షణను అనుకూలం, వ్యక్తిగతం, ముందస్తుగా చేయడమే dayli లక్ష్యం. మా దృష్టి, ‘ఇప్పుడు ఎందుకు’ తెలుసుకోండి.",
    h1: "dayli గురించి",
    intro: "మారుతున్న వాతావరణంలో ఆరోగ్యానికి ఒక రోజువారీ నిర్ణయ పొర.",
    missionHeading: "లక్ష్యం",
    mission: "\"మారుతున్న వాతావరణంలో ఆరోగ్య సంరక్షణను అనుకూలం, వ్యక్తిగతం, ముందస్తుగా చేయడం.\"",
    visionHeading: "దృష్టి",
    vision: "\"ప్రతి వ్యక్తికి తమ పరిసరాల ఆధారంగా రియల్-టైమ్ ఆరోగ్య మార్గదర్శనం అందుబాటులో ఉండే ప్రపంచం.\"",
    whyNowHeading: "ఇప్పుడు ఎందుకు",
    whyNow: [
      { title: "వాతావరణ ప్రమాదాలు పెరుగుతున్నాయి", body: "తీవ్ర వాతావరణ ఘటనలు తరచుగా జరుగుతున్నాయి, నేరుగా హాని కలిగే వర్గాలను ప్రభావితం చేస్తున్నాయి." },
      { title: "AI రియల్-టైమ్ నిర్ణయాలు సాధ్యం చేస్తుంది", body: "ఇప్పుడు మనకు సంక్లిష్ట డేటాను ప్రాసెస్ చేసి తక్షణమే వ్యక్తిగత మార్గదర్శనం ఇవ్వగల సాంకేతికత ఉంది." },
      { title: "మొబైల్ యాక్సెస్ సర్వత్రా", body: "WhatsApp వంటి ప్లాట్‌ఫారమ్‌లు బిలియన్లను చేరతాయి, ఎక్కడైనా సంరక్షణ అందించడం సాధ్యం." },
    ],
  },
  privacy: {
    seoTitle: "dayli గోప్యత — మీ డేటా, మీ నియంత్రణ | dayli.ai",
    seoDescription: "dayli మీ సమాచారాన్ని ఎలా సేకరిస్తుంది, ఉపయోగిస్తుంది, రక్షిస్తుంది. మీ డేటా ఎప్పుడూ అమ్మబడదు, మీ స్పష్టమైన అనుమతి లేకుండా వ్యక్తిగత ఆరోగ్య డేటా పంచుకోబడదు.",
    badge: "మీ డేటా, మీ నియంత్రణ",
    h1: "dayli వద్ద గోప్యత",
    intro: "dayli మహిళలు, పిల్లలకు సున్నితమైన ఆరోగ్య మార్గదర్శనం అందిస్తుంది. ఆ బాధ్యతకు తగినట్లుగా మీ డేటాను జాగ్రత్తగా చూసుకుంటాము.",
    sections: [
      { heading: "మేం ఏం సేకరిస్తాము", body: "సురక్షితమైన, వ్యక్తిగత మార్గదర్శనం ఇవ్వడానికి అవసరమైనది మాత్రమే: మీ WhatsApp నంబర్, గర్భిణి దశ లేదా బిడ్డ వయసు, సుమారు ప్రాంతం, మీరు పంచుకునే రోజువారీ చెక్-ఇన్‌లు." },
      { heading: "మేం దీనిని ఎలా ఉపయోగిస్తాము", body: "మీ సమాచారాన్ని స్థానిక వాతావరణ సంకేతాలతో కలిపి dayli సంబంధిత హెచ్చరికలు, హైడ్రేషన్ గుర్తుచేతలు, చెక్-ఇన్‌లు పంపేందుకు. ప్రకటనల కోసం ఎప్పుడూ ఉపయోగించబడదు." },
      { heading: "మేం ఏం చేయము", bullets: [
        "మార్కెటింగ్ కోసం మీ వ్యక్తిగత డేటాను మూడవ పక్షాలతో అమ్మము లేదా పంచుకోము.",
        "మీ స్పష్టమైన అనుమతి లేకుండా వ్యక్తిగత ఆరోగ్య డేటాను క్లినిక్‌లు లేదా ఫార్మా భాగస్వాములతో పంచుకోము.",
        "సేవకు అవసరమైన దానికంటే ఎక్కువ సమయం WhatsApp సందేశ కంటెంట్‌ను నిల్వ చేయము.",
      ]},
      { heading: "మీ ఎంపికలు", body: "మీరు ఎప్పుడైనా WhatsAppలో STOP అని ప్రత్యుత్తరిస్తే dayliని పాజ్ చేయవచ్చు. డేటా తొలగించమని DELETE ప్రత్యుత్తరించడం ద్వారా లేదా మా బృందాన్ని సంప్రదించడం ద్వారా అడగొచ్చు." },
      { heading: "ముఖ్య సూచన", body: "dayli వైద్య పరికరం కాదు, వృత్తిపరమైన వైద్య సలహాకు ప్రత్యామ్నాయం కాదు. ఏవైనా అత్యవసరాల్లో, వెంటనే మీ స్థానిక ఆరోగ్య ప్రదాతను లేదా అత్యవసర సేవలను సంప్రదించండి." },
    ],
    note: "ఈ పేజీ మా నిబద్ధతలను వివరిస్తుంది. పూర్తి చట్టపరమైన గోప్యతా విధానం సిద్ధం అవుతోంది మరియు ఈ సారాంశాన్ని భర్తీ చేస్తుంది.",
  },
  notFound: {
    seoTitle: "పేజీ కనుగొనబడలేదు — dayli.ai",
    seoDescription: "మీరు వెతుకుతున్న పేజీ లేదు.",
    eyebrow: "404",
    h1: "పేజీ కనుగొనబడలేదు",
    body: "మీరు వెతుకుతున్న పేజీ లేదు లేదా తరలించబడింది.",
    cta: "హోమ్‌కు తిరిగి వెళ్లండి",
  },
};

const ar: PageContent = {
  layout: {
    nav: { product: "المنتج", clinics: "للعيادات", pharma: "لشركات الأدوية", about: "من نحن" },
    ctaWhatsapp: "ابدأ على واتساب",
    whatsappPending: "إعداد واتساب قيد التجهيز — اتركوا بياناتكم أدناه وسنتواصل معكم فور تفعيله.",
    whatsappSoon: "قريباً",
    languageMenuLabel: "اللغة",
    languageBanner: {
      prompt: "هل تفضّل عرض هذا الموقع باللغة العربية؟",
      accept: "تابع بالعربية",
      dismiss: "لا، شكرًا",
    },
    footer: {
      tagline: "طبقة قرار يومية للصحة في مناخ متغيّر.",
      solutions: "الحلول",
      company: "الشركة",
      getStarted: "ابدأ الآن",
      product: "المنتج",
      clinics: "للعيادات",
      pharma: "لشركات الأدوية",
      about: "من نحن",
      privacy: "الخصوصية",
      connect: "تواصل عبر واتساب",
      copyright: (year) => `© ${year} dayli.ai. جميع الحقوق محفوظة.`,
      disclaimer: "ليس جهازًا طبيًا. استشر دائمًا أخصائي رعاية صحية في حالات الطوارئ الطبية.",
    },
  },
  ctaMicrocopy: "مجاني · لا تطبيق للتنزيل · انضم في أقل من دقيقة · بياناتك تبقى خاصة.",
  faq: [
    { q: "ما هو dayli؟", a: "dayli هو مساعد صحي مناخي مدعوم بالذكاء الاصطناعي للنساء والأطفال. يجمع بين بيانات المناخ المحلية وسياقك الصحي الشخصي ليقدّم إرشادات يومية قابلة للتنفيذ عبر واتساب." },
    { q: "هل dayli جهاز طبي؟", a: "لا. dayli ليس جهازًا طبيًا ولا يحلّ محل المشورة الطبية المتخصصة. في أي حالة طارئة، تواصل فورًا مع مقدّم الرعاية الصحية المحلي أو خدمات الطوارئ." },
    { q: "كيف يستخدم dayli بياناتي؟", a: "فقط لتقديم إرشادات آمنة ومخصّصة. نجمع إشارات المناخ المحلية مع سياقك الشخصي لإرسال تنبيهات وتذكيرات بشرب الماء وفحوصات يومية. لا تُباع بياناتك أبدًا ولا تُستخدم للإعلانات، ولا تُشارك البيانات الصحية الفردية مع العيادات أو شركات الأدوية دون موافقتك الصريحة." },
    { q: "ما اللغات التي يدعمها dayli؟", a: "يدعم dayli حاليًا الإنجليزية والهندية والتيلجو والعربية." },
    { q: "كم تكلفة dayli؟", a: "dayli مجاني للاستخدام. لا يوجد تطبيق للتنزيل — يستغرق التسجيل أقل من دقيقة عبر واتساب." },
    { q: "من أين يحصل dayli على بيانات المناخ؟", a: "يستخدم dayli عتبات الحرارة لمنظمة الصحة العالمية، وقسم الأرصاد الجوية الهندي (IMD)، وOpenWeather لرصد الحرارة المحلية والمخاطر البيئية في الوقت الفعلي." },
    { q: "لمن صُمم dayli؟", a: "صُمم dayli للنساء الحوامل والأمهات ومقدّمي الرعاية للأطفال الصغار — وهم الفئات الأكثر عرضة للحرارة الشديدة والمخاطر الصحية المرتبطة بالمناخ." },
  ],
  faqSection: {
    eyebrow: "الأسئلة الشائعة",
    heading: "أسئلة عن dayli",
    intro: "إجابات قصيرة ومباشرة عن طريقة عمل dayli وتكلفته وكيفية تعاملنا مع بياناتك.",
  },
  home: {
    seoTitle: "dayli.ai — مساعد صحي مناخي بالذكاء الاصطناعي للنساء والأطفال",
    seoDescription: "dayli مساعد صحي مناخي مدعوم بالذكاء الاصطناعي للنساء والأطفال. إرشاد فوري ومخصّص عبر واتساب — يجمع بيانات المناخ والمعرفة الصحية والذكاء الاصطناعي.",
    badge: "مساعد صحي مناخي بالذكاء الاصطناعي",
    h1: "صحتك اليومية، مدعومة بذكاء المناخ",
    p1: "ذكاء اصطناعي يساعد النساء والأطفال على البقاء آمنين وأصحّاء وخطوة قبل الحرارة الشديدة ومخاطر المناخ.",
    p2: "رفيق على واتساب — لا تطبيق تحمّله.",
    ctaPrimary: "ابدأ على واتساب",
    ctaSecondary: "للعيادات والشركاء",
    tagline: "ليس روبوت محادثة. ليس تطبيق عافية. طبقة قرار يومية للصحة.",
    chatHero: "غدًا سيكون شديد الحرارة (45°م). اشربي الماء بكثرة وابقَي داخل المنزل بين الساعة 12 و4 ظهرًا.",
    chatDemo: {
      title: "مساعد dayli",
      subtitle: "عرض مباشر — إرشادات صحية مرتبطة بالطقس",
      introHeading: "جرّبي محادثة حية",
      introBody: "شاركي موقعك واطرحي سؤالًا. سيستخدم dayli الطقس وجودة الهواء المحلية اليوم لتقديم إرشادات عملية بلغة بسيطة.",
      startButton: "استخدمي موقعي",
      loading: "جارٍ قراءة الطقس وجودة الهواء المحلية…",
      retry: "حاولي مرة أخرى",
      errorBody: "تعذّر الوصول إلى خدمة الأحوال المحلية. يُرجى المحاولة مجددًا.",
      examplesLabel: "جرّبي إحدى هذه:",
      examplePrompts: [
        "طفلي يعاني من الربو. هل اللعب خارج المنزل آمن بعد ظهر اليوم؟",
        "لديّ ارتفاع في ضغط الدم. أي نصائح لحرّ اليوم؟",
        "هل الهواء نظيف بما يكفي للمشي صباحًا؟",
      ],
      inputPlaceholder: "اسألي عن طقس اليوم أو جودة الهواء أو الأعراض…",
      inputDisabledPlaceholder: "شاركي موقعك لبدء العرض",
      sendLabel: "إرسال",
      formLabel: "محادثة مع dayli",
      disclaimer: "هذا عرض توضيحي فقط. إرشادات تثقيفية — وليست تشخيصًا طبيًا. اتصلي برقم الطوارئ المحلي عند ألم الصدر أو ضيق التنفس أو أي حالة طارئة.",
      sourceGps: "من جهازك",
      sourceIp: "تقدير من شبكتك",
      locationUnknown: "منطقتك",
      heatRiskLabels: {
        low: "حرارة منخفضة",
        moderate: "حرارة معتدلة",
        high: "حرارة مرتفعة",
        very_high: "حرارة مرتفعة جدًا",
        extreme: "حرارة شديدة",
      },
      aqiLabels: {
        good: "هواء جيد",
        moderate: "هواء معتدل",
        unhealthy_sensitive: "غير صحي للفئات الحساسة",
        unhealthy: "هواء غير صحي",
        very_unhealthy: "هواء غير صحي جدًا",
        hazardous: "هواء خطير",
        unknown: "جودة الهواء غير متاحة",
      },
    },
    trust: {
      label: "مبنيّ بخبرة مناخية وصحية",
      items: [
        "بيانات المناخ: عتبات WHO الحرارية وIMD وOpenWeather",
        "تجربة تجريبية مع عيادات الأمومة والأطفال في حيدر آباد",
        "مبنيّ على WhatsApp Business API",
      ],
    },
    definition: {
      heading: "ما هو dayli؟",
      bodyStrong: "dayli",
      body: " مساعد صحي مناخي مدعوم بالذكاء الاصطناعي للنساء والأطفال. يجمع بيانات المناخ المحلية والمعرفة الصحية وتخصيص الذكاء الاصطناعي ليقدّم إرشادات فورية وقابلة للتنفيذ عبر واتساب — يساعد النساء الحوامل والأمهات ومقدّمي الرعاية على البقاء آمنين خلال موجات الحر وغيرها من المخاطر الصحية المرتبطة بالمناخ. dayli مجاني، لا يحتاج إلى تنزيل تطبيق، ويدعم الإنجليزية والهندية والتيلجو والعربية.",
    },
    problem: {
      eyebrow: "المشكلة",
      heading: "المناخ يؤثر فعليًا على صحتك",
      intro: "اليوم، لا يوجد نظام يربط المناخ بقراراتك الصحية اليومية.",
      cardHeading: "الحرارة الشديدة تزيد المخاطر على:",
      bullet1: "النساء الحوامل",
      bullet2: "الأطفال الصغار",
      cardBody: "الجفاف والإرهاق وفقدان مواعيد الرعاية تؤدي إلى مضاعفات يمكن تجنّبها.",
    },
    solution: {
      eyebrow: "الحل",
      heading: "تعرّف على dayli",
      intro: "رفيقك الصحي بالذكاء الاصطناعي الذي يتكيّف مع بيئتك في الوقت الفعلي.",
      bullets: [
        "يتابع الطقس المحلي وظروف الحرارة",
        "يفهم احتياجاتك الصحية",
        "يرشدك يوميًا بنصائح بسيطة وقابلة للتنفيذ",
      ],
    },
    how: {
      heading: "كيف يعمل",
      intro: "إرشاد بسيط، عملي، وفي الوقت الفعلي.",
      steps: [
        { title: "يفهمك", body: "يعرف مرحلة حملك أو عمر طفلك وظروف موقعك اليومية." },
        { title: "يراقب مخاطر المناخ", body: "يتتبّع موجات الحر وارتفاعات الحرارة والإجهاد البيئي في الوقت الفعلي." },
        { title: "يرشدك يوميًا", body: "يرسل تذكيرات بشرب الماء، أوقات آمنة للخروج، تنبيهات وفحوصات." },
      ],
    },
    useCase: {
      tagline: "حر حيدر آباد",
      quote: "\"غدًا: 45°م في منطقتك\"",
      body: "سيُنبّهك dayli مسبقًا، ويوصي بالترطيب والراحة، ويقترح تجنّب ساعات ذروة الحرارة (12–4 ظهرًا)، ويتفقّد أعراضك.",
      disclaimer: "يقدّم dayli إرشادًا داعمًا، وليس تشخيصًا طبيًا. في الطوارئ تواصل مع مقدّم الرعاية المحلي.",
      pullQuote: "\"خطوات بسيطة. أثر حقيقي.\"",
      chat: {
        intro: "غدًا سيكون شديد الحرارة (45°م). اشربي الماء بكثرة وابقَي داخل المنزل بين الساعة 12 و4 ظهرًا.",
        checkin: "كيف تشعرين اليوم؟",
        options: ["بخير", "متعبة", "بدوار"],
        reply: "متعبة",
        clinic: "يرجى أن ترتاحي وتفكري في زيارة عيادة قريبة. هل تريدين أن أبحث لكِ عن واحدة؟",
      },
    },
    features: {
      heading: "مزايا المنتج",
      items: [
        { title: "تنبيهات صحية يومية", body: "اعرف متى يمكن للحرارة أو الطقس أن يؤثرا عليك" },
        { title: "إرشاد مخصّص", body: "نصائح مفصّلة لك — ليست توصيات عامة" },
        { title: "فحوصات يومية", body: "تابع شعورك واحصل على المساعدة عند الحاجة" },
        { title: "دعم العيادة (اختياري)", body: "ابقَ متّصلًا بمقدّم الرعاية الصحية" },
      ],
      trustHeading: "مبنيّ لظروف العالم الحقيقي",
      trustItems: [
        { title: "يعمل على واتساب (لا حاجة لتطبيق)" },
        { title: "مصمّم لاستهلاك بيانات منخفض" },
        { title: "يدعم لغات متعدّدة", sub: "English · हिंदी · తెలుగు · العربية" },
        { title: "بياناتك تبقى خاصة", sub: "لا تُباع أبدًا." },
      ],
      privacyLink: "اقرأ نهجنا",
    },
    cta: {
      heading: "تحكّم في صحتك — كل يوم",
      sub: "امنع المشاكل قبل حدوثها.",
      button: "ابدأ مع dayli على واتساب",
    },
  },
  product: {
    seoTitle: "كيف يعمل dayli — المناخ والصحة والذكاء الاصطناعي على واتساب | dayli.ai",
    seoDescription: "يجمع dayli بيانات المناخ والمعرفة الصحية وتخصيص الذكاء الاصطناعي ليقدّم إرشادًا يوميًا فوريًا وقابلًا للتنفيذ عبر واتساب.",
    h1: "كيف يعمل dayli",
    intro: "يجمع dayli بيانات المناخ + المعرفة الصحية + تخصيص الذكاء الاصطناعي ليقدّم إرشادًا فوريًا وقابلًا للتنفيذ في الحياة اليومية.",
    layers: [
      { title: "وعي المناخ", body: "يتابع الحرارة والمخاطر البيئية في منطقتك." },
      { title: "ذكاء صحي", body: "يفهم مرحلتك (حمل / رعاية أطفال)." },
      { title: "مساعد ذكي", body: "يقدّم خطوات يومية بسيطة لإبقائك آمنًا." },
    ],
    realtime: {
      heading: "إرشاد فوري عند الحاجة الأهم",
      intro: "إرشاد صحي يومي مدعوم بذكاء المناخ. ليس روبوت محادثة. ليس تطبيق عافية. طبقة قرار يومية للصحة في مناخ متغيّر.",
      steps: [
        { title: "رسالة الصباح", body: "تنبيهات استباقية بناءً على توقعات اليوم." },
        { title: "فحص", body: "فحوصات بسيطة لمتابعة حالتك." },
        { title: "استجابة للمخاطر", body: "إرشاد فوري عند رصد خطر." },
      ],
      cta: "جرّب dayli على واتساب",
      chat: {
        msg1: "اليوم سيكون شديد الحرارة (44°م). اشربي الماء كل ساعة وتجنّبي الخروج بين الساعة 12 و4 ظهرًا.",
        checkin: "كيف تشعرين اليوم؟",
        options: ["بخير", "متعبة", "بدوار"],
        reply: "بدوار",
        rest: "يرجى أن ترتاحي وتفكري في زيارة عيادة قريبة.",
      },
    },
  },
  clinics: {
    seoTitle: "dayli للعيادات — تقليل الغياب وتحسين النتائج | dayli.ai",
    seoDescription: "يساعد dayli العيادات على تقليل المواعيد الفائتة خلال الطقس الشديد، وإبقاء المرضى منخرطين بين الزيارات، والتعرّف مبكرًا على المرضى الأكثر عرضة للخطر.",
    badge: "للعيادات ومقدّمي الرعاية",
    h1: "قلّل الغياب. حسّن نتائج المرضى.",
    intro: "يساعد dayli العيادات على تقليل المواعيد الفائتة خلال الطقس الشديد، وإبقاء المرضى منخرطين بين الزيارات، والتعرّف مبكرًا على المرضى الأكثر عرضة للخطر.",
    howHeading: "كيف يعمل للعيادات",
    steps: [
      { title: "ينضم المرضى عبر واتساب", body: "تسجيل سلس بدون تطبيقات أو كلمات مرور." },
      { title: "إرشاد وتذكيرات يومية", body: "يتلقى المرضى نصائح صحية مراعية للمناخ وتذكيرات بالمواعيد." },
      { title: "لوحة العيادة", body: "تابع المرضى الأكثر عرضة للخطر ومستويات الانخراط في الوقت الفعلي لتحديد الأولويات." },
    ],
    benefitsHeading: "أهم الفوائد",
    benefits: ["زيادة الالتزام بالمواعيد", "تحسين رضا المرضى", "نتائج صحية أفضل"],
    formHeading: "كن شريكًا لـ dayli",
    formIntro: "أخبرنا قليلًا عن عيادتك وسيتواصل فريقنا معك.",
    formNotice: "نردّ خلال يومَي عمل بمكالمة تعريفية مدتها 20 دقيقة.",
    fields: {
      name: "الاسم الكامل", namePh: "د. سارة المنصوري",
      role: "دورك", rolePh: "اختر دورك",
      roleOptions: ["طبيب", "مدير عيادة", "منسّق رعاية", "أخرى"],
      clinic: "اسم العيادة", clinicPh: "عيادة المدينة الصحية",
      patients: "عدد المرضى تقريبًا / شهر", patientsPh: "مثلاً 800",
      city: "المدينة / المنطقة", cityPh: "حيدر آباد",
      email: "البريد الإلكتروني", emailPh: "name@clinic.com",
      message: "رسالة (اختياري)", messagePh: "كيف يمكن لـ dayli مساعدة عيادتك؟",
    },
    submit: "كن شريكًا لـ dayli",
    submitting: "جارٍ الإرسال...",
    consent: "بإرسال النموذج توافق على التواصل معك بشأن شراكة dayli. لن نشارك معلوماتك مع أحد.",
    toastSuccessTitle: "شكرًا لاهتمامك!",
    toastSuccessBody: "سنردّ خلال يومَي عمل بمكالمة تعريفية مدتها 20 دقيقة.",
    toastErrorTitle: "حدث خطأ ما",
    toastErrorBody: "يرجى المحاولة مجددًا أو مراسلتنا مباشرة.",
  },
  pharma: {
    seoTitle: "dayli لشركات الأدوية — التزام واعٍ بالمناخ | dayli.ai",
    seoDescription: "يتراجع التزام المرضى خلال موجات الحر والإجهاد البيئي. يضمن dayli انخراطًا مستمرًا حين يحتاج المرضى ذلك أكثر.",
    badge: "لشركات الأدوية وعلوم الحياة",
    h1: "حسّن الالتزام في الظروف الواقعية",
    intro: "يتراجع التزام المرضى غالبًا خلال موجات الحر والإجهاد البيئي. يضمن dayli انخراطًا مستمرًا حين يحتاج المرضى ذلك أكثر.",
    problemHeading: "المشكلة",
    problemIntro: "غالبًا ما يتراجع التزام المرضى خلال:",
    problemBullets: ["موجات الحر", "الإجهاد البيئي"],
    solutionHeading: "الحل",
    solutionIntro: "يضمن dayli:",
    solutionBullets: ["انخراطًا مستمرًا", "تذكيرات التزام واعية بالمناخ", "نتائج علاج أفضل"],
    useCasesHeading: "حالات الاستخدام الأساسية",
    useCases: ["الحالات المزمنة", "صحة الأم", "رعاية الأطفال"],
    formHeading: "كن شريكًا معنا",
    formIntro: "ناقش حلول الالتزام الخاصة بمحفظتك.",
    formNotice: "نردّ خلال يومَي عمل بمكالمة تعريفية مخصّصة.",
    fields: {
      name: "الاسم الكامل", namePh: "أحمد علي",
      company: "اسم الشركة", companyPh: "PharmaCorp Inc.",
      therapeutic: "المجال العلاجي", therapeuticPh: "اختر مجالًا",
      therapeuticOptions: ["صحة الأم والمرأة", "طب الأطفال", "القلب والأيض", "الجهاز التنفسي", "أخرى"],
      email: "بريد العمل", emailPh: "name@pharmacorp.com",
      message: "رسالة (اختياري)", messagePh: "أخبرنا عن المجالات العلاجية التي تهمّك",
    },
    submit: "إرسال الاستفسار",
    submitting: "جارٍ الإرسال...",
    consent: "بإرسال النموذج توافق على التواصل معك بشأن شراكة dayli. لن نشارك معلوماتك مع أحد.",
    toastSuccessTitle: "شكرًا لاهتمامك!",
    toastSuccessBody: "سيتواصل فريق الشراكات معك خلال يومَي عمل.",
    toastErrorTitle: "حدث خطأ ما",
    toastErrorBody: "يرجى المحاولة مجددًا أو مراسلتنا مباشرة.",
  },
  about: {
    seoTitle: "عن dayli — طبقة قرار يومية للصحة | dayli.ai",
    seoDescription: "مهمة dayli جعل الرعاية الصحية متكيّفة ومخصّصة واستباقية في مناخ متغيّر. تعرّف على رؤيتنا ولماذا الآن.",
    h1: "عن dayli",
    intro: "طبقة قرار يومية للصحة في مناخ متغيّر.",
    missionHeading: "المهمة",
    mission: "\"جعل الرعاية الصحية متكيّفة ومخصّصة واستباقية في مناخ متغيّر.\"",
    visionHeading: "الرؤية",
    vision: "\"عالم يحصل فيه كل فرد على إرشاد صحي فوري بناءً على بيئته.\"",
    whyNowHeading: "لماذا الآن",
    whyNow: [
      { title: "مخاطر المناخ تتزايد", body: "أحداث الطقس الشديد تتكرر، وتؤثر مباشرة على الفئات الأكثر هشاشة." },
      { title: "الذكاء الاصطناعي يتيح القرار الفوري", body: "أصبح لدينا الآن التقنية لمعالجة بيانات معقّدة وتقديم إرشاد مخصّص فورًا." },
      { title: "الوصول عبر الجوال أصبح شاملًا", body: "منصات مثل واتساب تصل إلى المليارات، ما يجعل تقديم الرعاية في كل مكان ممكنًا." },
    ],
  },
  privacy: {
    seoTitle: "الخصوصية في dayli — بياناتك تحت سيطرتك | dayli.ai",
    seoDescription: "كيف يجمع dayli بياناتك ويستخدمها ويحميها. لا تُباع بياناتك أبدًا، ولا تُشارك البيانات الصحية الفردية دون موافقتك الصريحة.",
    badge: "بياناتك تحت سيطرتك",
    h1: "الخصوصية في dayli",
    intro: "يقدّم dayli إرشادًا صحيًا حسّاسًا للنساء والأطفال. نتعامل مع بياناتك بالعناية التي تستحقها هذه المسؤولية.",
    sections: [
      { heading: "ما الذي نجمعه", body: "فقط ما يلزم لتقديم إرشاد آمن ومخصّص: رقم واتساب، مرحلة الحمل أو عمر الطفل، الموقع التقريبي، وردود الفحوصات اليومية التي تختار مشاركتها." },
      { heading: "كيف نستخدمه", body: "نستخدم معلوماتك لجمع إشارات المناخ المحلية مع سياقك الشخصي حتى يتمكّن dayli من إرسال تنبيهات وتذكيرات وفحوصات. لا تُستخدم أبدًا للإعلانات." },
      { heading: "ما لا نفعله", bullets: [
        "لا نبيع أو نشارك بياناتك الشخصية مع جهات خارجية لأغراض تسويقية.",
        "لا نشارك البيانات الصحية الفردية مع العيادات أو شركات الأدوية دون موافقتك الصريحة.",
        "لا نخزّن محتوى رسائل واتساب أكثر من المدة اللازمة لتقديم الخدمة.",
      ]},
      { heading: "خياراتك", body: "يمكنك إيقاف dayli في أي وقت بإرسال STOP عبر واتساب. ويمكنك طلب حذف بياناتك بالردّ DELETE أو بالتواصل مع فريقنا." },
      { heading: "تنبيه مهم", body: "dayli ليس جهازًا طبيًا ولا يحلّ محل المشورة الطبية المتخصصة. في أي حالة طارئة تواصل فورًا مع مقدّم الرعاية المحلي أو خدمات الطوارئ." },
    ],
    note: "تصف هذه الصفحة التزاماتنا. يجري إعداد سياسة خصوصية قانونية كاملة ستحلّ محل هذا الملخّص.",
  },
  notFound: {
    seoTitle: "الصفحة غير موجودة — dayli.ai",
    seoDescription: "الصفحة التي تبحث عنها غير موجودة.",
    eyebrow: "404",
    h1: "الصفحة غير موجودة",
    body: "الصفحة التي تبحث عنها غير موجودة أو تم نقلها.",
    cta: "العودة إلى الصفحة الرئيسية",
  },
};

export const TRANSLATIONS: Record<Locale, PageContent> = { en, hi, te, ar };

export function useT(locale: Locale): PageContent {
  return TRANSLATIONS[locale];
}
