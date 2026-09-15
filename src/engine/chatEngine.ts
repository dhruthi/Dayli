import { FlowDefinition, FlowNode, SessionState, ChatMessage, UserProfile, FlowNodeType } from '../types/chatEngine';
import {
  weatherService,
  openAIService,
  patientService,
  referralService,
  notificationService,
  metaMessagingService,
  analyticsService,
} from '../services/mock';
import { WORKFLOWS } from '../flows';
import { climateService } from '../services/climate/climateService';
import { evaluateCondition } from './conditionEvaluator';

export class ChatEngine {
  private flow: FlowDefinition;
  private state: SessionState;
  private listeners: Array<(state: SessionState) => void> = [];
  private onApiLogCallback?: (log: any) => void;
  private onWebhookLogCallback?: (event: any) => void;

  constructor(
    flow: FlowDefinition,
    initialUserProfile?: Partial<UserProfile>,
    onApiLogCallback?: (log: any) => void,
    onWebhookLogCallback?: (event: any) => void
  ) {
    this.flow = flow;
    this.onApiLogCallback = onApiLogCallback;
    this.onWebhookLogCallback = onWebhookLogCallback;
    this.state = {
      workflowId: flow.id,
      currentNodeId: flow.initialNodeId,
      status: 'idle',
      userProfile: {
        name: initialUserProfile?.name || 'Ananya Sharma',
        phoneNumber: initialUserProfile?.phoneNumber || '+919876543210',
        language: initialUserProfile?.language || 'English',
        trimester: initialUserProfile?.trimester || '2nd Trimester',
        locationName: initialUserProfile?.locationName || 'New Delhi Central',
      },
      variables: {
        patientId: 'PAT-DAYLI-8842',
        patientName: initialUserProfile?.name || 'Ananya Sharma',
        locationName: initialUserProfile?.locationName || 'New Delhi Central',
        latitude: 28.6139,
        longitude: 77.209,
      },
      messages: [],
      stepHistory: [flow.initialNodeId],
    };

    metaMessagingService.subscribeWebhooks((event: any) => {
      if (this.onWebhookLogCallback) {
        this.onWebhookLogCallback(event);
      }
      this.handleWebhookStatusUpdate(event);
    });
  }

  public subscribe(listener: (state: SessionState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.state));
  }

  public getState(): SessionState {
    return this.state;
  }

  public async start(): Promise<void> {
    this.state.status = 'running';
    this.notify();
    await this.processCurrentNode();
  }

  public restart(): void {
    const generalCareFlow = WORKFLOWS['general-care'] || this.flow;
    this.flow = generalCareFlow;
    this.state.workflowId = generalCareFlow.id;
    this.state.currentNodeId = generalCareFlow.initialNodeId;
    this.state.messages = [];
    this.state.status = 'idle';
    this.state.stepHistory = [generalCareFlow.initialNodeId];
    this.notify();
    this.start();
  }

  public reset(newFlow?: FlowDefinition): void {
    if (newFlow) this.flow = newFlow;
    this.state.currentNodeId = this.flow.initialNodeId;
    this.state.messages = [];
    this.state.status = 'idle';
    this.state.stepHistory = [this.flow.initialNodeId];
    this.notify();
    this.start();
  }

  /**
   * Resolve all {{variable}} and {{object.property}} placeholders in a template string.
   * Looks up values from state.variables (including nested objects) and userProfile.
   */
  private interpolateTemplate(template: string): string {
    // Replace all {{path.to.value}} patterns
    return template.replace(/\{\{([^}]+)\}\}/g, (_match, path: string) => {
      const trimmedPath = path.trim();

      // Check userProfile fields first
      if (trimmedPath === 'name') return this.state.userProfile.name;
      if (trimmedPath === 'locationName') return this.state.userProfile.locationName || 'Your Location';
      if (trimmedPath === 'trimester') return this.state.userProfile.trimester || '';
      if (trimmedPath === 'phoneNumber') return this.state.userProfile.phoneNumber || '';

      // Resolve dot-notation path from state.variables (e.g. "weatherData.cityName")
      const parts = trimmedPath.split('.');
      let current: any = this.state.variables;
      for (const part of parts) {
        if (current == null || typeof current !== 'object') return _match; // unresolved → keep as-is
        current = current[part];
      }

      if (current != null && (typeof current === 'string' || typeof current === 'number' || typeof current === 'boolean')) {
        return String(current);
      }

      return _match; // unresolved → keep placeholder visible for debugging
    });
  }

  private async processCurrentNode(): Promise<void> {
    if (!this.state.currentNodeId) {
      this.state.status = 'completed';
      this.notify();
      return;
    }

    const node = this.flow.nodes[this.state.currentNodeId];
    if (!node) {
      this.state.status = 'completed';
      this.notify();
      return;
    }

    analyticsService.trackEvent('node_enter', { nodeId: node.id, type: node.type });

    if (node.type === 'condition_branch') {
      await this.handleConditionBranchNode(node);
      return;
    }

    if (node.type === 'api_call') {
      await this.handleApiCallNode(node);
      return;
    }

    // Process Message / Interactive WhatsApp node
    await this.renderWhatsAppMessageNode(node);
  }

  private async renderWhatsAppMessageNode(node: FlowNode): Promise<void> {
    const messageId = `wamid.HBgL_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let rawMessageText = node.message || '';

    // Interpolate variables {{variableName}} and nested {{obj.prop}} notation
    rawMessageText = this.interpolateTemplate(rawMessageText);

    let rawHeader = node.header;
    if (rawHeader) {
      rawHeader = this.interpolateTemplate(rawHeader);
    }

    let rawFooter = node.footer;
    if (rawFooter) {
      rawFooter = this.interpolateTemplate(rawFooter);
    }

    // Construct Meta WhatsApp Cloud API outbound payload format
    let metaType = 'text';
    const metaPayload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.state.userProfile.phoneNumber,
    };

    if (node.type === 'text' || node.type === 'template' || node.type === 'form') {
      metaType = 'text';
      metaPayload.type = 'text';
      metaPayload.text = { body: rawMessageText };
    }

    if (node.type === 'media' || node.type === 'audio') {
      metaType = node.mediaType || 'image';
      metaPayload.type = metaType;
      metaPayload[metaType] = {
        link: node.mediaUrl,
        caption: rawMessageText,
      };
    }

    if (node.type === 'interactive_buttons') {
      metaType = 'interactive';
      metaPayload.type = 'interactive';
      metaPayload.interactive = {
        type: 'button',
        header: rawHeader ? { type: 'text', text: rawHeader } : undefined,
        body: { text: rawMessageText },
        footer: rawFooter ? { text: rawFooter } : undefined,
        action: {
          buttons: (node.buttons || node.quickReplies || []).map((b) => ({
            type: 'reply',
            reply: { id: b.id, title: b.title },
          })),
        },
      };
    }

    if (node.type === 'interactive_list') {
      metaType = 'interactive';
      metaPayload.type = 'interactive';
      metaPayload.interactive = {
        type: 'list',
        header: rawHeader ? { type: 'text', text: rawHeader } : undefined,
        body: { text: rawMessageText },
        footer: rawFooter ? { text: rawFooter } : undefined,
        action: {
          button: 'Select Option',
          sections: (node.listSections || []).map((sec) => ({
            title: sec.title,
            rows: sec.options.map((opt) => ({
              id: opt.id,
              title: opt.title,
              description: opt.description,
            })),
          })),
        },
      };
    }

    // Call Mock Meta Cloud API service
    const apiResult = await metaMessagingService.sendMessage(metaPayload);

    if (this.onApiLogCallback) {
      this.onApiLogCallback({
        timestamp: new Date().toISOString(),
        type: metaType,
        payload: metaPayload,
        messageId: apiResult.message_id,
      });
    }

    const newMessage: ChatMessage = {
      id: messageId,
      sender: 'bot',
      type: metaType as any,
      content: rawMessageText,
      header: rawHeader,
      footer: rawFooter,
      mediaUrl: node.mediaUrl,
      mediaType: node.mediaType,
      fileName: node.fileName,
      durationSeconds: node.durationSeconds,
      buttons: node.buttons || node.quickReplies,
      listSections: node.listSections,
      carouselCards: node.carouselCards,
      formFields: node.formFields,
      timestamp: timestampStr,
      status: 'sent',
      rawPayload: metaPayload,
      metaMessageId: apiResult.message_id,
    };

    this.state.messages.push(newMessage);
    this.state.status = 'waiting_user_input';
    this.notify();

    // Auto-advance if node has a next pointer and requires no interactive user input
    const hasInteractiveElements =
      (node.buttons && node.buttons.length > 0) ||
      (node.quickReplies && node.quickReplies.length > 0) ||
      (node.listSections && node.listSections.length > 0) ||
      (node.carouselCards && node.carouselCards.length > 0) ||
      (node.formFields && node.formFields.length > 0) ||
      node.type === 'location_request';

    if (node.next && !hasInteractiveElements) {
      setTimeout(() => {
        this.advanceToNext(node.next);
      }, node.typingDelay || 1200);
    }
  }

  /** Execute service API call nodes (Weather, Patient, Referral, OpenAI, etc.) */
  private async handleApiCallNode(node: FlowNode): Promise<void> {
    if (!node.apiCall) {
      this.advanceToNext(node.next);
      return;
    }

    const { service, method, params, storeResultAs, next } = node.apiCall;
    let result: any = null;

    try {
      if (service === 'weather') {
        const lat = params?.latitude || this.state.variables.latitude || 28.6139;
        const lon = params?.longitude || this.state.variables.longitude || 77.209;
        const locName = params?.locationName || this.state.variables.locationName || this.state.userProfile.locationName;
        result = await weatherService.getClimateHealthData(lat, lon, locName);
      } else if (service === 'openai') {
        result = await openAIService.generateClimateAdvice({
          userQuery: params?.query || 'Climate health advice',
          userProfile: this.state.userProfile,
          weatherData: this.state.variables.weatherData,
        });
      } else if (service === 'patient') {
        if (method === 'getPatientProfile') {
          result = await patientService.getPatientProfile(this.state.userProfile.phoneNumber);
        } else if (method === 'recordMedicationAdherence') {
          result = await patientService.recordMedicationAdherence(
            params?.patientId || 'PAT-DAYLI-8842',
            params?.medicationName || 'Iron & Folic Acid',
            params?.taken ?? true
          );
        }
      } else if (service === 'referral') {
        result = await referralService.createTriageReferral({
          patientId: params?.patientId || 'PAT-DAYLI-8842',
          patientName: params?.patientName || this.state.userProfile.name,
          symptoms: params?.symptoms || ['Heat Strain'],
          riskScore: params?.riskScore || 'High',
        });
        analyticsService.trackEvent('referral_created', { riskScore: params?.riskScore });
      } else if (service === 'notification') {
        result = await notificationService.scheduleAdherenceReminder(
          params?.patientId || 'PAT-DAYLI-8842',
          params?.time || '09:00 AM',
          params?.message || 'Daily Reminder'
        );
      }
    } catch (err) {
      console.error(`API Call error in node ${node.id}`, err);
    }

    if (storeResultAs) {
      this.state.variables[storeResultAs] = result;
    }

    await this.advanceToNext(next);
  }

  /** Condition branch logic solver */
  private async handleConditionBranchNode(node: FlowNode): Promise<void> {
    if (!node.condition) {
      await this.advanceToNext(node.next);
      return;
    }

    const isTrue = evaluateCondition(node.condition, this.state.variables);
    const nextNodeId = isTrue ? node.condition.nextIfTrue : node.condition.nextIfFalse;
    await this.advanceToNext(nextNodeId);
  }

  /** User responses handler (Button click, List selection, Location share, Form submit, OpenAI Custom Query) */
  public async handleUserResponse(response: {
    type: 'button_click' | 'list_select' | 'send_location' | 'submit_form' | 'text_message';
    buttonId?: string;
    buttonTitle?: string;
    optionId?: string;
    text?: string;
    location?: { latitude: number; longitude: number; name?: string };
    formData?: Record<string, any>;
  }): Promise<void> {
    const currentNode = this.flow.nodes[this.state.currentNodeId || ''];
    if (!currentNode) return;

    analyticsService.trackEvent('button_click', { type: response.type, buttonId: response.buttonId });

    let nextNodeId: string | undefined = currentNode.next;
    let userDisplayContent = response.text || response.buttonTitle || 'Option selected';

    if (response.type === 'button_click' && response.buttonId) {
      const allButtons = [...(currentNode.buttons || []), ...(currentNode.quickReplies || [])];
      const clickedBtn = allButtons.find((b) => b.id === response.buttonId);
      if (clickedBtn) {
        userDisplayContent = clickedBtn.title;
        nextNodeId = clickedBtn.next;
        if (clickedBtn.variablesToSet) {
          Object.assign(this.state.variables, clickedBtn.variablesToSet);
        }
      }
    }

    if (response.type === 'list_select' && response.optionId) {
      for (const section of currentNode.listSections || []) {
        const found = section.options.find((o) => o.id === response.optionId);
        if (found) {
          userDisplayContent = found.title;
          nextNodeId = found.next;
          if (found.variablesToSet) {
            Object.assign(this.state.variables, found.variablesToSet);
          }
          break;
        }
      }
    }

    if (response.type === 'send_location' && response.location) {
      userDisplayContent = `📍 Location: ${response.location.name || 'Current GPS'}`;
      this.state.variables.latitude = response.location.latitude;
      this.state.variables.longitude = response.location.longitude;
      this.state.variables.locationName = response.location.name || 'New Delhi Central';
    }

    if (response.type === 'submit_form') {
      userDisplayContent = '📋 Form Submitted';
      if (response.formData) {
        Object.assign(this.state.variables, response.formData);
      }

      // Resolve next node ID from form submit buttons or fall back to symptom_acknowledgement
      const allButtons = currentNode.buttons || [];
      const submitBtn = allButtons.find((b) => b.id === response.buttonId) || allButtons[0];
      if (submitBtn) {
        nextNodeId = submitBtn.next || currentNode.next || 'symptom_acknowledgement';
        if (submitBtn.variablesToSet) {
          Object.assign(this.state.variables, submitBtn.variablesToSet);
        }
      } else {
        nextNodeId = currentNode.next || 'symptom_acknowledgement';
      }
    }

    // Append user message to state
    const userMsg: ChatMessage = {
      id: `user_msg_${Date.now()}`,
      sender: 'user',
      type: response.type === 'send_location' ? 'location' : 'text',
      content: userDisplayContent,
      location: response.location,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'read',
    };

    this.state.messages.push(userMsg);
    this.state.status = 'running';
    this.notify();

    // Trigger Meta Webhook inbound user message simulation
    metaMessagingService.simulateUserInboundMessage(
      this.state.userProfile.phoneNumber,
      this.state.userProfile.name,
      {
        type: response.type,
        body: userDisplayContent,
        buttonId: response.buttonId,
        buttonTitle: response.buttonTitle,
      }
    );

    // Handle custom typed queries using AI Orchestration Engine
    if (response.type === 'text_message' && response.text) {
      // If the user granted location permission, fetch live weather for their GPS coords
      if (response.location && response.location.latitude && response.location.longitude) {
        try {
          // Show location acquired status
          const locMsg: ChatMessage = {
            id: `msg_loc_${Date.now()}`,
            sender: 'bot',
            type: 'text',
            content: `📍 *Location accessed* (${response.location.latitude.toFixed(4)}°N, ${response.location.longitude.toFixed(4)}°E)\n🌤️ Fetching live weather for your area...`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'read',
          };
          this.state.messages.push(locMsg);
          this.notify();

          // Fetch real weather data from Open-Meteo for user's exact GPS location
          const liveWeather = await weatherService.getClimateHealthData(
            response.location.latitude,
            response.location.longitude,
            response.location.name || 'User Location'
          );
          this.state.variables.weatherData = liveWeather;
          this.state.variables.latitude = response.location.latitude;
          this.state.variables.longitude = response.location.longitude;
          this.state.variables.locationName = liveWeather.cityName || response.location.name || 'User Location';
          this.state.userProfile.locationName = liveWeather.cityName || response.location.name || 'User Location';
        } catch (err) {
          console.warn('Failed to fetch live weather for user location:', err);
        }
      }

      const recentMsgs = this.state.messages.map((m: ChatMessage) => ({
        sender: m.sender,
        content: m.content,
      }));

      const aiMeta = await openAIService.orchestrateQuery({
        userQuery: response.text,
        userProfile: this.state.userProfile,
        weatherData: this.state.variables.weatherData,
        conversationState: this.state.variables,
        recentMessages: recentMsgs,
      });

      if (aiMeta.referralTicket) {
        this.state.variables.lastReferralTicket = aiMeta.referralTicket;
      }

      const intentBadge = `[Intent: ${aiMeta.intent} | Risk: ${aiMeta.riskLevel}]`;

      const aiMessage: ChatMessage = {
        id: `msg_ai_${Date.now()}`,
        sender: 'bot',
        type: 'text',
        content: aiMeta.response,
        footer: `AI Engine: ${aiMeta.modelUsed} ${intentBadge}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'read',
        metadata: aiMeta,
        buttons: [
          {
            id: 'btn_back_main_menu_ai',
            title: '🔄 Return to Main Menu',
            next: 'start_welcome_template',
          },
        ],
      };

      this.state.messages.push(aiMessage);
      this.state.status = 'waiting_user_input';
      this.notify();
      return;
    }

    // Advance to next flow node
    await new Promise((resolve) => setTimeout(resolve, 600));
    await this.advanceToNext(nextNodeId);
  }

  private async advanceToNext(nextNodeId?: string): Promise<void> {
    // If returning to Main Menu or if target is end node, load general-care main menu welcome template
    if (
      nextNodeId === 'start_welcome_template' ||
      nextNodeId === 'end_referral' ||
      nextNodeId === 'end_medication' ||
      nextNodeId === 'end' ||
      !nextNodeId
    ) {
      const generalCareFlow = WORKFLOWS['general-care'];
      if (generalCareFlow) {
        this.flow = generalCareFlow;
        this.state.workflowId = generalCareFlow.id;
        nextNodeId = 'start_welcome_template';
      }
    }

    if (nextNodeId && !this.flow.nodes[nextNodeId]) {
      const generalCareFlow = WORKFLOWS['general-care'];
      if (generalCareFlow && generalCareFlow.nodes[nextNodeId]) {
        this.flow = generalCareFlow;
        this.state.workflowId = generalCareFlow.id;
      }
    }

    this.state.currentNodeId = nextNodeId || null;
    if (nextNodeId) {
      this.state.stepHistory.push(nextNodeId);
    }
    await this.processCurrentNode();
  }

  private handleWebhookStatusUpdate(event: any) {
    const changes = event?.entry?.[0]?.changes?.[0]?.value;
    if (changes?.statuses?.[0]) {
      const { id, status } = changes.statuses[0];
      const msg = this.state.messages.find((m: ChatMessage) => m.metaMessageId === id);
      if (msg) {
        msg.status = status;
        this.notify();
      }
    }
  }
}
