export interface ApprovedTemplate {
  name: string;
  category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
  language: string;
  status: 'APPROVED';
  headerType: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'LOCATION';
  headerText?: string;
  bodyText: string;
  footerText?: string;
  buttons: Array<{ type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER'; text: string }>;
}

export const APPROVED_TEMPLATES: ApprovedTemplate[] = [
  {
    name: 'dayli_maternal_onboarding_v1',
    category: 'UTILITY',
    language: 'en_US',
    status: 'APPROVED',
    headerType: 'TEXT',
    headerText: '☀️ dayli.ai Climate Health Copilot',
    bodyText:
      'Welcome to *dayli.ai Climate Health Copilot*! We protect pregnant mothers and children from extreme heatwaves, air pollution, and dehydration.\n\nPlease select an option below to continue:',
    footerText: 'Supported by Healthcare & Climate Partners • Opt-out anytime',
    buttons: [
      { type: 'QUICK_REPLY', text: '☀️ General Care & Alerts' },
      { type: 'QUICK_REPLY', text: '🚨 Clinical Triage' },
      { type: 'QUICK_REPLY', text: '💊 Medication Adherence' },
    ],
  },
  {
    name: 'dayli_heat_symptom_triage_v1',
    category: 'UTILITY',
    language: 'en_US',
    status: 'APPROVED',
    headerType: 'TEXT',
    headerText: '🚨 HEAT ILLNESS TRIAGE CHECK',
    bodyText:
      'Hello {{1}}. Extreme heat can cause rapid maternal dehydration and fetal distress. Are you or your child experiencing any of the following symptoms right now?',
    footerText: 'Clinical Protocol standard WHO / UNICEF',
    buttons: [
      { type: 'QUICK_REPLY', text: '📋 Start Assessment' },
      { type: 'QUICK_REPLY', text: '👍 I Feel Fine' },
    ],
  },
  {
    name: 'dayli_med_adherence_nudge_v1',
    category: 'UTILITY',
    language: 'en_US',
    status: 'APPROVED',
    headerType: 'TEXT',
    headerText: '💊 MEDICATION & SUPPLEMENT ADHERENCE',
    bodyText:
      'Good morning {{1}}! High temperatures above 35°C degrade prenatal iron, folic acid, and ORS efficacy if stored improperly.\n\nWhich supplements are currently prescribed in your pregnancy plan?',
    footerText: 'dayli.ai Clinical Pharmacy Protection',
    buttons: [
      { type: 'QUICK_REPLY', text: '💊 Iron & Folic Acid (IFA)' },
      { type: 'QUICK_REPLY', text: '🥤 ORS Electrolyte Mix' },
      { type: 'QUICK_REPLY', text: '🦴 Calcium & Vitamin D3' },
    ],
  },
];
