import { AIIntent } from '../../types/services';
import { openAIClient } from './client';
import { INTENT_ROUTER_SYSTEM_PROMPT } from './prompts';

export type SubjectType = 'adult' | 'pregnant_person' | 'postpartum_person' | 'infant' | 'child' | 'unknown';
export type UrgencyLevel = 'emergency' | 'urgent' | 'routine' | 'unknown';

export interface StructuredIntentResult {
  intent: AIIntent;
  subject_type: SubjectType;
  urgency: UrgencyLevel;
  requires_triage: boolean;
  reason: string;
  confidence: number;
}

export class IntentRouter {
  /**
   * Classify user query using OpenAI structured intent classifier with deterministic rule fallback
   */
  async classifyIntent(userQuery: string, overrideApiKey?: string, overrideModel?: string): Promise<StructuredIntentResult> {
    const qLower = userQuery.toLowerCase();

    // 1. Deterministic Pre-Check: Emergency Red Flags & Acute Traumatic Injury
    if (
      qLower.includes('faint') ||
      qLower.includes('unconscious') ||
      qLower.includes('bleeding') ||
      qLower.includes('fetal movement') ||
      qLower.includes('baby not moving') ||
      qLower.includes('chest pain') ||
      qLower.includes('high fever') ||
      qLower.includes('seizure') ||
      qLower.includes('convulsion') ||
      qLower.includes('heat stroke') ||
      qLower.includes('trouble breathing') ||
      qLower.includes('difficulty breathing') ||
      qLower.includes('cannot breathe') ||
      qLower.includes('suicide') ||
      qLower.includes('broke my') ||
      qLower.includes('broken bone') ||
      qLower.includes('fracture')
    ) {
      const isChild = qLower.includes('baby') || qLower.includes('infant') || qLower.includes('child');
      const isFracture = qLower.includes('broke') || qLower.includes('fracture');
      return {
        intent: isFracture ? 'clinical_triage' : 'emergency',
        subject_type: isChild ? 'infant' : qLower.includes('pregnant') ? 'pregnant_person' : 'adult',
        urgency: 'urgent',
        requires_triage: true,
        reason: 'Pre-check identified acute symptom/injury keyword',
        confidence: 0.99,
      };
    }

    // 2. Deterministic Pre-Check: Mental Health, Trauma, Injuries, Physical Symptoms, Headaches, Pain & Pediatric Concerns
    if (
      qLower.includes('headache') ||
      qLower.includes('head pain') ||
      qLower.includes('migraine') ||
      qLower.includes('breakdown') ||
      qLower.includes('mental') ||
      qLower.includes('anxiety') ||
      qLower.includes('depress') ||
      qLower.includes('panic') ||
      qLower.includes('overwhelmed') ||
      qLower.includes('pain') ||
      qLower.includes('paining') ||
      qLower.includes('leg') ||
      qLower.includes('knee') ||
      qLower.includes('back') ||
      qLower.includes('arm') ||
      qLower.includes('hand') ||
      qLower.includes('foot') ||
      qLower.includes('feet') ||
      qLower.includes('swell') ||
      qLower.includes('ache') ||
      qLower.includes('hurt') ||
      qLower.includes('sore') ||
      qLower.includes('cramp') ||
      qLower.includes('numb') ||
      qLower.includes('dizz') ||
      qLower.includes('nausea') ||
      qLower.includes('vomit') ||
      qLower.includes('fever') ||
      qLower.includes('injury') ||
      qLower.includes('wound') ||
      qLower.includes('sprain') ||
      qLower.includes('cut') ||
      qLower.includes('burn') ||
      (qLower.includes('baby') && (qLower.includes('cry') || qLower.includes('feed') || qLower.includes('sick') || qLower.includes('hot') || qLower.includes('sleep') || qLower.includes('rash') || qLower.includes('diarr') || qLower.includes('letharg') || qLower.includes('limp') || qLower.includes('vomit') || qLower.includes('wheez') || qLower.includes('refuse') || qLower.includes('fuss') || qLower.includes('irritab') || qLower.includes('inconsolab') || qLower.includes("won't"))) ||
      (qLower.includes('infant') && (qLower.includes('cry') || qLower.includes('feed') || qLower.includes('sick') || qLower.includes('hot') || qLower.includes('sleep') || qLower.includes('vomit') || qLower.includes('rash') || qLower.includes('wheez')))
    ) {
      const isChild = qLower.includes('baby') || qLower.includes('infant') || qLower.includes('child') || qLower.includes('toddler');
      return {
        intent: 'clinical_triage',
        subject_type: isChild ? 'infant' : qLower.includes('pregnant') ? 'pregnant_person' : 'adult',
        urgency: qLower.includes('severe') || qLower.includes('non stop') || qLower.includes('breakdown') || qLower.includes('broke') ? 'urgent' : 'routine',
        requires_triage: true,
        reason: 'Pre-check matched symptom / mental health / pain / injury concern',
        confidence: 0.96,
      };
    }

    // 3. OpenAI Structured Intent Classifier
    try {
      const res = await openAIClient.createChatCompletion({
        systemPrompt: INTENT_ROUTER_SYSTEM_PROMPT,
        userPrompt: userQuery,
        temperature: 0.1,
        responseFormatJson: true,
        overrideApiKey,
        overrideModel,
      });

      const parsed = JSON.parse(res.content);
      if (parsed && parsed.intent) {
        const validIntents: AIIntent[] = [
          'general_care',
          'clinical_triage',
          'medication_adherence',
          'weather_climate',
          'emergency',
          'unknown',
        ];
        const intent: AIIntent = validIntents.includes(parsed.intent) ? parsed.intent : 'general_care';
        const subject_type: SubjectType = parsed.subject_type || (qLower.includes('baby') ? 'infant' : 'adult');

        return {
          intent,
          subject_type,
          urgency: parsed.urgency || (intent === 'emergency' ? 'emergency' : intent === 'clinical_triage' ? 'urgent' : 'routine'),
          requires_triage: parsed.requires_triage !== undefined ? Boolean(parsed.requires_triage) : intent === 'clinical_triage' || intent === 'emergency',
          reason: parsed.reason || 'OpenAI Intent Router classification',
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.92,
        };
      }
    } catch (err) {
      console.warn('IntentRouter fallback to rule engine:', err);
    }

    // 4. Rule-Based Keyword Classification Fallback
    if (qLower.includes('medicin') || qLower.includes('tablet') || qLower.includes('pill') || qLower.includes('iron') || qLower.includes('folic') || qLower.includes('dose') || qLower.includes('missed')) {
      return {
        intent: 'medication_adherence',
        subject_type: qLower.includes('baby') ? 'infant' : 'adult',
        urgency: 'routine',
        requires_triage: false,
        reason: 'Matched medication keywords',
        confidence: 0.88,
      };
    }

    if (qLower.includes('aqi') || qLower.includes('pollution') || qLower.includes('uv') || qLower.includes('weather') || qLower.includes('temperature in') || qLower.includes('forecast')) {
      return {
        intent: 'weather_climate',
        subject_type: 'adult',
        urgency: 'routine',
        requires_triage: false,
        reason: 'Matched weather query keywords',
        confidence: 0.88,
      };
    }

    return {
      intent: 'general_care',
      subject_type: qLower.includes('baby') ? 'infant' : 'adult',
      urgency: 'routine',
      requires_triage: false,
      reason: 'Rule engine default classification',
      confidence: 0.75,
    };
  }
}

export const intentRouter = new IntentRouter();
