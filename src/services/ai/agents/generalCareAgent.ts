import { AIContext } from '../contextBuilder';
import { openAIClient } from '../client';
import { GENERAL_CARE_AGENT_SYSTEM_PROMPT } from '../prompts';

export class GeneralCareAgent {
  async process(
    userQuery: string,
    context: AIContext,
    overrideApiKey?: string,
    overrideModel?: string
  ): Promise<{ text: string; tokensUsed?: number }> {
    try {
      const prompt = `${context.formattedPromptContext}\n\nUSER QUESTION / HEALTH QUERY: "${userQuery}"`;
      const res = await openAIClient.createChatCompletion({
        systemPrompt: GENERAL_CARE_AGENT_SYSTEM_PROMPT,
        userPrompt: prompt,
        temperature: 0.5,
        overrideApiKey,
        overrideModel,
      });

      if (res.content && res.content.trim()) {
        return { text: res.content, tokensUsed: res.tokensUsed };
      }
    } catch (err) {
      console.warn('GeneralCareAgent LLM error, using fallback:', err);
    }

    // Dynamic, query-aware fallback generator
    const name = context.userProfile.name;
    const qLower = userQuery.toLowerCase();

    if (qLower.includes('broke') || qLower.includes('injury') || qLower.includes('hurt') || qLower.includes('pain') || qLower.includes('wound')) {
      const fallbackText = `I understand you have reported an injury or pain ("${userQuery}"), ${name}.\n\n` +
        `• *Immediate Recommendation:* Please seek medical evaluation at the nearest emergency department or clinic for proper examination and treatment.\n` +
        `• *First Aid:* Rest the injured area, avoid moving broken or strained limbs, and apply a cold pack to control swelling.`;
      return { text: fallbackText, tokensUsed: 90 };
    }

    const fallbackText = `Thank you for reaching out, ${name}.\n\n` +
      `• *General Care:* For health questions regarding "${userQuery}", please consult your local doctor, midwife, or healthcare provider.\n` +
      `• *Climate Advisory:* In ${context.userProfile.locationName} (${context.climateContext.temperatureC}°C), stay hydrated and avoid direct peak heat exposure.`;

    return { text: fallbackText, tokensUsed: 90 };
  }
}

export const generalCareAgent = new GeneralCareAgent();
