import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Send, ThermometerSun, Wind, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/site";
import { useLocale } from "@/hooks/use-locale";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
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

function heatBadgeClass(risk: HeatRisk): string {
  switch (risk) {
    case "low":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "moderate":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "high":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "very_high":
      return "bg-red-100 text-red-800 border-red-200";
    case "extreme":
      return "bg-red-200 text-red-900 border-red-300";
  }
}

function aqiBadgeClass(risk: AirRisk): string {
  switch (risk) {
    case "good":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "moderate":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "unhealthy_sensitive":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "unhealthy":
      return "bg-red-100 text-red-800 border-red-200";
    case "very_unhealthy":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "hazardous":
      return "bg-rose-200 text-rose-900 border-rose-300";
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
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sessionIdRef = useRef<string>("");

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
              "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words",
              m.role === "user"
                ? "bg-primary text-primary-foreground self-end ml-auto rounded-tr-sm"
                : "bg-muted text-foreground self-start mr-auto rounded-tl-sm",
            )}
          >
            {m.content}
          </div>
        ))}

        {streaming && (
          <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted text-foreground self-start mr-auto px-3.5 py-2 text-sm whitespace-pre-wrap break-words">
            {streamingText || (
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
          type="submit"
          size="icon"
          disabled={phase !== "ready" || streaming || !input.trim()}
          className="rounded-full h-10 w-10 shrink-0"
          aria-label={c.sendLabel}
        >
          {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </Button>
      </form>

      {/* Disclaimer */}
      <p className="px-4 py-2.5 text-[11px] leading-snug text-muted-foreground border-t border-border bg-muted/30">
        {c.disclaimer}
      </p>
    </div>
  );
}
