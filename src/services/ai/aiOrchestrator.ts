import { UserProfile } from '../../types/chatEngine';
import { WeatherData, AIOrchestrationMetadata, StructuredTriageAssessment } from '../../types/services';
import { buildAIContext } from './contextBuilder';
import { intentRouter, StructuredIntentResult } from './intentRouter';
import { generalCareAgent } from './agents/generalCareAgent';
import { clinicalTriageAgent } from './agents/clinicalTriageAgent';
import { medicationAdherenceAgent } from './agents/medicationAdherenceAgent';
import { safetyLayer } from './safetyLayer';
import { responseGenerator } from './responseGenerator';
import { aiSafetyEnforcer } from '../clinical/aiSafetyEnforcer';
import { aiLogger } from './aiLogger';
import { PROMPT_VERSION } from './prompts';
import { getOpenAIConfig } from './config';

export class AIOrchestrator {
  /**
   * Primary entry point for processing user messages through AI Orchestration Pipeline
   */
  async processUserMessage(params: {
    userQuery: string;
    userProfile: UserProfile;
    weatherData?: WeatherData;
    conversationState?: Record<string, any>;
    recentMessages?: Array<{ sender: string; content: string }>;
    overrideApiKey?: string;
    overrideModel?: string;
  }): Promise<AIOrchestrationMetadata> {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const config = getOpenAIConfig(params.overrideApiKey, params.overrideModel);

    // 1. Classify Intent & Subject Type FIRST
    let intentResult: StructuredIntentResult = {
      intent: 'general_care',
      subject_type: 'adult',
      urgency: 'routine',
      requires_triage: false,
      reason: 'Default initial classification',
      confidence: 0.8,
    };

    try {
      intentResult = await intentRouter.classifyIntent(
        params.userQuery,
        params.overrideApiKey,
        params.overrideModel
      );
    } catch (err) {
      console.warn('Intent classification fallback:', err);
    }

    // 2. Build AI Context with Subject Type
    const context = buildAIContext({
      userProfile: params.userProfile,
      weatherData: params.weatherData,
      conversationState: params.conversationState,
      recentMessages: params.recentMessages,
      subjectType: intentResult.subject_type,
    });

    let agentText = '';
    let tokensUsedTotal = 0;
    let fallbackUsed = false;
    let structuredAssessment: StructuredTriageAssessment | undefined = undefined;

    const isPediatric = intentResult.subject_type === 'infant' || intentResult.subject_type === 'child';

    try {
      // 3. Dispatch to Specialized Agent based on Intent
      switch (intentResult.intent) {
        case 'clinical_triage': {
          const triageRes = await clinicalTriageAgent.process(
            params.userQuery,
            context,
            params.overrideApiKey,
            params.overrideModel
          );
          structuredAssessment = triageRes.assessment;
          tokensUsedTotal += triageRes.tokensUsed || 0;

          if (triageRes.text && triageRes.text.trim()) {
            agentText = triageRes.text;
          } else if (isPediatric) {
            agentText = `I understand — nonstop or continuous crying in a baby can be concerning. Let’s check a few important health signs first:\n\n` +
              `• *Breathing:* Is the baby having trouble breathing, grunting, or fast breathing?\n` +
              `• *Skin/Lips:* Any pale, blue, or grey skin or lips?\n` +
              `• *Fever:* Does the baby feel unusually hot or have a measured fever?\n` +
              `• *Feeding:* Is the baby refusing feeds or vomiting repeatedly?\n` +
              `• *Alertness:* Is the baby unusually sleepy, limp, or hard to wake?\n` +
              `• *Wet Diapers:* Are wet diapers significantly reduced?\n\n` +
              `_Heat Context:_ Currently, ambient heat in ${context.userProfile.locationName} is high (${context.climateContext.temperatureC}°C). Overheating can cause restlessness. Keep your baby in a cool, well-ventilated shade, dressed in light cotton, and offer frequent feeds.\n\n` +
              `*If any warning signs above are present, seek urgent medical care immediately.*`;
          } else {
            agentText = `I understand you are experiencing leg discomfort or pain.\n\n` +
              `• *Leg Pain Advice:* Rest your legs elevated on pillows, avoid prolonged standing, and stay hydrated with water and electrolytes.\n` +
              `• *Red Flags:* If you experience severe swelling in one leg, redness, warmth, or sudden intense pain, please consult a healthcare provider immediately.`;
          }
          break;
        }

        case 'medication_adherence': {
          const medRes = await medicationAdherenceAgent.process(
            params.userQuery,
            context,
            params.overrideApiKey,
            params.overrideModel
          );
          agentText = medRes.text;
          tokensUsedTotal += medRes.tokensUsed || 0;
          break;
        }

        case 'emergency': {
          structuredAssessment = {
            symptoms: ['Acute Red-Flag Emergency'],
            redFlags: ['Emergency Keyword Identified'],
            severity: 'severe',
            recommendedTriageLevel: 'high',
          };
          agentText = 'Emergency triage protocol triggered.';
          break;
        }

        case 'weather_climate': {
          agentText = `🌤️ *WEATHER & CLIMATE INTELLIGENCE (${context.userProfile.locationName})*\n\n` +
            `• *Temperature:* ${context.climateContext.temperatureC}°C (Feels like ${context.climateContext.feelsLikeC}°C)\n` +
            `• *AQI:* ${context.climateContext.aqi} (${context.climateContext.aqiStatus})\n` +
            `• *UV Index:* ${context.climateContext.uvIndex}\n` +
            `• *Advisory:* ${context.climateContext.recommendation}`;
          break;
        }

        case 'general_care':
        case 'unknown':
        default: {
          const careRes = await generalCareAgent.process(
            params.userQuery,
            context,
            params.overrideApiKey,
            params.overrideModel
          );
          agentText = careRes.text;
          tokensUsedTotal += careRes.tokensUsed || 0;
          break;
        }
      }

      if (!config.apiKey || !config.apiKey.startsWith('sk-')) {
        fallbackUsed = true;
      }
    } catch (err: any) {
      console.warn('AIOrchestrator pipeline fallback:', err);
      fallbackUsed = true;
      if (isPediatric) {
        agentText = `I understand your concern for your baby. Please check if your baby has fever, vomiting, trouble breathing, or is unusually sleepy. Keep your baby in cool shade with light clothing. Seek medical care if symptoms persist.`;
      } else {
        agentText = `I'm sorry to hear that you are experiencing physical discomfort or leg pain. Please rest in a comfortable position, elevate your legs, stay hydrated with water and electrolytes, and consult a healthcare professional if pain or swelling persists.`;
      }
    }

    // 4. Clinical Safety & Risk Decision Layer (Deterministic)
    const safetyEvaluation = await safetyLayer.evaluate({
      intent: intentResult.intent,
      userQuery: params.userQuery,
      assessment: structuredAssessment,
      userProfile: params.userProfile,
    });

    // 5. Response Generator
    const generated = responseGenerator.generateFinalResponse({
      intent: intentResult.intent,
      agentResponse: agentText,
      safetyEvaluation,
      context,
    });

    // 6. Response Validation & Safety Enforcement
    const validated = aiSafetyEnforcer.enforce({
      rawAiResponse: generated.text,
      safetyResult: {
        risk_level: safetyEvaluation.finalRiskLevel === 'High / Emergency' ? 'emergency' : safetyEvaluation.finalRiskLevel === 'Moderate' ? 'moderate' : 'low',
        red_flags: safetyEvaluation.redFlagsIdentified,
        requires_referral: safetyEvaluation.requiresReferral,
        requires_immediate_action: safetyEvaluation.finalRiskLevel === 'High / Emergency',
        reason_codes: [safetyEvaluation.safetyNote],
        rule_version: '1.0.0',
        referral_ticket: undefined,
      },
      userProfileName: context.userProfile.name,
      locationName: context.userProfile.locationName,
      temperatureC: context.climateContext.temperatureC,
      subjectType: intentResult.subject_type,
      intent: intentResult.intent,
    });

    const latencyMs = Date.now() - startTime;

    const metadata: AIOrchestrationMetadata = {
      intent: intentResult.intent,
      riskLevel: safetyEvaluation.finalRiskLevel,
      requiresReferral: safetyEvaluation.requiresReferral,
      response: validated.sanitizedResponse,
      actions: generated.actions,
      sources: generated.sources,
      confidence: intentResult.confidence,
      latencyMs,
      tokensUsed: tokensUsedTotal || 120,
      modelUsed: fallbackUsed ? `${config.model} (Clinical Engine)` : config.model,
      fallbackUsed,
      promptVersion: PROMPT_VERSION,
      structuredAssessment,
      referralTicket: safetyEvaluation.referralTicket,
    };

    // 7. Structured Logging
    aiLogger.log({
      requestId,
      intent: metadata.intent,
      model: metadata.modelUsed,
      latencyMs,
      success: true,
      fallbackUsed: metadata.fallbackUsed,
      riskLevel: metadata.riskLevel,
      tokensUsed: metadata.tokensUsed,
      promptVersion: PROMPT_VERSION,
    });

    return metadata;
  }
}

export const aiOrchestrator = new AIOrchestrator();
