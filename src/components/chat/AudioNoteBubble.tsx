import React, { useState } from 'react';
import { Play, Pause, Mic } from 'lucide-react';

interface AudioNoteBubbleProps {
  mediaUrl?: string;
  durationSeconds?: number;
  fileName?: string;
  timestamp: string;
}

export const AudioNoteBubble: React.FC<AudioNoteBubbleProps> = ({
  durationSeconds = 24,
  fileName = 'Audio Guidance',
  timestamp,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(30);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex items-center space-x-3 p-2 bg-[#202c33] rounded-lg max-w-[280px] sm:max-w-[320px] shadow-sm">
      {/* Mic avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-emerald-700/40 border border-emerald-500/30 flex items-center justify-center">
          <Mic className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 rounded-full w-3.5 h-3.5 flex items-center justify-center">
          <span className="text-[8px] font-bold text-slate-900">🎤</span>
        </div>
      </div>

      {/* Play/Pause & Waveform */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <button
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-[#00a884] hover:bg-[#029071] transition-colors flex items-center justify-center text-slate-900 font-bold shadow"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-slate-900" /> : <Play className="w-4 h-4 fill-slate-900 ml-0.5" />}
          </button>

          {/* Simulated Waveform bars */}
          <div className="flex-1 flex items-center space-x-0.5 h-6">
            {[40, 75, 30, 90, 60, 80, 45, 100, 70, 50, 85, 40, 65, 95, 30, 70, 50].map((height, i) => (
              <div
                key={i}
                style={{ height: `${height}%` }}
                className={`w-1 rounded-full transition-all duration-300 ${
                  i < (progress / 100) * 17 ? 'bg-emerald-400' : 'bg-slate-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="flex justify-between items-center text-[10px] text-[#8696a0] mt-1 px-1">
          <span>{isPlaying ? '0:12' : `0:${durationSeconds < 10 ? '0' : ''}${durationSeconds}`}</span>
          <span>{timestamp}</span>
        </div>
      </div>
    </div>
  );
};
