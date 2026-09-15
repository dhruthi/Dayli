import { UniversalChatMessageInput, UniversalChatMessageOutput } from './types';
import { aiOrchestrator } from '../ai/aiOrchestrator';
import { sessionManager } from '../session/sessionManager';
import { climateService } from '../climate/climateService';

export class ChannelAdapter {
  /**
   * Universal Execution Engine mapping Web, WhatsApp, or Simulator requests to core shared services
   */
  async processUniversalMessage(input: UniversalChatMessageInput): Promise<UniversalChatMessageOutput> {
    const startTime = Date.now();
    const phone = input.phone_number || '+919876543210';

    // 1. Session Manager Lookup
    const session = sessionManager.getSession(phone);
    if (input.user_name) {
      session.profile.name = input.user_name;
    }
    if (input.location) {
      session.location = input.location;
    }

    sessionManager.addMessageToHistory(phone, 'user', input.message);

    // 2. Fetch Climate Intelligence Context
    const weatherData = await climateService.getClimateHealthData(
      session.location?.latitude || 28.6139,
      session.location?.longitude || 77.209,
      session.location?.name || 'New Delhi Central'
    );

    // 3. Execute AI Orchestrator, Clinical Safety Engine & Response Generator
    const orchestrationResult = await aiOrchestrator.processUserMessage({
      userQuery: input.message,
      userProfile: session.profile,
      weatherData,
      recentMessages: session.recentMessages,
    });

    sessionManager.addMessageToHistory(phone, 'bot', orchestrationResult.response);

    let referralPayload = null;
    if (orchestrationResult.referralTicket) {
      referralPayload = {
        ticket_id: orchestrationResult.referralTicket.referralId,
        status: orchestrationResult.referralTicket.status,
        priority: orchestrationResult.referralTicket.triageCategory,
        facility_name: orchestrationResult.referralTicket.facilityName,
      };
    }

    return {
      message: orchestrationResult.response,
      intent: orchestrationResult.intent,
      risk_level: orchestrationResult.riskLevel,
      actions: orchestrationResult.actions,
      referral: referralPayload,
      sources: orchestrationResult.sources,
      metadata: {
        latency_ms: Date.now() - startTime,
        model_used: orchestrationResult.modelUsed,
        fallback_used: orchestrationResult.fallbackUsed,
        channel: input.channel,
        prompt_version: orchestrationResult.promptVersion,
      },
    };
  }
}

export const channelAdapter = new ChannelAdapter();
