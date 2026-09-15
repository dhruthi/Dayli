import { NormalizedWhatsAppMessage, IWhatsAppProvider, WhatsAppSendResult } from './types';
import { whatsAppMessageNormalizer } from './normalizer';
import { idempotencyEngine } from './idempotencyEngine';
import { sessionManager } from '../session/sessionManager';
import { openAIService } from '../mock';
import { climateService } from '../climate/climateService';
import { mockWhatsAppProvider } from './providers/MockWhatsAppProvider';
import { metaWhatsAppProvider } from './providers/MetaWhatsAppProvider';
import { whatsAppInteractiveMapper } from './interactiveMapper';

function getEnvVar(key: string): string | undefined {
  try {
    const metaEnv = (import.meta as any).env;
    if (metaEnv && metaEnv[key]) return metaEnv[key];
  } catch (e) {}
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {}
  return undefined;
}

export class WhatsAppMessageRouter {
  private activeProviderType: 'mock' | 'meta' = 'mock';

  constructor() {
    const providerSetting = getEnvVar('VITE_MESSAGE_PROVIDER') || getEnvVar('MESSAGE_PROVIDER');
    if (providerSetting === 'meta') {
      this.activeProviderType = 'meta';
    }
  }

  setProviderType(type: 'mock' | 'meta'): void {
    this.activeProviderType = type;
  }

  getProviderType(): 'mock' | 'meta' {
    return this.activeProviderType;
  }

  getProvider(): IWhatsAppProvider {
    return this.activeProviderType === 'meta' ? metaWhatsAppProvider : mockWhatsAppProvider;
  }

  /**
   * Primary Inbound Message Pipeline (Meta Webhook or Simulator Inbound Event)
   */
  async routeIncomingMessage(rawPayload: any, isMetaWebhook: boolean = true): Promise<{
    processed: boolean;
    reason?: string;
    normalized?: NormalizedWhatsAppMessage;
    sendResult?: WhatsAppSendResult;
  }> {
    // 1. Message Normalization
    const normalized = isMetaWebhook
      ? whatsAppMessageNormalizer.normalizeMetaWebhook(rawPayload)
      : rawPayload;

    if (!normalized) {
      return { processed: false, reason: 'Malformed or non-message payload' };
    }

    // 2. Ignore Status Updates (handled by status subscriber)
    if (normalized.type === 'status_update') {
      return { processed: true, reason: 'Status update recorded', normalized };
    }

    // 3. Idempotency Check (Prevent duplicate message processing)
    if (idempotencyEngine.isDuplicate(normalized.message_id)) {
      return { processed: false, reason: `Duplicate message_id (${normalized.message_id}) ignored`, normalized };
    }

    // 4. Session Manager & User Profile Lookup
    const session = sessionManager.getSession(normalized.phone_number);
    if (normalized.user_name) {
      session.profile.name = normalized.user_name;
    }

    // Record user message to session history
    sessionManager.addMessageToHistory(normalized.phone_number, 'user', normalized.text || 'Interactive Action');

    // 5. Climate Context Resolution
    const weatherData = await climateService.getClimateHealthData(
      session.location?.latitude || 28.6139,
      session.location?.longitude || 77.209,
      session.location?.name || 'New Delhi Central'
    );

    // 6. Execute AI Orchestrator & Safety Layer
    let replyText = '';
    let sendResult: WhatsAppSendResult;
    const provider = this.getProvider();

    try {
      if (normalized.type === 'location' && normalized.location) {
        sessionManager.updateSession(normalized.phone_number, {
          location: normalized.location,
        });

        const freshWeather = await climateService.getClimateHealthData(
          normalized.location.latitude,
          normalized.location.longitude,
          normalized.location.name || 'Shared GPS Location'
        );

        replyText = `📍 *LOCATION RECEIVED for ${session.profile.name}*\n\nUpdated ambient weather for *${freshWeather.cityName}* (${freshWeather.temperatureC}°C, AQI ${freshWeather.aqi}):\n\n• ${freshWeather.recommendation}`;
        sendResult = await provider.sendTextMessage(normalized.phone_number, replyText);
      } else {
        const queryText = normalized.text || normalized.button_title || 'General Care';

        const metaResult = await openAIService.orchestrateQuery({
          userQuery: queryText,
          userProfile: session.profile,
          weatherData,
          recentMessages: session.recentMessages,
        });

        replyText = metaResult.response;

        if (metaResult.requiresReferral) {
          sessionManager.updateSession(normalized.phone_number, {
            referralStatus: {
              hasReferral: true,
              referralId: metaResult.referralTicket?.referralId,
              riskScore: 'High',
            },
          });
        }

        // Outbound WhatsApp Response Builder & Dispatch
        sendResult = await provider.sendTextMessage(normalized.phone_number, replyText);
      }

      sessionManager.addMessageToHistory(normalized.phone_number, 'bot', replyText);

      return {
        processed: true,
        normalized,
        sendResult,
      };
    } catch (err: any) {
      console.error('Error in WhatsAppMessageRouter pipeline:', err);
      // Fail Gracefully (Requirement 9)
      const fallbackMsg = `🤖 *DAYLI.AI CLIMATE HEALTH COPILOT*\n\nThank you *${session.profile.name}*! We are processing your request. Please drink plenty of clean water and stay in the shade during peak heat hours.`;
      const fallbackResult = await provider.sendTextMessage(normalized.phone_number, fallbackMsg);

      return {
        processed: true,
        reason: 'Executed graceful fallback due to downstream service exception',
        normalized,
        sendResult: fallbackResult,
      };
    }
  }
}

export const whatsAppMessageRouter = new WhatsAppMessageRouter();
