import { RedFlagRule } from './types';

export const RED_FLAG_RULE_VERSION = '1.0.0';

export const RED_FLAG_RULES: RedFlagRule[] = [
  // 1. FETAL DISTRESS RULES
  {
    id: 'RF_001',
    name: 'Decreased Fetal Movements',
    category: 'fetal_distress',
    description: 'Reduced or absent fetal kick count in 2nd/3rd trimester',
    reasonCode: 'RF_FETAL_MOVEMENT_DECREASED',
    riskLevel: 'emergency',
    evaluate: (symptoms, text) => {
      const q = text.toLowerCase();
      return (
        symptoms.includes('reduced_fetal_movement') ||
        q.includes('fetal movement') ||
        q.includes('baby not moving') ||
        q.includes('kicks decreased') ||
        q.includes('no kicks')
      );
    },
  },
  {
    id: 'RF_002',
    name: 'Vaginal Bleeding in Pregnancy',
    category: 'fetal_distress',
    description: 'Any vaginal spot or hemorrhage during heat stress',
    reasonCode: 'RF_MATERNAL_BLEEDING',
    riskLevel: 'emergency',
    evaluate: (symptoms, text) => {
      const q = text.toLowerCase();
      return symptoms.includes('severe_bleeding') || q.includes('bleeding') || q.includes('blood spot');
    },
  },
  {
    id: 'RF_003',
    name: 'Amniotic Fluid Leakage',
    category: 'fetal_distress',
    description: 'Fluid discharge or premature rupture of membranes',
    reasonCode: 'RF_AMNIOTIC_FLUID_LEAK',
    riskLevel: 'emergency',
    evaluate: (symptoms, text) => {
      const q = text.toLowerCase();
      return q.includes('fluid leak') || q.includes('water broke') || q.includes('clear discharge');
    },
  },
  {
    id: 'RF_004',
    name: 'Severe Abdominal Cramping',
    category: 'fetal_distress',
    description: 'Painful uterine contractions or persistent cramping',
    reasonCode: 'RF_SEVERE_ABDOMINAL_PAIN',
    riskLevel: 'high',
    evaluate: (symptoms, text) => {
      const q = text.toLowerCase();
      return symptoms.includes('abdominal cramping') || q.includes('severe cramp') || q.includes('uterine pain');
    },
  },

  // 2. CNS & HEAT STROKE RULES
  {
    id: 'RF_005',
    name: 'Syncope & Fainting',
    category: 'cns_heatstroke',
    description: 'Loss of consciousness, collapse, or severe lightheadedness',
    reasonCode: 'RF_SYNCOPE_FAINTING',
    riskLevel: 'emergency',
    evaluate: (symptoms, text) => {
      const q = text.toLowerCase();
      return symptoms.includes('fainting') || q.includes('faint') || q.includes('passed out') || q.includes('collapsed');
    },
  },
  {
    id: 'RF_006',
    name: 'High Maternal Fever (>102°F)',
    category: 'cns_heatstroke',
    description: 'Maternal core temperature exceeding 39°C / 102°F',
    reasonCode: 'RF_HIGH_FEVER_HYPERTHERMIA',
    riskLevel: 'emergency',
    evaluate: (symptoms, text) => {
      const q = text.toLowerCase();
      return (
        symptoms.includes('high_fever') ||
        q.includes('high fever') ||
        q.includes('102') ||
        q.includes('103') ||
        q.includes('104') ||
        q.includes('39°c') ||
        q.includes('40°c')
      );
    },
  },
  {
    id: 'RF_007',
    name: 'Altered Mental Status / Disorientation',
    category: 'cns_heatstroke',
    description: 'Confusion, slurred speech, or suspected heat stroke CNS dysfunction',
    reasonCode: 'RF_HEAT_STROKE_CNS',
    riskLevel: 'emergency',
    evaluate: (symptoms, text) => {
      const q = text.toLowerCase();
      return q.includes('confusion') || q.includes('disoriented') || q.includes('heat stroke') || q.includes('seizure');
    },
  },

  // 3. MATERNAL SEVERE ILLNESS RULES
  {
    id: 'RF_008',
    name: 'Severe Chest Pain & Dyspnea',
    category: 'maternal_severe',
    description: 'Acute thoracic pain or severe difficulty breathing',
    reasonCode: 'RF_CHEST_PAIN_DYSPNEA',
    riskLevel: 'emergency',
    evaluate: (symptoms, text) => {
      const q = text.toLowerCase();
      return q.includes('chest pain') || q.includes('cannot breathe') || q.includes('shortness of breath') || q.includes('trouble breathing') || q.includes('difficulty breathing');
    },
  },
  {
    id: 'RF_009',
    name: 'Severe Dehydration & Anuria',
    category: 'maternal_severe',
    description: 'Uncontrollable vomiting or absence of urine for >8 hours',
    reasonCode: 'RF_SEVERE_DEHYDRATION_ANURIA',
    riskLevel: 'high',
    evaluate: (symptoms, text) => {
      const q = text.toLowerCase();
      return q.includes('no urine') || q.includes('haven\'t peed') || q.includes('persistent vomiting');
    },
  },

  // 4. PEDIATRIC HEAT DISTRESS RULES
  {
    id: 'RF_010',
    name: 'Pediatric Unresponsiveness & Lethargy',
    category: 'pediatric_heat',
    description: 'Infant/child unusually lethargic or unresponsive in heatwave',
    reasonCode: 'RF_PEDIATRIC_LETHARGY',
    riskLevel: 'emergency',
    evaluate: (symptoms, text, profile) => {
      const q = text.toLowerCase();
      const isChild = profile?.childAge !== undefined || q.includes('baby') || q.includes('child');
      return isChild && (q.includes('lethargic') || q.includes('unresponsive') || q.includes('sunken soft spot'));
    },
  },
];
