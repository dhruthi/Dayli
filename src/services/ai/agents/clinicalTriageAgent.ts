import { StructuredTriageAssessment } from '../../../types/services';
import { AIContext } from '../contextBuilder';
import { openAIClient } from '../client';
import { CLINICAL_TRIAGE_AGENT_SYSTEM_PROMPT, ADULT_CLINICAL_TRIAGE_RESPONSE_PROMPT, PEDIATRIC_CLINICAL_TRIAGE_RESPONSE_PROMPT } from '../prompts';

export class ClinicalTriageAgent {
  async process(
    userQuery: string,
    context: AIContext,
    overrideApiKey?: string,
    overrideModel?: string
  ): Promise<{ assessment: StructuredTriageAssessment; text: string; tokensUsed?: number }> {
    const qLower = userQuery.toLowerCase();
    let detectedSymptoms: string[] = [];
    let isFractureOrInjury = false;

    if (qLower.includes('broke') || qLower.includes('fracture') || qLower.includes('broken')) {
      detectedSymptoms.push('suspected bone fracture / injury');
      isFractureOrInjury = true;
    }
    if (qLower.includes('headache') || qLower.includes('head pain')) detectedSymptoms.push('headache');
    if (qLower.includes('breakdown') || qLower.includes('mental')) detectedSymptoms.push('mental breakdown / emotional distress');
    if (qLower.includes('leg') || qLower.includes('pain') || qLower.includes('paining')) detectedSymptoms.push('pain / discomfort');
    if (qLower.includes('dizz')) detectedSymptoms.push('dizziness');
    if (qLower.includes('nausea') || qLower.includes('vomit')) detectedSymptoms.push('nausea/vomiting');
    if (qLower.includes('cramp')) detectedSymptoms.push('cramping');

    let assessment: StructuredTriageAssessment = {
      symptoms: detectedSymptoms.length > 0 ? detectedSymptoms : ['health symptom report'],
      redFlags: isFractureOrInjury ? ['bone_fracture'] : [],
      duration: null,
      severity: isFractureOrInjury ? 'severe' : 'moderate',
      pregnancyContext: context.userProfile.trimester || '2nd Trimester',
      childContext: null,
      recommendedTriageLevel: isFractureOrInjury ? 'high' : 'moderate',
    };
    let text = '';
    let totalTokens = 0;

    const isPediatric = context.subjectType === 'infant' || context.subjectType === 'child';

    // 1. Step 1: Extract Structured Assessment JSON
    try {
      const prompt = `${context.formattedPromptContext}\n\nPATIENT SYMPTOM REPORT: "${userQuery}"`;
      const res = await openAIClient.createChatCompletion({
        systemPrompt: CLINICAL_TRIAGE_AGENT_SYSTEM_PROMPT,
        userPrompt: prompt,
        temperature: 0.1,
        responseFormatJson: true,
        overrideApiKey,
        overrideModel,
      });

      totalTokens += res.tokensUsed || 0;
      const parsed = JSON.parse(res.content);
      if (parsed && Array.isArray(parsed.symptoms)) {
        assessment = {
          symptoms: parsed.symptoms.length > 0 ? parsed.symptoms : assessment.symptoms,
          redFlags: parsed.red_flags || parsed.redFlags || assessment.redFlags,
          duration: parsed.duration || null,
          severity: parsed.severity || assessment.severity,
          pregnancyContext: parsed.pregnancy_context || context.userProfile.trimester || null,
          childContext: parsed.child_context || null,
          recommendedTriageLevel: parsed.recommended_triage_level || assessment.recommendedTriageLevel,
        };
      }
    } catch (err) {
      console.warn('ClinicalTriageAgent JSON extraction fallback:', err);
    }

    // 2. Step 2: Generate LLM Conversational Medical Companion Response via OpenAI
    try {
      const systemPrompt = isPediatric
        ? PEDIATRIC_CLINICAL_TRIAGE_RESPONSE_PROMPT
        : ADULT_CLINICAL_TRIAGE_RESPONSE_PROMPT;

      const userPrompt = `${context.formattedPromptContext}\n\nUSER REPORTED SYMPTOM / HEALTH CONCERN: "${userQuery}"\nEXTRACTED SYMPTOMS: ${assessment.symptoms.join(', ')}`;

      const textRes = await openAIClient.createChatCompletion({
        systemPrompt,
        userPrompt,
        temperature: 0.4,
        overrideApiKey,
        overrideModel,
      });

      totalTokens += textRes.tokensUsed || 0;
      if (textRes.content) {
        text = textRes.content;
      }
    } catch (err) {
      console.warn('ClinicalTriageAgent LLM text generation fallback:', err);
    }

    // 3. Symptom-Tailored Fallback Text if offline
    if (!text) {
      const name = context.userProfile.name;
      const isPediatricQuery = qLower.includes('baby') || qLower.includes('infant') || qLower.includes('child') || qLower.includes('toddler');

      if (isPediatricQuery && (qLower.includes('cry') || qLower.includes('fuss') || qLower.includes('irritab') || qLower.includes('inconsolab'))) {
        text = `I understand — nonstop crying in a baby can be very concerning, ${name}. Let's check a few important health signs:\n\n` +
          `• *Breathing:* Is the baby having trouble breathing, grunting, or fast breathing?\n` +
          `• *Skin/Lips:* Any pale, blue, or grey skin or lips?\n` +
          `• *Fever:* Does the baby feel unusually hot or have a measured fever?\n` +
          `• *Feeding:* Is the baby refusing feeds or vomiting repeatedly?\n` +
          `• *Alertness:* Is the baby unusually sleepy, limp, or hard to wake?\n` +
          `• *Wet Diapers:* Are wet diapers significantly reduced?\n\n` +
          `⚠️ *If any of these warning signs are present, please seek urgent medical care immediately.*\n\n` +
          `_In the meantime:_ Keep your baby in cool shade, dressed in light cotton. Offer frequent breastfeeds or small sips of ORS (as directed by your doctor for the baby's age and weight).`;
      } else if (isPediatricQuery && (qLower.includes('hot') || qLower.includes('fever') || qLower.includes('sleep') || qLower.includes('letharg'))) {
        text = `A baby feeling unusually hot or sleepy can be a sign of fever or heat-related distress, ${name}.\n\n` +
          `• *Check Temperature:* Use a thermometer. If above 38°C (100.4°F), this is a fever — seek medical advice.\n` +
          `• *Cool Down:* Undress to a light vest/diaper, sponge with lukewarm (NOT cold) water, fan gently.\n` +
          `• *Hydration:* Offer frequent breastfeeds. Do NOT give large volumes of plain water to infants < 6 months.\n` +
          `• *Alert Signs:* If the baby is limp, blue-lipped, refusing all feeds, or has a rash that doesn't fade when pressed — seek emergency care immediately.\n\n` +
          `⚠️ *Do NOT use ice or cold baths on an infant — this can cause dangerous shivering.*`;
      } else if (isPediatricQuery && (qLower.includes('vomit') || qLower.includes('diarr'))) {
        text = `Repeated vomiting or diarrhea in a baby requires close monitoring, ${name}.\n\n` +
          `• *Dehydration Risk:* Watch for dry mouth, sunken fontanelle (soft spot), no tears when crying, and reduced wet diapers.\n` +
          `• *Rehydration:* Offer small frequent sips of ORS solution (doctor-prescribed dose for baby's weight). Continue breastfeeding.\n` +
          `• *Seek Care If:* Blood in stool/vomit, unable to keep any fluids down, lethargic, or fever > 38°C.\n\n` +
          `⚠️ *Do NOT give adult ORS sachets at adult doses to infants. Consult your pediatrician for correct dosing.*`;
      } else if (isPediatricQuery && qLower.includes('feed')) {
        text = `A baby refusing to feed can indicate illness or discomfort, ${name}.\n\n` +
          `• *Check for Illness:* Does the baby have fever, nasal congestion, or mouth sores?\n` +
          `• *Try Smaller Feeds:* Offer smaller, more frequent feeds. If breastfeeding, try different positions.\n` +
          `• *Monitor Output:* Track wet diapers — if significantly reduced (< 4 per day), seek medical advice.\n` +
          `• *Seek Care If:* Baby is lethargic, has not fed for > 6 hours, or shows signs of dehydration.\n\n` +
          `_Heat context:_ High ambient temperatures can reduce appetite in babies. Keep the baby cool and well-ventilated.`;
      } else if (qLower.includes('broke') || qLower.includes('fracture') || qLower.includes('broken')) {
        text = `I am so sorry to hear that you broke your hand, ${name}. This requires urgent medical evaluation.\n\n` +
          `• *First Aid:* Support the injured hand gently in a comfortable position. Do NOT try to straighten broken bones.\n` +
          `• *Ice & Elevation:* Apply an ice pack wrapped in cloth to reduce swelling, and elevate the hand on a pillow.\n` +
          `• *Urgent Action:* Please proceed to the nearest emergency clinic or urgent care center immediately for X-ray and splinting.`;
      } else if (qLower.includes('headache')) {
        text = `I understand you are experiencing a headache, ${name}.\n\n` +
          `• *Immediate Relief:* Rest in a dark, quiet, well-ventilated room with a cold damp cloth on your forehead.\n` +
          `• *Hydration:* Sip clean water with ORS electrolytes, as heat dehydration is a frequent cause of headaches.\n` +
          `• *Red Flags:* If your headache is sudden, severe ("thunderclap"), or accompanied by blurry vision, swelling, or high fever, seek medical care immediately.`;
      } else if (qLower.includes('breakdown') || qLower.includes('mental') || qLower.includes('anxiety')) {
        text = `I hear you, ${name}, and I am so sorry you are feeling overwhelmed right now. Please know that your feelings are valid.\n\n` +
          `• *Grounding Exercise:* Take a slow 4-second breath in, hold for 4 seconds, and exhale slowly for 6 seconds.\n` +
          `• *Rest & Support:* Rest in a quiet, cool space. Reach out to a trusted loved one or healthcare worker.\n` +
          `• *Helpline Support:* In India, you can call Tele-MANAS at *14416* (toll-free) for confidential, free emotional support 24/7.`;
      } else {
        const sympStr = assessment.symptoms.join(', ');
        text = `I understand you are experiencing ${sympStr}, ${name}.\n\n` +
          `• *Self-Care:* Rest in a comfortable position, elevate affected limbs if swollen, and stay hydrated with water and electrolytes.\n` +
          `• *Red Flags:* If you experience severe sudden pain, high fever, or difficulty breathing, please seek medical evaluation immediately.`;
      }
    }

    return {
      assessment,
      text,
      tokensUsed: totalTokens || 120,
    };
  }
}

export const clinicalTriageAgent = new ClinicalTriageAgent();
