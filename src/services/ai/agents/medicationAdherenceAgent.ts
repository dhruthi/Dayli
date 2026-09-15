import { AIContext } from '../contextBuilder';
import { openAIClient } from '../client';
import { MEDICATION_ADHERENCE_AGENT_SYSTEM_PROMPT } from '../prompts';

export class MedicationAdherenceAgent {
  async process(
    userQuery: string,
    context: AIContext,
    overrideApiKey?: string,
    overrideModel?: string
  ): Promise<{ text: string; tokensUsed?: number }> {
    try {
      const prompt = `${context.formattedPromptContext}\n\nMEDICATION QUESTION: "${userQuery}"`;
      const res = await openAIClient.createChatCompletion({
        systemPrompt: MEDICATION_ADHERENCE_AGENT_SYSTEM_PROMPT,
        userPrompt: prompt,
        temperature: 0.4,
        overrideApiKey,
        overrideModel,
      });

      if (res.content) {
        return { text: res.content, tokensUsed: res.tokensUsed };
      }
    } catch (err) {
      console.warn('MedicationAdherenceAgent LLM error, using clinical template:', err);
    }

    const name = context.userProfile.name;
    const temp = context.climateContext.temperatureC || 41.5;

    const fallbackText = `💊 *MEDICATION STORAGE & ADHERENCE GUIDANCE for ${name}*\n\nDuring ambient extreme heat (*${temp}°C*):\n\n• *Cool Storage:* Store Iron & Folic Acid tablets in a cool, dry place (<25°C), away from direct sunlight.\n• *Absorption:* Take Iron supplements with orange juice or lemon water (Vitamin C enhances absorption).\n• *Hydration:* Always swallow tablets with a full glass of water.\n• *Missed Dose:* Take it as soon as you remember, unless it is close to your next scheduled dose.\n\n⚠️ *Important Notice:* For custom prescription dosage adjustments, please consult your treating physician or pharmacist.`;

    return { text: fallbackText, tokensUsed: 115 };
  }
}

export const medicationAdherenceAgent = new MedicationAdherenceAgent();
