import React, { useState } from 'react';
import { Send, Paperclip, Mic, Smile } from 'lucide-react';

interface WhatsAppFooterProps {
  onSendMessage: (text: string) => void;
  disabled?: boolean;
}

export const WhatsAppFooter: React.FC<WhatsAppFooterProps> = ({ onSendMessage, disabled }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSendMessage(input.trim());
    setInput('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#202c33] p-2.5 flex items-center space-x-2 border-t border-slate-700/50 relative z-20"
    >
      <button
        type="button"
        title="Emoji"
        className="text-[#8696a0] hover:text-emerald-400 p-1.5 rounded-full hover:bg-slate-700/40 transition-colors"
      >
        <Smile className="w-5 h-5" />
      </button>

      <button
        type="button"
        title="Attach Media"
        className="text-[#8696a0] hover:text-emerald-400 p-1.5 rounded-full hover:bg-slate-700/40 transition-colors"
      >
        <Paperclip className="w-5 h-5" />
      </button>

      <div className="flex-1 bg-[#2a3942] rounded-lg px-3 py-1.5 flex items-center border border-slate-700/60 focus-within:border-emerald-500/60 transition-colors">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={disabled}
          className="w-full bg-transparent text-slate-100 text-xs sm:text-sm focus:outline-none placeholder-[#8696a0]"
        />
      </div>

      {input.trim() ? (
        <button
          type="submit"
          disabled={disabled}
          className="w-9 h-9 rounded-full bg-[#00a884] hover:bg-[#029071] transition-colors flex items-center justify-center text-slate-950 font-bold shadow"
        >
          <Send className="w-4 h-4 ml-0.5" />
        </button>
      ) : (
        <button
          type="button"
          title="Voice Note"
          className="w-9 h-9 rounded-full bg-slate-700 hover:bg-emerald-600 transition-colors flex items-center justify-center text-slate-200 shadow"
        >
          <Mic className="w-4 h-4" />
        </button>
      )}
    </form>
  );
};
