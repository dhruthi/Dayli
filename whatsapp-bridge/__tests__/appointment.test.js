import { describe, it, expect, vi, beforeEach } from 'vitest';
import { composeAppointmentWeatherAdvice } from '../lib/actionAdvisor.js';
import { composeDeterministicResponse } from '../lib/responder.js';
import { composeMorningBrief } from '../lib/morningBrief.js';

describe('Appointment Weather Advice (actionAdvisor)', () => {
  it('returns safe when no peak heat', () => {
    const forecast = { peakHeatWindow: { hasPeakHeat: false } };
    const result = composeAppointmentWeatherAdvice(forecast, { date: '2026-11-15' });
    expect(result.riskLevel).toBe('normal');
    expect(result.i18nKey).toBe('appt_weather_safe');
  });

  it('returns danger for extreme wet-bulb', () => {
    const forecast = {
      peakHeatWindow: { hasPeakHeat: true, peakFeels: 40 },
      peakWetBulb: 34,
    };
    const result = composeAppointmentWeatherAdvice(forecast, { date: '2026-11-15' });
    expect(result.riskLevel).toBe('extreme');
    expect(result.i18nKey).toBe('appt_weather_danger');
  });

  it('returns danger for extreme feels-like', () => {
    const forecast = {
      peakHeatWindow: { hasPeakHeat: true, peakFeels: 46 },
      peakWetBulb: 25,
    };
    const result = composeAppointmentWeatherAdvice(forecast, { date: '2026-11-15' });
    expect(result.riskLevel).toBe('extreme');
    expect(result.i18nKey).toBe('appt_weather_danger');
  });

  it('returns danger for high wet-bulb (28-32)', () => {
    const forecast = {
      peakHeatWindow: { hasPeakHeat: true, peakFeels: 35 },
      peakWetBulb: 29,
    };
    const result = composeAppointmentWeatherAdvice(forecast, { date: '2026-11-15' });
    expect(result.riskLevel).toBe('high');
    expect(result.i18nKey).toBe('appt_weather_danger');
  });

  it('returns caution for moderate heat (feels-like 33-37)', () => {
    const forecast = {
      peakHeatWindow: { hasPeakHeat: true, peakFeels: 35 },
      peakWetBulb: 24,
    };
    const result = composeAppointmentWeatherAdvice(forecast, { date: '2026-11-15' });
    expect(result.riskLevel).toBe('moderate');
    expect(result.i18nKey).toBe('appt_weather_caution');
  });

  it('returns safe for null forecast', () => {
    const result = composeAppointmentWeatherAdvice(null, { date: '2026-11-15' });
    expect(result.riskLevel).toBe('normal');
    expect(result.i18nKey).toBe('appt_weather_safe');
  });
});

describe('Appointment Query (responder)', () => {
  const today = new Date().toISOString().slice(0, 10);

  it('returns appt_none when no appointments', () => {
    const result = composeDeterministicResponse({
      routed: { intent: 'appointment_query', language: 'en' },
      userMessage: 'next appointment',
      session: { profile: { locale: 'en' } },
    });
    expect(result).toContain('upcoming appointments');
  });

  it('shows next appointment with date', () => {
    const futureDate = '2099-12-25';
    const result = composeDeterministicResponse({
      routed: { intent: 'appointment_query', language: 'en' },
      userMessage: 'next appointment',
      session: {
        profile: {
          locale: 'en',
          appointments: [{ date: futureDate, label: 'Doctor visit' }],
        },
      },
    });
    expect(result).toContain('Doctor visit');
    expect(result).toContain(futureDate);
  });

  it('shows today appointment without date', () => {
    const result = composeDeterministicResponse({
      routed: { intent: 'appointment_query', language: 'en' },
      userMessage: 'my appointment',
      session: {
        profile: {
          locale: 'en',
          appointments: [{ date: today, label: 'Doctor visit' }],
        },
      },
    });
    expect(result).toContain('today');
    expect(result).toContain('Doctor visit');
  });

  it('includes weather advice when climate data available', () => {
    const result = composeDeterministicResponse({
      routed: { intent: 'appointment_query', language: 'en' },
      userMessage: 'next appointment',
      session: {
        profile: {
          locale: 'en',
          appointments: [{ date: '2099-12-25', label: 'Doctor visit' }],
        },
      },
      climateData: {
        forecast: { peakHeatWindow: { hasPeakHeat: false } },
      },
    });
    expect(result).toContain('Doctor visit');
    expect(result).toContain('comfortable');
  });
});

describe('Morning Brief with Appointments', () => {
  it('appends appointment reminder when user has appointment today', () => {
    const todayIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const session = {
      profile: {
        locale: 'en',
        name: 'Priya',
        location: { name: 'Hyderabad' },
        appointments: [{ date: todayIST, label: 'Doctor visit', time: '10:00' }],
      },
    };
    const climate = { temperature: 32, feelsLike: 35, aqi: 'Moderate', uvIndex: 7 };
    const brief = composeMorningBrief(session, climate);
    expect(brief).toContain('Good morning');
    expect(brief).toContain('Doctor visit');
  });

  it('does not append appointment section when no appointments today', () => {
    const session = {
      profile: {
        locale: 'en',
        name: 'Priya',
        location: { name: 'Hyderabad' },
        appointments: [{ date: '2099-12-25', label: 'Doctor visit' }],
      },
    };
    const climate = { temperature: 32, feelsLike: 35, aqi: 'Moderate', uvIndex: 7 };
    const brief = composeMorningBrief(session, climate);
    expect(brief).toContain('Good morning');
    expect(brief).not.toContain('Doctor visit');
  });

  it('works without any appointments array', () => {
    const session = {
      profile: { locale: 'en', name: 'Priya', location: { name: 'Hyderabad' } },
    };
    const climate = { temperature: 32, feelsLike: 35, aqi: 'Moderate', uvIndex: 7 };
    const brief = composeMorningBrief(session, climate);
    expect(brief).toContain('Good morning');
    expect(brief).toContain('Hyderabad');
  });
});
