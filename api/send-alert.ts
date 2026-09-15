/**
 * Outbound Climate Alert Endpoint
 * --------------------------------
 * POST https://<domain>/api/send-alert
 *
 * Server-side replacement for the localhost whatsapp-bridge `/send-alert` route.
 * Sends through the official Meta Cloud API using the server-only access token,
 * so the token is never exposed to the browser.
 *
 * Auth: requires header `x-dayli-api-key` matching DAYLI_INTERNAL_API_KEY.
 *
 * IMPORTANT — 24-hour window rule:
 * Meta only permits free-form text to a user within 24h of their last inbound
 * message. Outside that window you MUST send a pre-approved template, which is
 * what unsolicited morning climate alerts are. Pass `templateName` for those.
 */

import { metaWhatsAppProvider } from '../src/services/whatsapp/providers/MetaWhatsAppProvider';

export const config = {
  runtime: 'nodejs',
  maxDuration: 15,
};

interface AlertRequest {
  to: string;
  city?: string;
  feelsLike?: number;
  aqi?: number;
  uvIndex?: number;
  message?: string;
  templateName?: string;
  languageCode?: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function buildAlertBody(a: AlertRequest): string {
  return [
    `🚨 *dayli Climate Warning Alert* for *${a.city ?? 'your area'}*`,
    '',
    `• Apparent Temp: *${a.feelsLike ?? '—'}°C* (Feels like)`,
    `• Air Quality Index: *${a.aqi ?? '—'}*`,
    `• UV Sun Index: *${a.uvIndex ?? '—'}*`,
    '',
    '⚠️ *Health Recommendation*:',
    'Restrict outdoor travel during peak heat, increase hydration (aim for 3L+), and keep infants in cool, ventilated rooms.',
    '',
    '_Reply "help" for a clinical action checklist._',
  ].join('\n');
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
  }

  const expectedKey = (process.env.DAYLI_INTERNAL_API_KEY ?? '').trim();
  if (!expectedKey) {
    return json({ success: false, error: 'DAYLI_INTERNAL_API_KEY is not configured on the server.' }, 500);
  }
  if ((request.headers.get('x-dayli-api-key') ?? '').trim() !== expectedKey) {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }

  let body: AlertRequest;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const to = (body.to ?? '').replace(/[^\d]/g, '');
  if (!to) {
    return json({ success: false, error: 'Field "to" is required (phone number with country code).' }, 400);
  }

  try {
    const result = body.templateName
      ? await metaWhatsAppProvider.sendTemplateMessage(to, body.templateName, body.languageCode ?? 'en_US')
      : await metaWhatsAppProvider.sendTextMessage(to, body.message ?? buildAlertBody(body));

    return json(
      {
        success: result.success,
        recipient: result.recipientPhone,
        messageId: result.messageId,
        latencyMs: result.latencyMs,
        error: result.error,
        timestamp: new Date().toISOString(),
      },
      result.success ? 200 : 502
    );
  } catch (err: any) {
    console.error('[send-alert] error:', err?.message);
    return json({ success: false, error: err?.message ?? 'Unknown dispatch error' }, 500);
  }
}
