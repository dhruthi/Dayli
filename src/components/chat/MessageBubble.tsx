import React, { useState } from 'react';
import { ChatMessage, FlowButton, FlowListSection, FlowCarouselCard } from '../../types/chatEngine';
import { Check, CheckCheck, FileText, Download, ListFilter, ExternalLink } from 'lucide-react';
import { AudioNoteBubble } from './AudioNoteBubble';
import { CarouselView } from './CarouselView';
import { LocationCard } from './LocationCard';
import { InteractiveForm } from './InteractiveForm';

interface MessageBubbleProps {
  message: ChatMessage;
  onButtonClick?: (buttonId: string, title: string) => void;
  onListSelect?: (optionId: string, title: string) => void;
  onSendLocation?: () => void;
  onFormSubmit?: (formData: Record<string, any>) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onButtonClick,
  onListSelect,
  onSendLocation,
  onFormSubmit,
}) => {
  const isUser = message.sender === 'user';

  // Format WhatsApp markdown (*bold*, _italics_)
  const renderFormattedText = (text: string) => {
    if (!text) return null;
    const parts = text.split('\n');
    return parts.map((line, idx) => {
      // Bold replace
      let formattedLine = line.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
      // Code replace
      formattedLine = formattedLine.replace(/`(.*?)`/g, '<code class="bg-slate-800 text-amber-300 px-1 py-0.5 rounded font-mono text-[10px]">$1</code>');
      return (
        <React.Fragment key={idx}>
          <span dangerouslySetInnerHTML={{ __html: formattedLine }} />
          {idx < parts.length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  return (
    <div className={`flex flex-col mb-3 ${isUser ? 'items-end' : 'items-start'} max-w-full px-2`}>
      {/* Bubble Container */}
      <div
        className={`relative rounded-2xl p-3 shadow-md max-w-[85%] sm:max-w-[80%] border transition-all ${
          isUser
            ? 'bg-[#005c4b] text-slate-100 rounded-tr-none border-emerald-600/30'
            : 'bg-[#202c33] text-slate-100 rounded-tl-none border-slate-700/60'
        }`}
      >
        {/* Header Text or Media */}
        {message.header && (
          <div className="font-bold text-xs mb-1.5 text-emerald-400 border-b border-slate-700/50 pb-1 flex items-center justify-between">
            <span>{message.header}</span>
          </div>
        )}

        {/* Media Rendering */}
        {message.mediaType === 'image' && message.mediaUrl && (
          <div className="rounded-lg overflow-hidden mb-2 border border-slate-700/50">
            <img src={message.mediaUrl} alt="Media" className="w-full h-44 object-cover" />
          </div>
        )}

        {message.mediaType === 'document' && (
          <div className="bg-slate-800/80 p-2.5 rounded-lg mb-2 flex items-center justify-between border border-slate-700/60">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <FileText className="w-6 h-6 text-red-400 flex-shrink-0" />
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-200 truncate">{message.fileName || 'Document.pdf'}</p>
                <p className="text-[10px] text-[#8696a0]">PDF Document • 1.2 MB</p>
              </div>
            </div>
            <a
              href={message.mediaUrl || '#'}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-full text-slate-200"
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
        )}

        {message.mediaType === 'audio' && (
          <AudioNoteBubble
            mediaUrl={message.mediaUrl}
            durationSeconds={message.durationSeconds}
            fileName={message.fileName}
            timestamp={message.timestamp}
          />
        )}

        {/* Message Content */}
        {message.content && (
          <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
            {renderFormattedText(message.content)}
          </div>
        )}

        {/* Location Card */}
        {message.type === 'location' && (
          <div className="mt-1.5">
            <LocationCard
              latitude={message.location?.latitude}
              longitude={message.location?.longitude}
              name={message.location?.name}
              address={message.location?.address}
              onSendLocation={onSendLocation}
              isInteractive={!isUser && !!onSendLocation}
            />
          </div>
        )}

        {/* Carousels */}
        {message.carouselCards && message.carouselCards.length > 0 && (
          <CarouselView
            cards={message.carouselCards}
            onSelectCardButton={(card) => onButtonClick?.(card.id, card.buttonText)}
          />
        )}

        {/* Form Fields */}
        {message.formFields && message.formFields.length > 0 && onFormSubmit && (
          <div className="mt-2">
            <InteractiveForm header={message.header} fields={message.formFields} onSubmit={onFormSubmit} />
          </div>
        )}

        {/* Footer Text */}
        {message.footer && (
          <div className="text-[10px] text-[#8696a0] mt-1.5 pt-1 border-t border-slate-700/40">
            {message.footer}
          </div>
        )}

        {/* Timestamp & Status Ticks */}
        <div className="flex items-center justify-end space-x-1 mt-1 text-[10px] text-[#8696a0]">
          <span>{message.timestamp}</span>
          {isUser && (
            <span>
              {message.status === 'read' ? (
                <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              ) : message.status === 'delivered' ? (
                <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <Check className="w-3.5 h-3.5 text-slate-400" />
              )}
            </span>
          )}
        </div>
      </div>

      {/* Reply Action Buttons below bubble */}
      {!isUser && message.buttons && message.buttons.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5 max-w-[85%] sm:max-w-[80%]">
          {message.buttons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => onButtonClick?.(btn.id, btn.title)}
              className="py-1.5 px-3 bg-[#202c33] hover:bg-[#00a884] hover:text-slate-950 text-emerald-400 font-semibold text-xs rounded-lg border border-slate-700 hover:border-emerald-500 transition-all flex items-center space-x-1 shadow-sm active:scale-95"
            >
              <span>{btn.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* Interactive Options List Rendered Directly Under the Chat Bubble */}
      {!isUser && message.listSections && message.listSections.length > 0 && (
        <div className="mt-2 w-full max-w-[85%] sm:max-w-[80%] bg-[#202c33] rounded-2xl p-3 border border-slate-700/80 shadow-md space-y-3">
          {message.listSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1.5">
              <div className="text-[11px] font-bold tracking-wider text-emerald-400 uppercase px-1 flex items-center space-x-1">
                <ListFilter className="w-3.5 h-3.5" />
                <span>{section.title}</span>
              </div>
              <div className="space-y-1.5">
                {section.options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => onListSelect?.(opt.id, opt.title)}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-800/80 hover:bg-[#005c4b] hover:text-slate-100 border border-slate-700/60 hover:border-emerald-400 transition-all group flex items-start justify-between active:scale-[0.99]"
                  >
                    <div>
                      <div className="font-semibold text-xs text-slate-100 group-hover:text-emerald-300">
                        {opt.title}
                      </div>
                      {opt.description && (
                        <div className="text-[11px] text-[#8696a0] group-hover:text-emerald-100/80 mt-0.5 leading-snug">
                          {opt.description}
                        </div>
                      )}
                    </div>
                    <div className="w-5 h-5 rounded-full border border-slate-600 group-hover:border-emerald-300 group-hover:bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-slate-950 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
