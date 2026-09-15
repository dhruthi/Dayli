import {
  ApiResponse,
  UniversalChatMessageInput,
  UniversalChatMessageOutput,
  DashboardSummaryResponse,
} from './types';
import { channelAdapter } from './channelAdapter';
import { climateService } from '../climate/climateService';
import { clinicalSafetyEngine } from '../clinical/clinicalSafetyEngine';
import { referralTicketService } from '../clinical/referralTicketService';
import { sessionManager } from '../session/sessionManager';
import { authService } from './authService';
import { securityConfig } from './securityConfig';

export class SharedApiRouter {
  /**
   * Universal Chat Endpoint (POST /api/chat/message)
   */
  async handleChatMessage(
    body: UniversalChatMessageInput,
    originHeader?: string
  ): Promise<ApiResponse<UniversalChatMessageOutput>> {
    const timestamp = new Date().toISOString();

    if (!securityConfig.isOriginAllowed(originHeader)) {
      return {
        success: false,
        error: { code: 'FORBIDDEN_CORS', message: 'CORS Origin not allowed.' },
        timestamp,
      };
    }

    if (!body.message || !body.message.trim()) {
      return {
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Field message is required.' },
        timestamp,
      };
    }

    const cleanInput: UniversalChatMessageInput = {
      ...body,
      message: securityConfig.sanitizeInput(body.message),
      session_id: body.session_id || `sess_${Date.now()}`,
      channel: body.channel || 'web',
    };

    try {
      const output = await channelAdapter.processUniversalMessage(cleanInput);
      return {
        success: true,
        data: output,
        timestamp,
      };
    } catch (err: any) {
      return {
        success: false,
        error: { code: 'SERVER_ERROR', message: err.message },
        timestamp,
      };
    }
  }

  /**
   * Climate Intelligence Endpoint (GET /api/climate)
   */
  async handleGetClimate(params: {
    lat?: number;
    lon?: number;
    locationName?: string;
  }): Promise<ApiResponse> {
    const timestamp = new Date().toISOString();
    try {
      const intel = await climateService.getClimateIntelligence({
        latitude: params.lat,
        longitude: params.lon,
        locationName: params.locationName,
      });
      return {
        success: true,
        data: intel,
        timestamp,
      };
    } catch (err: any) {
      return {
        success: false,
        error: { code: 'CLIMATE_ERROR', message: err.message },
        timestamp,
      };
    }
  }

  /**
   * Clinical Triage Assessment Endpoint (POST /api/triage)
   */
  async handleTriage(body: {
    symptoms: string[];
    userQuery?: string;
    phone?: string;
  }): Promise<ApiResponse> {
    const timestamp = new Date().toISOString();
    const phone = body.phone || '+919876543210';
    const session = sessionManager.getSession(phone);

    try {
      const safetyRes = clinicalSafetyEngine.evaluate({
        symptoms: body.symptoms || [],
        userQuery: body.userQuery || body.symptoms.join(', '),
        userProfile: session.profile,
      });

      return {
        success: true,
        data: safetyRes,
        timestamp,
      };
    } catch (err: any) {
      return {
        success: false,
        error: { code: 'TRIAGE_ERROR', message: err.message },
        timestamp,
      };
    }
  }

  /**
   * Dayli.ai Web Dashboard Summary API (GET /api/dashboard/summary)
   */
  async handleGetDashboardSummary(phone: string = '+919876543210'): Promise<ApiResponse<DashboardSummaryResponse>> {
    const timestamp = new Date().toISOString();
    try {
      const session = sessionManager.getSession(phone);
      const intel = await climateService.getClimateIntelligence({
        latitude: session.location?.latitude || 28.6139,
        longitude: session.location?.longitude || 77.209,
        locationName: session.location?.name || 'New Delhi Central',
      });

      const tickets = referralTicketService.getAllTickets();
      const userTicket = tickets.find((t) => t.user_id === phone || t.user_id === session.userId);

      const summary: DashboardSummaryResponse = {
        user: {
          name: session.profile.name,
          trimester: session.profile.trimester,
          location_name: session.profile.locationName || 'New Delhi Central',
        },
        current_climate: {
          temperature_c: intel.normalized.temperature_c,
          feels_like_c: intel.normalized.feels_like_c,
          aqi: intel.normalized.aqi,
          aqi_status: intel.normalized.aqi_status,
          uv_index: intel.normalized.uv_index,
          uv_status: intel.normalized.uv_status,
        },
        risk_assessment: {
          heat_risk: intel.riskAssessment.heat_risk,
          dehydration_risk: intel.riskAssessment.dehydration_risk,
          air_quality_risk: intel.riskAssessment.air_quality_risk,
          overall_climate_risk: intel.riskAssessment.overall_climate_risk,
        },
        hydration_target: {
          target_liters: intel.hydration.recommended_target_liters,
          target_ml: intel.hydration.recommended_target_ml,
          disclaimer: intel.hydration.disclaimer,
        },
        active_referral: {
          has_referral: !!userTicket,
          ticket_id: userTicket?.ticket_id,
          priority: userTicket?.priority,
          facility_name: userTicket?.facility_name,
        },
        recent_interactions_count: session.recentMessages.length,
      };

      return {
        success: true,
        data: summary,
        timestamp,
      };
    } catch (err: any) {
      return {
        success: false,
        error: { code: 'DASHBOARD_ERROR', message: err.message },
        timestamp,
      };
    }
  }

  /**
   * Health Check Endpoint (GET /api/health)
   */
  async handleHealthCheck(): Promise<ApiResponse> {
    return {
      success: true,
      data: {
        status: 'UP',
        service: 'dayli-ai-shared-api-backend',
        version: '1.0.0',
        uptime_seconds: process.uptime ? Math.floor(process.uptime()) : 100,
        components: {
          ai_orchestrator: 'UP',
          climate_engine: climateService.getStatus().sourceType,
          clinical_safety_engine: 'UP v1.0.0',
          session_manager: 'UP',
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Admin System Stats (GET /api/admin/stats) - Restricted
   */
  async handleAdminStats(token?: string): Promise<ApiResponse> {
    const timestamp = new Date().toISOString();
    if (!authService.hasAdminRole(token)) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Admin authentication token required.' },
        timestamp,
      };
    }

    return {
      success: true,
      data: {
        total_referrals_generated: referralTicketService.getAllTickets().length,
        climate_status: climateService.getStatus(),
      },
      timestamp,
    };
  }
}

export const sharedApiRouter = new SharedApiRouter();
