import { useState, useEffect } from 'react';
import { whatsAppMessageRouter } from '../../services/whatsapp/messageRouter';
import { webhookHandler } from '../../services/whatsapp/webhookHandler';
import { MessageSquare, Cpu, Send, Check, ShieldCheck, Key, RefreshCw, Radio, Terminal } from 'lucide-react';
import { WhatsAppSendResult, NormalizedWhatsAppMessage } from '../../services/whatsapp/types';

export const WhatsAppTab: React.FC = () => {
  const [providerType, setProviderType] = useState<'mock' | 'meta'>('mock');
  const [recipientPhone, setRecipientPhone] = useState('+919876543210');
  const [testMessage, setTestMessage] = useState('How much water should I drink in 42°C heat in 2nd trimester?');
  const [sendResult, setSendResult] = useState<WhatsAppSendResult | null>(null);
  const [isSending, setIsSending] = useState(false);

  const [verifyTokenInput, setVerifyTokenInput] = useState('dayli_ai_webhook_verify_token_2026');
  const [verificationResult, setVerificationResult] = useState<{ isValid: boolean; message: string; challenge?: string } | null>(null);

  const [simulatedWebhookJson, setSimulatedWebhookJson] = useState<string>(
    JSON.stringify(
      {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { display_phone_number: '15550239841', phone_number_id: 'PHONE_NUMBER_ID' },
                  contacts: [{ profile: { name: 'Ananya Sharma' }, wa_id: '919876543210' }],
                  messages: [
                    {
                      from: '919876543210',
                      id: `wamid.hb_${Date.now()}`,
                      timestamp: `${Math.floor(Date.now() / 1000)}`,
                      text: { body: 'What are the heat illness warning signs for 2nd trimester?' },
                      type: 'text',
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      },
      null,
      2
    )
  );

  const [routedOutput, setRoutedOutput] = useState<{ processed: boolean; normalized?: NormalizedWhatsAppMessage; sendResult?: WhatsAppSendResult } | null>(null);

  useEffect(() => {
    setProviderType(whatsAppMessageRouter.getProviderType());
  }, []);

  const handleProviderToggle = (type: 'mock' | 'meta') => {
    whatsAppMessageRouter.setProviderType(type);
    setProviderType(type);
  };

  const handleVerifyHandshake = () => {
    const res = webhookHandler.verifyWebhook({
      mode: 'subscribe',
      verifyToken: verifyTokenInput,
      challenge: '1158201484',
    });
    setVerificationResult(res);
  };

  const handleSendTestMessage = async () => {
    if (!testMessage.trim()) return;
    setIsSending(true);
    setSendResult(null);

    const provider = whatsAppMessageRouter.getProvider();
    const res = await provider.sendTextMessage(recipientPhone, testMessage);
    setSendResult(res);
    setIsSending(false);
  };

  const handleTestWebhookProcessing = async () => {
    try {
      const parsed = JSON.parse(simulatedWebhookJson);
      const res = await whatsAppMessageRouter.routeIncomingMessage(parsed, true);
      setRoutedOutput(res);
    } catch (e: any) {
      alert(`Invalid JSON format: ${e.message}`);
    }
  };

  return (
    <div className="p-3 space-y-4 font-sans text-xs">
      {/* Header Banner */}
      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-100 font-bold text-xs">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>Meta WhatsApp Business Cloud API Integration</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              providerType === 'meta'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
            }`}
          >
            {providerType === 'meta' ? '⚡ Meta Cloud API (Graph v19.0)' : '🤖 WhatsApp Simulator (Mock)'}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Dual-mode message provider abstraction, Webhook HMAC signature validation, normalized payloads, and idempotency protection.
        </p>
      </div>

      {/* Provider Selector & Credentials Card */}
      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-3">
        <h4 className="font-semibold text-slate-200 text-xs flex items-center space-x-1.5">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <span>Active Provider & Webhook Settings</span>
        </h4>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleProviderToggle('mock')}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              providerType === 'mock'
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 font-bold'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="font-mono text-xs flex items-center justify-between">
              <span>MESSAGE_PROVIDER=mock</span>
              {providerType === 'mock' && <Check className="w-3.5 h-3.5" />}
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5">Development Simulator (Zero credentials required)</div>
          </button>

          <button
            onClick={() => handleProviderToggle('meta')}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              providerType === 'meta'
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="font-mono text-xs flex items-center justify-between">
              <span>MESSAGE_PROVIDER=meta</span>
              {providerType === 'meta' && <Check className="w-3.5 h-3.5" />}
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5">Live Meta Business Cloud API (Graph API v19.0)</div>
          </button>
        </div>

        {/* Webhook Verification Tester */}
        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-medium flex items-center space-x-1">
              <Radio className="w-3.5 h-3.5 text-sky-400" />
              <span>Webhook Verification Handshake (GET /webhook)</span>
            </span>
            <button
              onClick={handleVerifyHandshake}
              className="px-2 py-1 bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold rounded transition-colors"
            >
              Test Verify Token
            </button>
          </div>
          <div className="flex space-x-2">
            <input
              type="text"
              value={verifyTokenInput}
              onChange={(e) => setVerifyTokenInput(e.target.value)}
              placeholder="Verify Token..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500"
            />
          </div>
          {verificationResult && (
            <div
              className={`text-[10px] font-mono p-1.5 rounded border ${
                verificationResult.isValid
                  ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400'
                  : 'bg-red-950/40 border-red-800/40 text-red-400'
              }`}
            >
              {verificationResult.message} {verificationResult.challenge && `(Challenge: ${verificationResult.challenge})`}
            </div>
          )}
        </div>
      </div>

      {/* Outbound Test Message Sender */}
      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-3">
        <h4 className="font-semibold text-slate-200 text-xs flex items-center space-x-1.5">
          <Send className="w-4 h-4 text-sky-400" />
          <span>Outbound WhatsApp Test Message Sender</span>
        </h4>

        <div className="space-y-2">
          <div className="flex space-x-2">
            <input
              type="text"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              placeholder="+919876543210"
              className="w-1/3 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
            />
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Type test message..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
            />
          </div>

          <button
            onClick={handleSendTestMessage}
            disabled={isSending}
            className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center space-x-1.5 shadow"
          >
            {isSending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Sending via {providerType.toUpperCase()}...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send Outbound WhatsApp Message ({providerType.toUpperCase()})</span>
              </>
            )}
          </button>
        </div>

        {sendResult && (
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1 font-mono text-[10px]">
            <div className="flex items-center justify-between">
              <span className={sendResult.success ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                {sendResult.success ? 'SUCCESS' : 'FAILED'} ({sendResult.provider.toUpperCase()})
              </span>
              <span className="text-slate-500">{sendResult.latencyMs}ms</span>
            </div>
            {sendResult.messageId && <div className="text-slate-300">Message ID: {sendResult.messageId}</div>}
            {sendResult.error && <div className="text-red-400">{sendResult.error}</div>}
          </div>
        )}
      </div>

      {/* Webhook JSON Simulator & Router Inspector */}
      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-slate-200 text-xs flex items-center space-x-1.5">
            <Terminal className="w-4 h-4 text-purple-400" />
            <span>Simulate Incoming Meta Webhook Event</span>
          </h4>
          <button
            onClick={handleTestWebhookProcessing}
            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold rounded transition-colors"
          >
            Process Inbound Event
          </button>
        </div>

        <textarea
          rows={6}
          value={simulatedWebhookJson}
          onChange={(e) => setSimulatedWebhookJson(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-[10px] text-slate-300 focus:outline-none focus:border-purple-500"
        />

        {routedOutput && (
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 font-mono text-[10px]">
            <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-slate-800">
              <span className="text-emerald-400 font-bold">ROUTER PIPELINE RESULT</span>
              <span>Idempotency: {routedOutput.processed ? 'PASSED' : 'IGNORED'}</span>
            </div>
            {routedOutput.normalized && (
              <div className="text-slate-300">
                User: <span className="text-sky-300">{routedOutput.normalized.user_name}</span> ({routedOutput.normalized.phone_number}) | Type: {routedOutput.normalized.type}
                <div className="text-slate-200 font-sans text-xs mt-1 bg-slate-900 p-2 rounded border border-slate-800">
                  {routedOutput.normalized.text}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
