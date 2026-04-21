import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Message {
  text: string;
  sender: "dayli" | "user";
  options?: string[];
  delay?: number;
}

interface WhatsAppChatPreviewProps {
  messages: Message[];
  className?: string;
  animate?: boolean;
}

export function WhatsAppChatPreview({ messages, className, animate = true }: WhatsAppChatPreviewProps) {
  const [visibleMessages, setVisibleMessages] = useState<number>(animate ? 0 : messages.length);
  const [isTyping, setIsTyping] = useState(animate);

  useEffect(() => {
    if (!animate) return;

    let currentMsg = 0;
    const timeouts: NodeJS.Timeout[] = [];

    const showNextMessage = () => {
      if (currentMsg >= messages.length) {
        setIsTyping(false);
        return;
      }

      const msg = messages[currentMsg];
      
      if (msg.sender === "dayli") {
        setIsTyping(true);
      } else {
        setIsTyping(false);
      }

      const delay = msg.delay || (msg.sender === "dayli" ? 1500 : 800);
      
      const t = setTimeout(() => {
        setVisibleMessages(currentMsg + 1);
        currentMsg++;
        showNextMessage();
      }, delay);
      
      timeouts.push(t);
    };

    // Initial delay before starting
    const t0 = setTimeout(showNextMessage, 500);
    timeouts.push(t0);

    return () => timeouts.forEach(clearTimeout);
  }, [messages, animate]);

  return (
    <div className={cn("w-full max-w-sm mx-auto bg-[#efeae2] rounded-3xl overflow-hidden shadow-2xl border-4 border-white relative flex flex-col", className)}>
      {/* WhatsApp Header */}
      <div className="bg-[#008069] text-white px-4 py-3 flex items-center gap-3 relative z-10">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg overflow-hidden shrink-0">
          <div className="w-full h-full bg-primary flex items-center justify-center text-white">d</div>
        </div>
        <div>
          <div className="font-semibold leading-tight">dayli copilot</div>
          <div className="text-xs text-white/80">Active now</div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 min-h-[300px] relative z-10 bg-[#efeae2]" style={{ backgroundImage: "radial-gradient(#d1cbbd 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
        {messages.slice(0, visibleMessages).map((msg, i) => (
          <div 
            key={i} 
            className={cn(
              "max-w-[85%] rounded-2xl p-3 text-sm shadow-sm animate-in slide-in-from-bottom-2 fade-in duration-300",
              msg.sender === "user" 
                ? "bg-[#d9fdd3] text-[#111b21] self-end rounded-tr-sm" 
                : "bg-white text-[#111b21] self-start rounded-tl-sm"
            )}
          >
            {msg.text}
            
            {msg.options && (
              <div className="mt-3 flex flex-col gap-2">
                {msg.options.map((opt, j) => (
                  <div key={j} className="text-center py-2 bg-[#f0f2f5] text-[#008069] font-medium rounded-lg cursor-default border border-[#e9edef]">
                    {opt}
                  </div>
                ))}
              </div>
            )}
            
            <div className="text-[10px] text-black/40 text-right mt-1.5 flex justify-end items-center gap-1">
              9:41 AM
              {msg.sender === "user" && (
                <svg viewBox="0 0 16 15" width="16" height="15" className="fill-[#53bdeb]"><path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"></path></svg>
              )}
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="bg-white max-w-[85%] self-start rounded-2xl rounded-tl-sm p-3 shadow-sm flex items-center gap-1 h-[42px] animate-in fade-in duration-200">
            <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-[#f0f2f5] p-3 flex items-center gap-2 relative z-10">
        <div className="flex-1 bg-white rounded-full h-10 px-4 flex items-center text-sm text-gray-400 border border-transparent">
          Message
        </div>
        <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center shrink-0 shadow-sm text-white">
          <svg viewBox="0 0 24 24" width="20" height="20" className="fill-current transform translate-x-0.5"><path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"></path></svg>
        </div>
      </div>
    </div>
  );
}
