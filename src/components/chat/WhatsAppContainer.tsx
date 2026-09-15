import React, { useEffect, useRef, useCallback } from 'react';
import { useChatStore } from '../../store/useChatStore';
import { WhatsAppHeader } from './WhatsAppHeader';
import { MessageBubble } from './MessageBubble';
import { WhatsAppFooter } from './WhatsAppFooter';

/**
 * Request browser geolocation. Returns coords or null (permission denied / unavailable).
 * Times out after 8 seconds to avoid blocking the user.
 */
function requestBrowserLocation(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null), // denied or error → proceed without location
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 } // cache for 5 min
    );
  });
}

export const WhatsAppContainer: React.FC = () => {
  const { sessionState, isTyping, sendUserResponse, restartWorkflow } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const messages = sessionState?.messages || [];

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isTyping]);

  /**
   * When user sends a text message, request their location first so the AI
   * can provide weather-aware, location-specific medical advice.
   */
  const handleSendMessage = useCallback(
    async (text: string) => {
      // Request browser location (triggers permission prompt on first use)
      const coords = await requestBrowserLocation();

      sendUserResponse({
        type: 'text_message',
        text,
        location: coords
          ? { latitude: coords.latitude, longitude: coords.longitude, name: 'User GPS Location' }
          : undefined,
      });
    },
    [sendUserResponse]
  );

  return (
    <div className="flex flex-col h-full w-full bg-[#0b141a] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
      {/* WhatsApp Header */}
      <WhatsAppHeader isTyping={isTyping} onResetChat={restartWorkflow} />

      {/* WhatsApp Chat Body Wallpaper Area */}
      <div className="flex-1 overflow-y-auto p-3 wa-wallpaper-pattern space-y-2 relative">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-[#8696a0]">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-2xl mb-3">
              ☀️
            </div>
            <p className="text-xs max-w-xs leading-relaxed">
              End-to-end encrypted simulation powered by dayli.ai Chat Engine.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onButtonClick={(buttonId, title) =>
                sendUserResponse({
                  type: 'button_click',
                  buttonId,
                  buttonTitle: title,
                })
              }
              onListSelect={(optionId, title) =>
                sendUserResponse({
                  type: 'list_select',
                  optionId,
                  buttonTitle: title,
                })
              }
              onSendLocation={async () => {
                const coords = await requestBrowserLocation();
                sendUserResponse({
                  type: 'send_location',
                  location: coords
                    ? { latitude: coords.latitude, longitude: coords.longitude, name: 'User GPS Location' }
                    : { latitude: 28.6139, longitude: 77.209, name: 'New Delhi Central GPS' },
                });
              }}
              onFormSubmit={(formData) =>
                sendUserResponse({
                  type: 'submit_form',
                  formData,
                })
              }
            />
          ))
        )}

        {/* Typing indicator bubble */}
        {isTyping && (
          <div className="flex items-center space-x-2 bg-[#202c33] text-slate-300 px-3 py-2 rounded-2xl rounded-tl-none w-20 shadow-sm border border-slate-700/50">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar Footer */}
      <WhatsAppFooter onSendMessage={handleSendMessage} disabled={isTyping} />
    </div>
  );
};
