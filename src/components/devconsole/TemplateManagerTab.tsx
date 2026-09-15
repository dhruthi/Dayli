import React, { useState } from 'react';
import { APPROVED_TEMPLATES, ApprovedTemplate } from '../../templates/whatsappTemplates';
import { FileCode, CheckCircle2, Copy, Check } from 'lucide-react';

export const TemplateManagerTab: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<ApprovedTemplate>(APPROVED_TEMPLATES[0]);
  const [copied, setCopied] = useState(false);

  const sampleMetaPayload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: '+919876543210',
    type: 'template',
    template: {
      name: selectedTemplate.name,
      language: { code: selectedTemplate.language },
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: 'Ananya Sharma' }],
        },
      ],
    },
  };

  const jsonString = JSON.stringify(sampleMetaPayload, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-3 space-y-4 font-mono text-xs">
      {/* Template Select Grid */}
      <div className="grid grid-cols-2 gap-2">
        {APPROVED_TEMPLATES.map((tmpl) => (
          <button
            key={tmpl.name}
            onClick={() => setSelectedTemplate(tmpl)}
            className={`p-2.5 rounded-xl border text-left transition-all ${
              selectedTemplate.name === tmpl.name
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-[11px] truncate">{tmpl.name}</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            </div>
            <div className="text-[10px] text-slate-500 flex items-center space-x-2">
              <span className="px-1 py-0.2 rounded bg-slate-800 text-slate-300">{tmpl.category}</span>
              <span>{tmpl.language}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Selected Template Details Card */}
      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center space-x-2 text-slate-200 font-sans font-semibold">
            <FileCode className="w-4 h-4 text-emerald-400" />
            <span>Meta Approved Structure: {selectedTemplate.name}</span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Template Payload'}</span>
          </button>
        </div>

        {/* WhatsApp Template Bubble Preview */}
        <div className="bg-[#202c33] p-3 rounded-xl border border-slate-700/60 space-y-2 text-slate-100 font-sans">
          {selectedTemplate.headerText && (
            <div className="font-bold text-xs text-emerald-400 border-b border-slate-700/40 pb-1">
              {selectedTemplate.headerText}
            </div>
          )}
          <div className="text-xs leading-relaxed whitespace-pre-wrap">{selectedTemplate.bodyText}</div>
          {selectedTemplate.footerText && (
            <div className="text-[10px] text-[#8696a0] border-t border-slate-700/30 pt-1">
              {selectedTemplate.footerText}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {selectedTemplate.buttons.map((b, i) => (
              <span
                key={i}
                className="px-2.5 py-1 bg-slate-800 text-emerald-400 text-xs font-semibold rounded border border-slate-700"
              >
                {b.text}
              </span>
            ))}
          </div>
        </div>

        {/* Payload JSON */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-emerald-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
          <pre>{jsonString}</pre>
        </div>
      </div>
    </div>
  );
};
