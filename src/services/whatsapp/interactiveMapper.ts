export class WhatsAppInteractiveMapper {
  /**
   * Main Menu Interactive Buttons payload for Meta Cloud API
   */
  getMainMenuButtonsPayload(headerText?: string, bodyText?: string) {
    return {
      type: 'button',
      header: headerText ? { type: 'text', text: headerText } : undefined,
      body: {
        text: bodyText || 'Welcome to dayli.ai Climate Health Copilot. Please select an option to continue:',
      },
      footer: { text: 'WHO / UNICEF Maternal Heat Protection Protocol' },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: 'btn_opt_general_care',
              title: '☀️ General Care',
            },
          },
          {
            type: 'reply',
            reply: {
              id: 'btn_opt_triage',
              title: '🚨 Clinical Triage',
            },
          },
          {
            type: 'reply',
            reply: {
              id: 'btn_opt_medication',
              title: '💊 Medication Care',
            },
          },
        ],
      },
    };
  }

  /**
   * Main Menu Interactive List payload for Meta Cloud API
   */
  getMainMenuListPayload(headerText?: string, bodyText?: string) {
    return {
      type: 'list',
      header: headerText ? { type: 'text', text: headerText } : undefined,
      body: {
        text: bodyText || 'Select a climate health care service:',
      },
      footer: { text: 'dayli.ai Maternal Health Protection' },
      action: {
        button: 'Select Service',
        sections: [
          {
            title: 'Maternal Climate Services',
            rows: [
              {
                id: 'btn_opt_general_care',
                title: 'General Care & Climate',
                description: 'Heat alerts, AQI smog protection & hydration targets',
              },
              {
                id: 'btn_opt_triage',
                title: 'Clinical Heat Triage',
                description: 'Assess heat distress symptoms & emergency referral',
              },
              {
                id: 'btn_opt_medication',
                title: 'Medication Adherence',
                description: 'Tablet storage guidance & supplement reminders',
              },
            ],
          },
        ],
      },
    };
  }
}

export const whatsAppInteractiveMapper = new WhatsAppInteractiveMapper();
