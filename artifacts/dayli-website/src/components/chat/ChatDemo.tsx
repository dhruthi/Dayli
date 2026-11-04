import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapPin,
  Send,
  ThermometerSun,
  Wind,
  Loader2,
  AlertTriangle,
  Mic,
  Square,
  Trash2,
  Volume2,
  Sparkles,
  Languages,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/site";
import { useLocale } from "@/hooks/use-locale";
import { VoiceAudioPlayer } from "./VoiceAudioPlayer";

interface MarkdownLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href?: string;
}

const markdownComponents = {
  a: ({ href, children, ...rest }: MarkdownLinkProps) => (
    <a
      {...rest}
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="underline underline-offset-2 hover:opacity-80"
    >
      {children}
    </a>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc pl-5 mb-2 last:mb-0 space-y-1">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal pl-5 mb-2 last:mb-0 space-y-1">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="px-1 py-0.5 rounded bg-black/10 text-[0.85em] font-mono">{children}</code>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <p className="font-semibold text-base mb-1.5">{children}</p>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <p className="font-semibold mb-1.5">{children}</p>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <p className="font-semibold mb-1.5">{children}</p>
  ),
  hr: () => <hr className="my-2 border-border/60" />,
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-2 border-current/30 pl-3 italic opacity-90 mb-2">
      {children}
    </blockquote>
  ),
};

function AssistantMarkdown({ text }: { text: string }) {
  return (
    <div className="text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
        skipHtml
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  isVoice?: boolean;
  audioUrl?: string;
  originalTranscript?: string;
  englishTranscript?: string;
  detectedLanguage?: string;
  languageName?: string;
  ttsLoading?: boolean;
}

type HeatRisk = "low" | "moderate" | "high" | "very_high" | "extreme";
type AirRisk =
  | "good"
  | "moderate"
  | "unhealthy_sensitive"
  | "unhealthy"
  | "very_unhealthy"
  | "hazardous";

interface ConditionsSnapshot {
  lat: number;
  lon: number;
  city: string | null;
  region: string | null;
  country: string | null;
  tempC: number | null;
  feelsLikeC: number | null;
  humidity: number | null;
  windKph: number | null;
  uvIndex: number | null;
  aqiUs: number | null;
  pm25: number | null;
  summary: string;
  heatRisk: HeatRisk;
  airRisk: AirRisk;
  source: "client-geolocation" | "ip-fallback";
  observedAt: string;
}

interface GeoFix {
  source: "client-geolocation" | "ip-fallback";
  lat: number;
  lon: number;
  city?: string;
  region?: string;
  country?: string;
}

const SESSION_KEY = "dayli_chat_session_id";

function makeSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 32);
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getSessionId(): string {
  if (typeof window === "undefined") return makeSessionId();
  let id = window.sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = makeSessionId();
    window.sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/* Risk badges now read from the dayli brand palette instead of generic
   Tailwind colors, so a future palette change in `index.css` cascades
   here too. The semantic ramp is:
     safe          → primary teal (trust)
     watch         → sun (daylight yellow)
     elevated      → marigold (vivid morning)
     dangerous     → coral / heat (sunset orange-red)
     extreme       → destructive (deep red)
*/
function heatBadgeClass(risk: HeatRisk): string {
  switch (risk) {
    case "low":
      return "bg-primary/10 text-primary border-primary/20";
    case "moderate":
      return "bg-sun/15 text-sun-ink border-sun/30";
    case "high":
      return "bg-marigold/20 text-marigold-ink border-marigold/40";
    case "very_high":
      return "bg-heat/15 text-heat-ink border-heat/35";
    case "extreme":
      return "bg-destructive/15 text-destructive border-destructive/30";
  }
}

function aqiBadgeClass(risk: AirRisk): string {
  switch (risk) {
    case "good":
      return "bg-primary/10 text-primary border-primary/20";
    case "moderate":
      return "bg-sun/15 text-sun-ink border-sun/30";
    case "unhealthy_sensitive":
      return "bg-marigold/20 text-marigold-ink border-marigold/40";
    case "unhealthy":
      return "bg-heat/15 text-heat-ink border-heat/35";
    case "very_unhealthy":
      return "bg-coral/20 text-coral-ink border-coral/40";
    case "hazardous":
      return "bg-destructive/15 text-destructive border-destructive/35";
  }
}

const HARDCODED_FALLBACK: GeoFix = {
  source: "ip-fallback",
  lat: 17.385,
  lon: 78.4867,
  city: "Hyderabad",
  country: "India",
};

async function ipFallback(): Promise<GeoFix> {
  try {
    const res = await fetch(apiUrl("/geo"), { method: "GET" });
    if (!res.ok) throw new Error("geo lookup failed");
    const body = (await res.json()) as {
      lat: number;
      lon: number;
      city?: string;
      region?: string;
      country?: string;
    };
    return {
      source: "ip-fallback",
      lat: body.lat,
      lon: body.lon,
      city: body.city,
      region: body.region,
      country: body.country,
    };
  } catch {
    return HARDCODED_FALLBACK;
  }
}

async function getGeoFix(): Promise<GeoFix> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return ipFallback();
  }

  return new Promise<GeoFix>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        void ipFallback().then(resolve);
      }
    }, 6000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({
          source: "client-geolocation",
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
      },
      () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        void ipFallback().then(resolve);
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 5 * 60 * 1000 },
    );
  });
}

async function fetchConditionsSnapshot(fix: GeoFix): Promise<ConditionsSnapshot> {
  const params = new URLSearchParams({
    lat: fix.lat.toFixed(4),
    lon: fix.lon.toFixed(4),
    source: fix.source,
  });
  if (fix.city) params.set("city", fix.city);
  if (fix.region) params.set("region", fix.region);
  if (fix.country) params.set("country", fix.country);
  const res = await fetch(apiUrl(`/conditions?${params.toString()}`));
  if (!res.ok) throw new Error("conditions lookup failed");
  return (await res.json()) as ConditionsSnapshot;
}

export function ChatDemo() {
  const { locale, t } = useLocale();
  const c = t.home.chatDemo;

  const [phase, setPhase] = useState<"intro" | "loading_location" | "ready" | "error">("intro");
  const [conditions, setConditions] = useState<ConditionsSnapshot | null>(null);
  const [geoFix, setGeoFix] = useState<GeoFix | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>("");
  const [streaming, setStreaming] = useState<boolean>(false);
  const [streamingText, setStreamingText] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [liveTranscript, setLiveTranscript] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sessionIdRef = useRef<string>("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<any>(null);
  const recordingTimerRef = useRef<any>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);

  if (sessionIdRef.current === "") {
    sessionIdRef.current = getSessionId();
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText, conditions, phase]);

  const startDemo = async (): Promise<void> => {
    setPhase("loading_location");
    setErrorMsg("");
    try {
      const fix = await getGeoFix();
      setGeoFix(fix);
      const snapshot = await fetchConditionsSnapshot(fix);
      setConditions(snapshot);
      setPhase("ready");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  };

  const send = async (text: string): Promise<void> => {
    if (!text.trim() || streaming || !conditions || !geoFix) return;
    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setStreaming(true);
    setStreamingText("");

    try {
      const res = await fetch(apiUrl("/chat"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          locale,
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          location: {
            lat: geoFix.lat,
            lon: geoFix.lon,
            city: conditions.city ?? geoFix.city ?? null,
            country: conditions.country ?? geoFix.country ?? null,
          },
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Chat failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";

      const flush = (): boolean => {
        let idx = buffer.indexOf("\n\n");
        let stop = false;
        while (idx !== -1) {
          const rawEvent = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const lines = rawEvent.split("\n");
          let dataStr = "";
          for (const line of lines) {
            if (line.startsWith("data:")) dataStr += line.slice(5).trim();
          }
          if (dataStr) {
            try {
              const data = JSON.parse(dataStr) as {
                content?: string;
                done?: boolean;
                error?: string;
                message?: string;
              };
              if (typeof data.content === "string" && data.content.length > 0) {
                assistantText += data.content;
                setStreamingText(assistantText);
              }
              if (data.error) {
                throw new Error(data.message ?? data.error);
              }
              if (data.done) {
                stop = true;
              }
            } catch (e) {
              if (e instanceof Error && e.message !== "Unexpected end of JSON input") {
                throw e;
              }
            }
          }
          idx = buffer.indexOf("\n\n");
        }
        return stop;
      };

      while (true) {
        const { value, done } = await reader.read();
        if (value) buffer += decoder.decode(value, { stream: true });
        const stop = flush();
        if (done || stop) break;
      }
      buffer += decoder.decode();
      flush();

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: assistantText || c.errorBody },
      ]);
      setStreamingText("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `${c.errorBody} (${msg})` },
      ]);
      setStreamingText("");
    } finally {
      setStreaming(false);
    }
  };

  const startRecording = async () => {
    if (streaming || isRecording || phase !== "ready") return;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert("Audio recording is not supported in this browser.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      activeStreamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "audio/wav";

      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];

      mr.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mr.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      setLiveTranscript("");

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      // Web Speech API for live transcription preview in user's language
      const SpeechRec = (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;
      if (SpeechRec) {
        try {
          const rec = new SpeechRec();
          rec.continuous = true;
          rec.interimResults = true;
          const langMap: Record<string, string> = {
            te: "te-IN",
            hi: "hi-IN",
            ar: "ar-SA",
            en: "en-IN",
          };
          rec.lang = langMap[locale] || "en-US";
          rec.onresult = (ev: any) => {
            let interim = "";
            for (let i = ev.resultIndex; i < ev.results.length; ++i) {
              interim += ev.results[i][0].transcript;
            }
            if (interim) setLiveTranscript(interim);
          };
          rec.onerror = () => {};
          rec.start();
          speechRecognitionRef.current = rec;
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error("Microphone error:", err);
      alert("Microphone permission denied or device not found.");
    }
  };

  const stopRecording = (cancelled = false) => {
    if (!isRecording) return;
    setIsRecording(false);
    clearInterval(recordingTimerRef.current);

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }

    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      mr.onstop = () => {
        if (!cancelled && audioChunksRef.current.length > 0) {
          const mime = mr.mimeType || "audio/webm";
          const blob = new Blob(audioChunksRef.current, { type: mime });
          void sendVoice(blob, liveTranscript);
        }
        if (activeStreamRef.current) {
          activeStreamRef.current.getTracks().forEach((track) => track.stop());
          activeStreamRef.current = null;
        }
        audioChunksRef.current = [];
      };
      mr.stop();
    } else if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
    }
  };

  const sendVoice = async (audioBlob: Blob, transcript: string) => {
    if (!conditions || !geoFix) return;

    const audioUrl = URL.createObjectURL(audioBlob);
    const tempUserMsg: ChatMessage = {
      role: "user",
      content: transcript || "🎙️ Voice message sent",
      isVoice: true,
      audioUrl,
      originalTranscript: transcript,
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setStreaming(true);
    setStreamingText("🎙️ Processing voice note: recognizing language and translating to English for Copilot...");

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(audioBlob);
      const audioBase64 = await base64Promise;

      const res = await fetch(apiUrl("/chat/voice"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64,
          mimeType: audioBlob.type,
          clientTranscript: transcript,
          locale,
          location: {
            lat: geoFix.lat,
            lon: geoFix.lon,
            city: conditions.city ?? geoFix.city ?? null,
            country: conditions.country ?? geoFix.country ?? null,
          },
          sessionId: sessionIdRef.current,
        }),
      });

      if (!res.ok) {
        throw new Error(`Voice processing error (${res.status})`);
      }

      const data = await res.json();

      setMessages((prev) => {
        const copy = [...prev];
        const lastUserIdx = copy.findLastIndex((m) => m.role === "user");
        if (lastUserIdx !== -1) {
          copy[lastUserIdx] = {
            ...copy[lastUserIdx],
            content: data.originalTranscript || copy[lastUserIdx].content,
            originalTranscript: data.originalTranscript,
            englishTranscript: data.englishTranscript,
            detectedLanguage: data.detectedLanguage,
            languageName: data.languageName,
          };
        }
        return [
          ...copy,
          {
            role: "assistant",
            content: data.replyText,
            isVoice: Boolean(data.audioBase64),
            audioUrl: data.audioBase64 || undefined,
            detectedLanguage: data.detectedLanguage,
            languageName: data.languageName,
          },
        ];
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `${c.errorBody} (${msg})`,
        },
      ]);
    } finally {
      setStreaming(false);
      setStreamingText("");
    }
  };

  const playTtsForMessage = async (idx: number, text: string) => {
    try {
      setMessages((prev) => {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ttsLoading: true };
        return copy;
      });

      const res = await fetch(apiUrl("/voice/tts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, locale }),
      });

      if (!res.ok) throw new Error("TTS failed");
      const data = await res.json();

      setMessages((prev) => {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          isVoice: true,
          audioUrl: data.audioBase64,
          ttsLoading: false,
        };
        return copy;
      });
    } catch (err) {
      console.warn("TTS fetch error:", err);
      setMessages((prev) => {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ttsLoading: false };
        return copy;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    void send(input);
  };

  const examples = useMemo(() => c.examplePrompts, [c.examplePrompts]);

  const locationLabel = useMemo(() => {
    if (!conditions) return "";
    const parts = [conditions.city, conditions.region, conditions.country].filter(Boolean);
    return parts.length ? parts.join(", ") : c.locationUnknown;
  }, [conditions, c.locationUnknown]);

  return (
    <div className="w-full bg-card rounded-2xl border border-border shadow-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-primary text-primary-foreground flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold shrink-0">
          d
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold leading-tight">{c.title}</div>
          <div className="text-xs opacity-90 truncate">{c.subtitle}</div>
        </div>
      </div>

      {/* Conditions strip */}
      {conditions && (
        <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
          <span className="inline-flex items-center gap-1.5 text-foreground/80">
            <MapPin size={12} className="text-primary" />
            <span className="truncate max-w-[180px]">{locationLabel}</span>
            <span className="text-muted-foreground">
              · {conditions.source === "client-geolocation" ? c.sourceGps : c.sourceIp}
            </span>
          </span>
          {conditions.tempC != null && (
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-medium",
                heatBadgeClass(conditions.heatRisk),
              )}
            >
              <ThermometerSun size={12} />
              {Math.round(conditions.tempC)}°C · {c.heatRiskLabels[conditions.heatRisk]}
            </span>
          )}
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-medium",
              aqiBadgeClass(conditions.airRisk),
            )}
          >
            <Wind size={12} />
            {c.aqiLabels[conditions.airRisk]}
            {conditions.aqiUs != null ? ` · AQI ${conditions.aqiUs}` : ""}
          </span>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-[320px] max-h-[420px] overflow-y-auto bg-background p-4 flex flex-col gap-3"
      >
        {phase === "intro" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <MapPin size={22} />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">{c.introHeading}</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">{c.introBody}</p>
            </div>
            <Button onClick={() => void startDemo()} className="rounded-full">
              {c.startButton}
            </Button>
          </div>
        )}

        {phase === "loading_location" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-6 text-muted-foreground">
            <Loader2 size={22} className="animate-spin text-primary" />
            <p className="text-sm">{c.loading}</p>
          </div>
        )}

        {phase === "error" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-6">
            <AlertTriangle size={22} className="text-destructive" />
            <p className="text-sm text-foreground/80 max-w-sm">{c.errorBody}</p>
            <p className="text-xs text-muted-foreground">{errorMsg}</p>
            <Button variant="outline" size="sm" onClick={() => void startDemo()} className="rounded-full">
              {c.retry}
            </Button>
          </div>
        )}

        {phase === "ready" && messages.length === 0 && !streaming && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{c.examplesLabel}</p>
            <div className="flex flex-col gap-2">
              {examples.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => void send(ex)}
                  className="text-left text-sm px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] rounded-2xl px-3.5 py-2 break-words",
              m.role === "user"
                ? "bg-primary text-primary-foreground self-end ml-auto rounded-tr-sm text-sm"
                : "bg-muted text-foreground self-start mr-auto rounded-tl-sm",
            )}
          >
            {m.role === "user" ? (
              <div className="space-y-1.5">
                {m.isVoice && m.audioUrl && (
                  <VoiceAudioPlayer
                    audioUrl={m.audioUrl}
                    isUser={true}
                    languageName={m.languageName}
                    englishTranscript={m.englishTranscript}
                  />
                )}
                <div className="text-sm whitespace-pre-wrap">{m.content}</div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {m.isVoice && m.audioUrl && (
                  <VoiceAudioPlayer
                    audioUrl={m.audioUrl}
                    isUser={false}
                    autoPlay={true}
                    languageName={m.languageName}
                  />
                )}
                <AssistantMarkdown text={m.content} />
                {!m.audioUrl && (
                  <div className="pt-1 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void playTtsForMessage(i, m.content)}
                      disabled={m.ttsLoading}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline transition-opacity disabled:opacity-50"
                    >
                      {m.ttsLoading ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Volume2 size={12} />
                      )}
                      <span>{m.ttsLoading ? "Generating voice..." : "Listen to voiceover"}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {streaming && (
          <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted text-foreground self-start mr-auto px-3.5 py-2 break-words">
            {streamingText ? (
              <AssistantMarkdown text={streamingText} />
            ) : (
              <span className="inline-flex gap-1 items-center text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
                  style={{ animationDelay: "120ms" }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
                  style={{ animationDelay: "240ms" }}
                />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-border bg-card p-3 flex items-center gap-2"
        aria-label={c.formLabel}
      >
        {isRecording ? (
          <div className="flex-1 flex items-center justify-between px-3 h-10 rounded-full bg-destructive/10 border border-destructive/30 animate-pulse text-sm">
            <div className="flex items-center gap-2 text-destructive font-medium min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-ping shrink-0" />
              <span className="shrink-0 text-xs">
                Recording {Math.floor(recordingSeconds / 60)}:
                {recordingSeconds % 60 < 10 ? "0" : ""}
                {recordingSeconds % 60}
              </span>
              {liveTranscript && (
                <span className="text-xs text-muted-foreground truncate max-w-[200px] italic">
                  &quot;{liveTranscript}&quot;
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => stopRecording(true)}
                className="h-8 w-8 text-destructive hover:bg-destructive/20 rounded-full"
                title="Cancel voice note"
              >
                <Trash2 size={15} />
              </Button>
              <Button
                type="button"
                size="icon"
                onClick={() => stopRecording(false)}
                className="h-8 w-8 bg-destructive hover:bg-destructive/90 text-white rounded-full shadow-sm"
                title="Send voice note"
              >
                <Send size={13} />
              </Button>
            </div>
          </div>
        ) : (
          <>
            <label htmlFor="chat-demo-input" className="sr-only">
              {c.inputPlaceholder}
            </label>
            <input
              id="chat-demo-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={phase === "ready" ? c.inputPlaceholder : c.inputDisabledPlaceholder}
              disabled={phase !== "ready" || streaming}
              maxLength={4000}
              aria-label={c.inputPlaceholder}
              className="flex-1 h-10 px-3 rounded-full border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => void startRecording()}
              disabled={phase !== "ready" || streaming}
              className="rounded-full h-10 w-10 shrink-0 text-primary hover:text-primary hover:bg-primary/10 border-primary/30"
              title="Record voice note"
              aria-label="Record voice note"
            >
              <Mic size={18} />
            </Button>
            <Button
              type="submit"
              size="icon"
              disabled={phase !== "ready" || streaming || !input.trim()}
              className="rounded-full h-10 w-10 shrink-0"
              aria-label={c.sendLabel}
            >
              {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </Button>
          </>
        )}
      </form>

      {/* Disclaimer */}
      <p className="px-4 py-2.5 text-[11px] leading-snug text-muted-foreground border-t border-border bg-muted/30">
        {c.disclaimer}
      </p>
    </div>
  );
}
