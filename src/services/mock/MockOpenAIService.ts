import { IOpenAIService, WeatherData, AIOrchestrationMetadata, OpenAIHealthCheckResult } from '../../types/services';
import { UserProfile } from '../../types/chatEngine';
import { aiOrchestrator } from '../ai/aiOrchestrator';
import { checkOpenAIHealthStatus } from '../ai/config';

export class MockOpenAIService implements IOpenAIService {
  /**
   * Main AI Orchestrator Query processing method
   */
  async orchestrateQuery(params: {
    userQuery: string;
    userProfile: UserProfile;
    weatherData?: WeatherData;
    conversationState?: Record<string, any>;
    recentMessages?: Array<{ sender: string; content: string }>;
    model?: string;
    apiKey?: string;
  }): Promise<AIOrchestrationMetadata> {
    return await aiOrchestrator.processUserMessage({
      userQuery: params.userQuery,
      userProfile: params.userProfile,
      weatherData: params.weatherData,
      conversationState: params.conversationState,
      recentMessages: params.recentMessages,
      overrideApiKey: params.apiKey,
      overrideModel: params.model,
    });
  }

  /**
   * Backward-compatible generateClimateAdvice method delegating to AI Orchestrator
   */
  async generateClimateAdvice(params: {
    userQuery: string;
    userProfile: UserProfile;
    weatherData?: WeatherData;
    model?: string;
    apiKey?: string;
  }): Promise<{ responseText: string; tokensUsed?: number; modelUsed: string; metadata?: AIOrchestrationMetadata }> {
    const meta = await this.orchestrateQuery(params);
    return {
      responseText: meta.response,
      tokensUsed: meta.tokensUsed,
      modelUsed: meta.modelUsed,
      metadata: meta,
    };
  }

  /**
   * Health check status method
   */
  async checkHealth(apiKey?: string, model?: string): Promise<OpenAIHealthCheckResult> {
    return checkOpenAIHealthStatus(apiKey, model);
  }
}

export const openAIService = new MockOpenAIService();
