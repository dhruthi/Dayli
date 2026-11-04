import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, Sparkles, Languages } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceAudioPlayerProps {
  audioUrl: string;
  autoPlay?: boolean;
  label?: string;
  isUser?: boolean;
  detectedLanguage?: string;
  languageName?: string;
  englishTranscript?: string;
  className?: string;
}

export function VoiceAudioPlayer({
  audioUrl,
  autoPlay = false,
  label,
  isUser = false,
  detectedLanguage,
  languageName,
  englishTranscript,
  className,
}: VoiceAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showEnglish, setShowEnglish] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      if (audio.duration && !Number.isNaN(audio.duration) && audio.duration !== Infinity) {
        setDuration(audio.duration);
      }
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);

    if (autoPlay && !isUser) {
      audio.play().catch(() => {
        // Autoplay may be blocked by browser policy without user gesture
        setIsPlaying(false);
      });
    }

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, [audioUrl, autoPlay, isUser]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => setIsPlaying(false));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = Number(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleSpeed = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextSpeed = playbackRate === 1 ? 1.25 : playbackRate === 1.25 ? 1.5 : 1;
    audio.playbackRate = nextSpeed;
    setPlaybackRate(nextSpeed);
  };

  const formatTime = (secs: number) => {
    if (Number.isNaN(secs) || secs < 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={cn(
        "rounded-xl p-2.5 my-1.5 flex flex-col gap-2 transition-all border",
        isUser
          ? "bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground"
          : "bg-background/80 border-border/80 text-foreground shadow-sm",
        className,
      )}
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Header bar */}
      <div className="flex items-center justify-between text-xs font-medium opacity-90">
        <span className="flex items-center gap-1.5">
          <Volume2 size={14} className={cn("animate-pulse", isPlaying ? "opacity-100" : "opacity-60")} />
          <span>{label || (isUser ? "Voice Message" : "Voiceover Reply")}</span>
        </span>
        {languageName && (
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1",
              isUser
                ? "bg-primary-foreground/20 border-primary-foreground/30 text-primary-foreground"
                : "bg-primary/10 border-primary/20 text-primary",
            )}
          >
            <Languages size={10} />
            {languageName}
          </span>
        )}
      </div>

      {/* Controls & Waveform scrubber */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause audio" : "Play audio"}
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-sm",
            isUser
              ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              : "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
        </button>

        {/* Dynamic Waveform & Progress */}
        <div className="flex-1 flex flex-col gap-1">
          <div className="relative flex items-center h-4">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              aria-label="Audio scrubber"
            />
            {/* Visual waveform bars */}
            <div className="w-full h-2 rounded-full overflow-hidden bg-black/10 flex items-center px-1 gap-0.5">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-100",
                  isUser ? "bg-primary-foreground" : "bg-primary",
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between items-center text-[10px] tabular-nums opacity-75">
            <span>{formatTime(currentTime)}</span>
            <span>{duration > 0 ? formatTime(duration) : isPlaying ? "Playing..." : "--:--"}</span>
          </div>
        </div>

        {/* Speed toggle */}
        <button
          type="button"
          onClick={toggleSpeed}
          title="Playback speed"
          className={cn(
            "text-[10px] px-1.5 py-0.5 rounded font-mono font-medium border opacity-80 hover:opacity-100 transition-opacity",
            isUser ? "border-primary-foreground/30 bg-primary-foreground/10" : "border-border bg-muted/60",
          )}
        >
          {playbackRate}x
        </button>
      </div>

      {/* English translation preview for user voice messages */}
      {englishTranscript && (
        <div className="mt-1 pt-1.5 border-t border-current/10">
          <button
            type="button"
            onClick={() => setShowEnglish(!showEnglish)}
            className="flex items-center gap-1 text-[11px] font-medium opacity-80 hover:opacity-100 transition-opacity"
          >
            <Sparkles size={11} className="text-amber-500" />
            <span>{showEnglish ? "Hide English reasoning context" : "View English translation for Copilot"}</span>
          </button>
          {showEnglish && (
            <p className="mt-1 text-xs italic opacity-90 pl-3 border-l-2 border-current/30 leading-snug">
              &quot;{englishTranscript}&quot;
            </p>
          )}
        </div>
      )}
    </div>
  );
}
