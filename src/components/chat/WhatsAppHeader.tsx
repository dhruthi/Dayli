import React from 'react';
import { CheckCircle2, Phone, Video, MoreVertical, Sparkles } from 'lucide-react';
import { usePresentationStore } from '../../store/usePresentationStore';

interface WhatsAppHeaderProps {
  isTyping?: boolean;
  onResetChat?: () => void;
}

export const WhatsAppHeader: React.FC<WhatsAppHeaderProps> = ({ isTyping, onResetChat }) => {
  const { isPresentationMode } = usePresentationStore();

  return (
    <div className="bg-[#202c33] text-slate-100 px-3 py-2.5 flex items-center justify-between border-b border-slate-700/50 shadow-md relative z-20">
      <div className="flex items-center space-x-3">
        {/* Profile Avatar with Verified Badge */}
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-inner ring-2 ring-emerald-500/30">
            ☀️
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 bg-[#00a884] rounded-full p-0.5 ring-2 ring-[#202c33]">
            <CheckCircle2 className="w-3.5 h-3.5 text-white fill-emerald-600" />
          </div>
        </div>

        {/* Profile Title & Status */}
        <div>
          <div className="flex items-center space-x-1.5">
            <span className="font-semibold text-sm tracking-tight text-white">dayli.ai Climate Health</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30">
              OFFICIAL
            </span>
          </div>
          <div className="text-[11px] text-[#8696a0] flex items-center space-x-1">
            {isTyping ? (
              <span className="text-emerald-400 font-medium animate-pulse flex items-center space-x-1">
                <span>typing...</span>
              </span>
            ) : isPresentationMode ? (
              <span className="text-amber-400 font-medium flex items-center space-x-1">
                <Sparkles className="w-3 h-3 animate-spin" />
                <span>Auto-play active</span>
              </span>
            ) : (
              <span>Verified WhatsApp Business Account</span>
            )}
          </div>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center space-x-3 text-[#8696a0]">
        <button title="Start Video Call" className="hover:text-emerald-400 transition-colors p-1.5 rounded-full hover:bg-slate-700/40">
          <Video className="w-4 h-4" />
        </button>
        <button title="Start Audio Call" className="hover:text-emerald-400 transition-colors p-1.5 rounded-full hover:bg-slate-700/40">
          <Phone className="w-4 h-4" />
        </button>
        <button title="Options" onClick={onResetChat} className="hover:text-emerald-400 transition-colors p-1.5 rounded-full hover:bg-slate-700/40">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
