# Meta WhatsApp Business Cloud API Integration Specs

## 1. Overview
The **Dayli.ai Climate Health Copilot** features a production-ready **Meta WhatsApp Business Cloud API Architecture** operating behind a clean provider abstraction.

---

## 2. Architecture & Inbound/Outbound Flow

```
                 DEVELOPMENT MODE (MESSAGE_PROVIDER=mock)
WhatsApp Simulator UI ──► Mock WhatsApp Provider ──► AI / Climate / Safety Engines

                 PRODUCTION MODE (MESSAGE_PROVIDER=meta)
Meta Cloud API ──► Webhook (GET Verify / POST HMAC SHA-256) ──► Message Normalizer
                                                                       │
                                                                       ▼
                                                             Idempotency Check
                                                                       │
                                                                       ▼
                                                                Session Manager
                                                                       │
                                                                       ▼
                                                             AI Orchestrator & Safety
                                                                       │
                                                                       ▼
                                                            Response Outbound Builder
                                                                       │
                                                                       ▼
Meta Cloud API ◄── Meta WhatsApp Provider (Graph v19.0) ◄─────────────┘
```

---

## 3. Environment Variables Setup

```bash
# Provider Selection ("mock" for local simulator | "meta" for live production)
MESSAGE_PROVIDER=mock
VITE_MESSAGE_PROVIDER=mock

# Meta Cloud API Credentials (From Meta Developer Dashboard)
META_WHATSAPP_ACCESS_TOKEN=EAAG...your_system_user_token
VITE_META_WHATSAPP_ACCESS_TOKEN=EAAG...your_system_user_token

META_WHATSAPP_PHONE_NUMBER_ID=15550239841
VITE_META_WHATSAPP_PHONE_NUMBER_ID=15550239841

# Webhook Handshake & Security
META_WHATSAPP_VERIFY_TOKEN=dayli_ai_webhook_verify_token_2026
VITE_META_WHATSAPP_VERIFY_TOKEN=dayli_ai_webhook_verify_token_2026

META_WHATSAPP_APP_SECRET=your_meta_app_secret_hash
VITE_META_WHATSAPP_APP_SECRET=your_meta_app_secret_hash
```

---

## 4. Meta Webhook Registration & Verification Guide

### Step 1: Meta Developer Portal Setup
1. Go to [Meta for Developers Console](https://developers.facebook.com/).
2. Create or select your **WhatsApp Business App**.
3. Under **WhatsApp → Configuration**, enter your Webhook URL:
   - **Callback URL**: `https://your-domain.com/api/webhook`
   - **Verify Token**: `dayli_ai_webhook_verify_token_2026` (or token set in `META_WHATSAPP_VERIFY_TOKEN`).
4. Click **Verify and Save**.

### Step 2: Webhook Subscription Fields
Subscribe to the following webhook fields under Meta App Dashboard:
- `messages`: Triggers when users send text, button replies, list selections, or GPS locations.
- `message_template_status_update`: Triggers on template approvals.

---

## 5. Security & Idempotency Checklist

1. **HMAC SHA-256 Signature Validation**:
   All incoming POST webhook requests are verified using `x-hub-signature-256` header against `META_WHATSAPP_APP_SECRET`.
2. **Idempotency Guarantee**:
   `IdempotencyEngine` tracks incoming `message_id` values (24-hour TTL) to prevent duplicate processing if Meta re-tries webhook delivery.
3. **Secret Isolation**:
   No Meta credentials, secrets, or access tokens are ever rendered in client DOMs or logs. DevConsole uses masked tokens (`EAAG...389`).
