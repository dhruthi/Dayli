# Dayli.ai Shared REST API Documentation

## 1. Overview
The **Dayli.ai Climate Health Copilot** provides a clean, unified **Shared REST API Backend Architecture** (`/api/*`). The Dayli.ai Website, Meta WhatsApp Business Cloud API, and Developer Simulator all consume the exact same underlying business logic engines (`AIOrchestrator`, `ClimateService`, `ClinicalSafetyEngine`).

---

## 2. API Endpoints Reference

### 💬 1. Universal Chat API
- **Endpoint**: `POST /api/chat/message`
- **Description**: Central chat execution pipeline serving Website, WhatsApp, or Simulator.
- **Request Body**:
```json
{
  "session_id": "sess_web_98421",
  "message": "What should I drink in 42°C heat in 2nd trimester?",
  "channel": "web",
  "user_name": "Ananya Sharma",
  "phone_number": "+919876543210"
}
```
- **Response**:
```json
{
  "success": true,
  "data": {
    "message": "💧 *HYDRATION GUIDANCE for Ananya Sharma*\n\nIn 42°C ambient heat during your 2nd trimester, increase intake to 3.2 Liters (3,200 mL)...",
    "intent": "general_care",
    "risk_level": "Low",
    "actions": ["HYDRATION_CALCULATED"],
    "referral": null,
    "sources": ["WHO/UNICEF Heat Guide 2024"],
    "metadata": {
      "latency_ms": 142,
      "model_used": "gpt-4o-mini",
      "fallback_used": false,
      "channel": "web",
      "prompt_version": "v1.0.0"
    }
  },
  "timestamp": "2026-08-08T20:15:42Z"
}
```

---

### ☀️ 2. Climate Intelligence API
- **Endpoint**: `GET /api/climate`
- **Query Params**: `lat`, `lon`, `locationName`
- **Response**: Returns normalized temperature, feels-like temp, humidity, wind, AQI, UV index, health risks, and hydration target.

---

### 🚨 3. Clinical Triage Assessment API
- **Endpoint**: `POST /api/triage`
- **Request Body**:
```json
{
  "symptoms": ["fainting", "dizziness"],
  "userQuery": "I felt faint and dizzy after walking in sun"
}
```
- **Response**: Returns deterministic risk level (`low|moderate|high|emergency`), triggered red flags, reason codes, and referral ticket if required.

---

### 📊 4. Web Dashboard Overview API
- **Endpoint**: `GET /api/dashboard/summary`
- **Description**: Structured overview payload powering the Dayli.ai website user dashboard.
- **Response**: Aggregated user profile, current climate, thermal risk scores, daily hydration target, and active referral status.

---

### 🏥 5. Health Check API
- **Endpoint**: `GET /api/health`
- **Response**: Status of API gateway, AI Orchestrator, Climate Provider, Clinical Safety Engine, and Session Manager.

---

### 🔐 6. Admin System Stats API (Restricted)
- **Endpoint**: `GET /api/admin/stats`
- **Header**: `Authorization: Bearer <token>`
- **Response**: Total referrals generated, active cache entries, and provider statuses.

---

## 3. CORS & Security Policy
- Production requests are restricted to allowed origins (`https://dayli.ai`, `https://app.dayli.ai`).
- Unrestricted wildcard CORS is disabled.
- All user inputs are sanitized before NLU processing.
