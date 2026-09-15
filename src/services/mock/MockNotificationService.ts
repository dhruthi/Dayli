import { INotificationService, IAnalyticsService, AnalyticsMetrics } from '../interfaces';

export class MockNotificationService implements INotificationService {
  async scheduleAdherenceReminder(patientId: string, time: string, message: string): Promise<{ scheduleId: string }> {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return {
      scheduleId: `SCHED-${Math.floor(1000 + Math.random() * 9000)}`,
    };
  }
}

export class MockAnalyticsService implements IAnalyticsService {
  private metrics: AnalyticsMetrics = {
    totalConversationsStarted: 1248,
    activeWorkflowsCount: {
      'general-care': 540,
      referral: 312,
      medication: 284,
      stakeholder: 112,
    },
    totalButtonsClicked: 4890,
    workflowCompletionRatePercent: 94.2,
    averageCompletionTimeSeconds: 64,
    totalReferralsGenerated: 184,
    highRiskTriageCount: 42,
    heatAdherenceNudgesSent: 1420,
  };

  trackEvent(eventName: string, properties?: Record<string, any>): void {
    console.log(`[Analytics Tracked] ${eventName}`, properties);

    if (eventName === 'workflow_started') {
      this.metrics.totalConversationsStarted += 1;
      const wId = properties?.workflowId;
      if (wId) {
        this.metrics.activeWorkflowsCount[wId] = (this.metrics.activeWorkflowsCount[wId] || 0) + 1;
      }
    } else if (eventName === 'button_click') {
      this.metrics.totalButtonsClicked += 1;
    } else if (eventName === 'referral_created') {
      this.metrics.totalReferralsGenerated += 1;
      if (properties?.riskScore === 'High') {
        this.metrics.highRiskTriageCount += 1;
      }
    }
  }

  async getMetrics(): Promise<AnalyticsMetrics> {
    return { ...this.metrics };
  }
}

export const notificationService = new MockNotificationService();
export const analyticsService = new MockAnalyticsService();
