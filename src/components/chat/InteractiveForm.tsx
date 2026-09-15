import React, { useState } from 'react';
import { FlowFormField } from '../../types/chatEngine';
import { ClipboardList, CheckSquare, Square } from 'lucide-react';

interface InteractiveFormProps {
  header?: string;
  fields: FlowFormField[];
  onSubmit: (formData: Record<string, any>) => void;
}

export const InteractiveForm: React.FC<InteractiveFormProps> = ({ header, fields, onSubmit }) => {
  const [formData, setFormData] = useState<Record<string, any>>({});

  const toggleCheckbox = (fieldId: string) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: !prev[fieldId],
    }));
  };

  const handleRadioChange = (fieldId: string, val: string) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: val,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#202c33] rounded-xl p-3 border border-slate-700/70 shadow-md max-w-full space-y-3">
      {header && (
        <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 pb-1 border-b border-slate-700">
          <ClipboardList className="w-4 h-4" />
          <span>{header}</span>
        </div>
      )}

      <div className="space-y-2.5">
        {fields.map((field) => (
          <div key={field.id} className="space-y-1">
            <label className="text-xs text-slate-200 font-medium block">{field.label}</label>

            {field.type === 'checkbox' && (
              <div
                onClick={() => toggleCheckbox(field.id)}
                className="flex items-center space-x-2 p-2 rounded bg-slate-800/80 hover:bg-slate-800 cursor-pointer border border-slate-700/50 transition-colors"
              >
                {formData[field.id] ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />
                )}
                <span className="text-xs text-slate-300">Report symptom if present</span>
              </div>
            )}

            {field.type === 'radio' && field.options && (
              <div className="grid grid-cols-2 gap-1.5">
                {field.options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleRadioChange(field.id, opt)}
                    className={`py-1.5 px-2 text-xs rounded border text-left transition-all ${
                      formData[field.id] === opt
                        ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 font-semibold'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="submit"
        className="w-full py-2 bg-[#00a884] hover:bg-[#029071] text-slate-950 font-bold text-xs rounded-lg transition-colors shadow"
      >
        Submit Assessment
      </button>
    </form>
  );
};
