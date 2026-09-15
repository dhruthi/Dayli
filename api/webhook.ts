/**
 * Meta WhatsApp Business Cloud API — Webhook Endpoint
 * ---------------------------------------------------
 * Deployed as a Vercel Node serverless function at:  https://<domain>/api/webhook
 *
 * GET  → Meta subscription handshake (hub.mode / hub.verify_token / hub.challenge)
 * POST → Inbound message events. Validates x-hub-signature-256 (HMAC SHA-256 over the
 *        EXACT raw body), then delegates to the existing WhatsAppMessageRouter pipeline.
 *
 * Uses the Web-standard handler signature so we can call `request.text()` and hash the
 * unmodified raw payload. Re-serializing a parsed JSON body would break the HMAC.
 */

import { webhookHandler } from '../src/services/whatsapp/webhookHandler';
import { whatsAppMessageRouter } from '../src/services/whatsapp/messageRouter';

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
};

/** Meta retries any webhook it doesn't get a 2xx for within ~20s. Stay under that. */
const PROCESSING_BUDGET_MS = 15_000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);

  // ── 1. Subscription handshake ──────────────────────────────────────────────
  if (request.method === 'GET') {
    const result = webhookHandler.verifyWebhook({
      mode: url.searchParams.get('hub.mode') ?? undefined,
      verifyToken: url.searchParams.get('hub.verify_token') ?? undefined,
      challenge: url.searchParams.get('hub.challenge') ?? undefined,
    });

    if (result.isValid) {
      // Meta requires the raw challenge string echoed back as text/plain.
      return new Response(result.challenge ?? 'OK', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      });
    }

    console.warn('[webhook] handshake rejected:', result.message);
    return new Response('Forbidden', { status: 403 });
  }

  // ── 2. Inbound events ──────────────────────────────────────────────────────
  if (request.method === 'POST') {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256') ?? undefined;

    const signatureValid = await webhookHandler.validateSignature(rawBody, signature);
    if (!signatureValid) {
      console.warn('[webhook] HMAC signature validation failed — payload rejected');
      return new Response('Invalid signature', { status: 401 });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      // Malformed body: ack anyway so Meta stops retrying a payload we can never parse.
      return json({ received: true, processed: false, reason: 'Unparseable JSON body' });
    }

    try {
      const routed = await Promise.race([
        whatsAppMessageRouter.routeIncomingMessage(payload, true),
        new Promise<{ processed: false; reason: string }>((resolve) =>
          setTimeout(
            () => resolve({ processed: false, reason: 'Processing budget exceeded' }),
            PROCESSING_BUDGET_MS
          )
        ),
      ]);

      if (!routed.processed) {
        console.log('[webhook] not processed:', routed.reason);
      }

      // Always 200 — a non-2xx makes Meta redeliver, which duplicates patient messages.
      return json({ received: true, ...routed });
    } catch (err: any) {
      console.error('[webhook] pipeline error:', err?.message, err?.stack);
      return json({ received: true, processed: false, error: err?.message });
    }
  }

  return new Response('Method Not Allowed', {
    status: 405,
    headers: { allow: 'GET, POST' },
  });
}
