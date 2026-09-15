import React from 'react';
import { FlowListSection, FlowListOption } from '../../types/chatEngine';
import { X, Check } from 'lucide-react';

interface InteractiveListModalProps {
  header?: string;
  sections: FlowListSection[];
  onSelectOption: (option: FlowListOption) => void;
  onClose: () => void;
}

export const InteractiveListModal: React.FC<InteractiveListModalProps> = ({
  header = 'Select Option',
  sections,
  onSelectOption,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#202c33] rounded-t-2xl sm:rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-4 py-3 bg-[#111b21] border-b border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-slate-100">{header}</h3>
          <button onClick={onClose} className="p-1 text-[#8696a0] hover:text-white rounded-full hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body List */}
        <div className="p-3 overflow-y-auto flex-1 space-y-4">
          {sections.map((section, idx) => (
            <div key={idx} className="space-y-1.5">
              <h4 className="text-[11px] font-bold tracking-wider text-emerald-400 uppercase px-2">
                {section.title}
              </h4>
              <div className="space-y-1">
                {section.options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      onSelectOption(opt);
                      onClose();
                    }}
                    className="w-full text-left p-3 rounded-xl bg-slate-800/60 hover:bg-[#005c4b]/30 border border-slate-700/40 hover:border-emerald-500/40 transition-all group flex items-start justify-between"
                  >
                    <div>
                      <div className="font-medium text-xs text-slate-100 group-hover:text-emerald-300">
                        {opt.title}
                      </div>
                      {opt.description && (
                        <div className="text-[11px] text-[#8696a0] mt-0.5 leading-snug">
                          {opt.description}
                        </div>
                      )}
                    </div>
                    <div className="w-5 h-5 rounded-full border border-slate-600 group-hover:border-emerald-400 group-hover:bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-slate-950 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
