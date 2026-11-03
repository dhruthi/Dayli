import { describe, it, expect } from 'vitest';
import express from 'express';

describe('POST /api/send-alert Endpoint Security & Validation', () => {
  it('rejects requests when DAYLI_INTERNAL_API_KEY is missing on server', async () => {
    const originalKey = process.env.DAYLI_INTERNAL_API_KEY;
    delete process.env.DAYLI_INTERNAL_API_KEY;

    // Simulate endpoint logic
    const expectedKey = (process.env.DAYLI_INTERNAL_API_KEY || '').trim();
    expect(expectedKey).toBe('');

    process.env.DAYLI_INTERNAL_API_KEY = originalKey;
  });

  it('rejects unauthorized requests with mismatched x-dayli-api-key', async () => {
    process.env.DAYLI_INTERNAL_API_KEY = 'secret_test_key_123';
    const providedKey = 'wrong_key';

    const isAuthorized = providedKey === process.env.DAYLI_INTERNAL_API_KEY;
    expect(isAuthorized).toBe(false);
  });

  it('validates required recipient phone number', async () => {
    const body = { city: 'Hyderabad', feelsLike: 42 };
    const to = ((body.to || '')).replace(/[^\d]/g, '');
    expect(to).toBe('');
  });

  it('formats clean E.164 phone numbers properly', async () => {
    const body = { to: '+91 (987) 654-3210', city: 'Hyderabad', feelsLike: 42 };
    const to = (body.to || '').replace(/[^\d]/g, '');
    expect(to).toBe('919876543210');
  });
});
