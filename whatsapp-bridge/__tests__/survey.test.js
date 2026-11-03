import { describe, it, expect } from 'vitest';
import {
  SURVEY_IDS,
  isSurveyTrigger,
  isSurveySkip,
  surveyInvitePrompt,
  surveyQ1Prompt,
  surveyQ2Prompt,
  surveyQ3Prompt,
  surveyQ2ServicePrompt,
  surveyQ2ImprovePrompt,
  surveyQ3ClarityPrompt,
  surveyCompletePrompt,
  advanceSurvey,
  sendFeedbackSurveyToUser,
  sendFeedbackSurveyToAllUsers,
} from '../lib/survey.js';

describe('Interactive Multilingual MCQ Feedback Survey (lib/survey.js)', () => {
  it('detects survey triggers across English, Telugu, and Hindi', () => {
    expect(isSurveyTrigger('survey')).toBe(true);
    expect(isSurveyTrigger('FEEDBACK')).toBe(true);
    expect(isSurveyTrigger('rate')).toBe(true);
    expect(isSurveyTrigger('సర్వే')).toBe(true);
    expect(isSurveyTrigger('ఫీడ్‌బ్యాక్')).toBe(true);
    expect(isSurveyTrigger('सर्वे')).toBe(true);
    expect(isSurveyTrigger('फीडबैक')).toBe(true);
    expect(isSurveyTrigger('', SURVEY_IDS.start)).toBe(true);

    expect(isSurveyTrigger('hello')).toBe(false);
    expect(isSurveyTrigger('need hospital')).toBe(false);
  });

  it('detects skip/cancel requests', () => {
    expect(isSurveySkip('skip')).toBe(true);
    expect(isSurveySkip('cancel')).toBe(true);
    expect(isSurveySkip('దాటవేయి')).toBe(true);
    expect(isSurveySkip('छोड़ें')).toBe(true);
    expect(isSurveySkip('', SURVEY_IDS.skip)).toBe(true);

    expect(isSurveySkip('continue')).toBe(false);
  });

  it('enforces WhatsApp Cloud API length limits on all prompt titles & descriptions', () => {
    const locales = ['en', 'te', 'hi'];

    for (const loc of locales) {
      // Invite prompt
      const invite = surveyInvitePrompt(loc);
      expect(invite.kind).toBe('buttons');
      expect(invite.buttons.length).toBeLessThanOrEqual(3);
      for (const btn of invite.buttons) {
        expect(btn.title.length).toBeLessThanOrEqual(20);
      }

      // All list prompts: Q1, Q2 Service, Q2 Improve, Q3 Clarity
      const prompts = [
        surveyQ1Prompt(loc),
        surveyQ2ServicePrompt(loc),
        surveyQ2ImprovePrompt(loc),
        surveyQ3ClarityPrompt(loc),
        surveyQ2Prompt(loc),
        surveyQ3Prompt(loc),
      ];
      for (const p of prompts) {
        expect(p.kind).toBe('list');
        expect(p.buttonText.length).toBeLessThanOrEqual(20);
        for (const sec of p.sections) {
          expect(sec.title.length).toBeLessThanOrEqual(24);
          for (const row of sec.rows) {
            expect(row.title.length).toBeLessThanOrEqual(24);
            expect(row.description.length).toBeLessThanOrEqual(72);
          }
        }
      }

      // Completion prompt
      const done = surveyCompletePrompt(loc);
      expect(done.kind).toBe('text');
      expect(done.body).toMatch(/DPDP|డీపీడీపీ|डीपीडीपी/);
    }
  });

  it('advances through positive CSAT branch (5 stars) -> service -> clarity -> completion', () => {
    const session = {
      profile: {
        locale: 'en',
        subjectType: 'pregnant_person',
        pregnancyTrimester: '3rd Trimester',
      },
      survey: null,
    };

    // Step 0: Trigger survey
    const step0 = advanceSurvey(session, { replyId: SURVEY_IDS.start });
    expect(step0.handled).toBe(true);
    expect(step0.prompt.header).toContain('Question 1 of 3');
    expect(session.survey.active).toBe(true);
    expect(session.survey.step).toBe(1);

    // Step 1: Answer Q1 with 5 stars (Delighted branch)
    const step1 = advanceSurvey(session, { replyId: SURVEY_IDS.q1_5 });
    expect(step1.handled).toBe(true);
    expect(step1.prompt.header).toContain('Question 2 of 3: Service');
    expect(session.survey.step).toBe(2);
    expect(session.survey.answers.rating).toBe(5);
    expect(session.survey.answers.kind).toBe('helpful');

    // Step 2: Answer Q2 Service with Hydration Advice
    const step2 = advanceSurvey(session, { replyId: SURVEY_IDS.q2ServiceHydration });
    expect(step2.handled).toBe(true);
    expect(step2.prompt.header).toContain('Question 3 of 3: Clarity');
    expect(session.survey.step).toBe(3);
    expect(session.survey.answers.service).toBe('Hydration Advisory');

    // Step 3: Answer Q3 Clarity with Very Clear
    const step3 = advanceSurvey(session, { replyId: SURVEY_IDS.q3Clear });
    expect(step3.handled).toBe(true);
    expect(step3.completed).toBe(true);
    expect(step3.prompt.body).toContain('Thank you so much');
    expect(session.survey).toBe(null); // Reset after completion

    // Validate structured survey payload directly matches dashboard metrics
    expect(step3.surveyData).toEqual({
      rating: 5,
      clarity: 'very_clear',
      kind: 'helpful',
      reason: null,
      service: 'Hydration Advisory',
      locale: 'en',
      cohort: '3rd Trimester',
      comment: 'Survey: 5⭐ (Hydration Advisory) | Clarity: Very Clear',
    });
  });

  it('advances through constructive CSAT branch (2 stars) -> improvement driver -> clarity -> completion', () => {
    const session = {
      profile: {
        locale: 'te',
        subjectType: 'pregnant_person',
        pregnancyTrimester: '2nd Trimester',
      },
      survey: null,
    };

    // Step 0: Trigger survey via Telugu keyword
    const step0 = advanceSurvey(session, { text: 'సర్వే చేయండి' });
    expect(step0.handled).toBe(true);
    expect(session.survey.active).toBe(true);

    // Step 1: Answer Q1 with 2 stars (Improvement branch)
    const step1 = advanceSurvey(session, { replyId: SURVEY_IDS.q1_2 });
    expect(step1.handled).toBe(true);
    expect(step1.prompt.header).toContain('ప్రశ్న 2/3: మెరుగుదల');
    expect(session.survey.answers.rating).toBe(2);
    expect(session.survey.answers.kind).toBe('needMore');

    // Step 2: Select Hospital Beds info as improvement driver
    const step2 = advanceSurvey(session, { replyId: SURVEY_IDS.q2ReasonHospital });
    expect(step2.handled).toBe(true);
    expect(step2.prompt.header).toContain('ప్రశ్న 3/3: స్పష్టత');
    expect(session.survey.answers.reason).toBe('hospital_info');

    // Step 3: Select Medical Jargon Hard for clarity
    const step3 = advanceSurvey(session, { replyId: SURVEY_IDS.q3Hard });
    expect(step3.handled).toBe(true);
    expect(step3.completed).toBe(true);
    expect(session.survey).toBe(null);

    // Validate structured survey payload maps to negative reasons & hospital service
    expect(step3.surveyData.rating).toBe(2);
    expect(step3.surveyData.kind).toBe('needMore');
    expect(step3.surveyData.reason).toBe('hospital_info');
    expect(step3.surveyData.service).toBe('Hospital Routing');
    expect(step3.surveyData.clarity).toBe('terms_hard');
    expect(step3.surveyData.cohort).toBe('2nd Trimester');
  });

  it('gracefully handles user skipping the survey at any point', () => {
    const session = {
      profile: { locale: 'te' },
      survey: {
        active: true,
        step: 2,
        answers: { rating: 4 },
      },
    };

    const res = advanceSurvey(session, { replyId: SURVEY_IDS.skip });
    expect(res.handled).toBe(true);
    expect(res.skipped).toBe(true);
    expect(session.survey).toBe(null);
  });

  it('supports text input fallbacks (e.g. typing "5" or "clear")', () => {
    const session = {
      profile: { locale: 'hi' },
      survey: {
        active: true,
        step: 1,
        answers: {},
      },
    };

    const res = advanceSurvey(session, { text: '5' });
    expect(res.handled).toBe(true);
    expect(session.survey.step).toBe(2);
    expect(session.survey.answers.rating).toBe(5);
  });

  it('dispatches feedback survey to consented active users via sendFeedbackSurveyToUser', async () => {
    const mockSessions = {
      '919999999999': {
        consent: { granted: true },
        profile: { locale: 'te' },
        lastInboundAt: Date.now() - 1000,
      },
      '918888888888': {
        consent: { granted: false },
        profile: { locale: 'en' },
      },
    };

    const mockStore = {
      async getSession(waId) {
        return mockSessions[waId] || null;
      },
      async saveSession(waId, session) {
        mockSessions[waId] = session;
      },
      async getActiveUsers() {
        return ['919999999999'];
      },
    };

    const sentMessages = [];
    const mockCloudApi = {
      async sendButtons(waId, payload) {
        sentMessages.push({ waId, payload });
        return { ok: true };
      },
    };

    // 1. Sending to consented user succeeds
    const res1 = await sendFeedbackSurveyToUser({
      waId: '919999999999',
      store: mockStore,
      cloudApi: mockCloudApi,
      force: true,
    });
    expect(res1.success).toBe(true);
    expect(sentMessages.length).toBe(1);
    expect(sentMessages[0].waId).toBe('919999999999');
    expect(sentMessages[0].payload.buttons.length).toBe(2);
    expect(mockSessions['919999999999'].surveyLastSentAt).toBeDefined();

    // 2. Sending to non-consented user is blocked under DPDP
    const res2 = await sendFeedbackSurveyToUser({
      waId: '918888888888',
      store: mockStore,
      cloudApi: mockCloudApi,
      force: true,
    });
    expect(res2.success).toBe(false);
    expect(res2.error).toContain('not consented');

    // 3. Broadcasting to all active users
    const broadcastRes = await sendFeedbackSurveyToAllUsers({
      store: mockStore,
      cloudApi: mockCloudApi,
      force: true,
    });
    expect(broadcastRes.totalUsers).toBe(1);
    expect(broadcastRes.sentCount).toBe(1);
  });
});
