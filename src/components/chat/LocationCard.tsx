import React from 'react';
import { MapPin, Navigation } from 'lucide-react';

interface LocationCardProps {
  latitude?: number;
  longitude?: number;
  name?: string;
  address?: string;
  onSendLocation?: () => void;
  isInteractive?: boolean;
}

export const LocationCard: React.FC<LocationCardProps> = ({
  latitude = 28.6139,
  longitude = 77.209,
  name = 'New Delhi Central GPS',
  address = 'Sector 12, Healthcare Boulevard',
  onSendLocation,
  isInteractive = false,
}) => {
  return (
    <div className="bg-[#202c33] rounded-lg overflow-hidden border border-slate-700/60 max-w-[280px] sm:max-w-[320px] shadow-sm">
      {/* Map visual preview background */}
      <div className="relative h-28 w-full bg-slate-800 flex items-center justify-center overflow-hidden">
        {/* Simulated map grid lines & pin */}
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:12px_12px] opacity-60" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-9 h-9 rounded-full bg-red-500/20 ring-4 ring-red-500/30 flex items-center justify-center animate-bounce">
            <MapPin className="w-6 h-6 text-red-500 fill-red-500" />
          </div>
        </div>
        <div className="absolute bottom-1 right-2 text-[9px] font-mono bg-slate-900/80 px-1.5 py-0.5 rounded text-slate-300">
          {latitude.toFixed(4)}, {longitude.toFixed(4)}
        </div>
      </div>

      {/* Address Details */}
      <div className="p-2.5">
        <h4 className="font-semibold text-xs text-slate-100 flex items-center space-x-1">
          <span>{name}</span>
        </h4>
        <p className="text-[11px] text-[#8696a0] mt-0.5 leading-snug">{address}</p>

        {isInteractive && onSendLocation && (
          <button
            onClick={onSendLocation}
            className="mt-2.5 w-full py-1.5 bg-[#00a884] hover:bg-[#029071] text-slate-950 font-semibold text-xs rounded transition-colors flex items-center justify-center space-x-1.5 shadow"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Share Live GPS Coordinates</span>
          </button>
        )}
      </div>
    </div>
  );
};
