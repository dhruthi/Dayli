import React from 'react';
import { FlowCarouselCard } from '../../types/chatEngine';
import { ChevronRight } from 'lucide-react';

interface CarouselViewProps {
  cards: FlowCarouselCard[];
  onSelectCardButton: (card: FlowCarouselCard) => void;
}

export const CarouselView: React.FC<CarouselViewProps> = ({ cards, onSelectCardButton }) => {
  return (
    <div className="w-full overflow-x-auto py-2 px-1 flex space-x-3 scrollbar-thin snap-x">
      {cards.map((card) => (
        <div
          key={card.id}
          className="flex-shrink-0 w-64 bg-[#202c33] rounded-xl overflow-hidden border border-slate-700/60 shadow-lg snap-start flex flex-col justify-between"
        >
          {/* Card Header Image & Badge */}
          <div className="relative h-32 w-full overflow-hidden bg-slate-800">
            <img
              src={card.imageUrl}
              alt={card.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
            {card.badge && (
              <span className="absolute top-2 right-2 bg-emerald-600/90 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                {card.badge}
              </span>
            )}
          </div>

          {/* Card Body */}
          <div className="p-3 flex-1 flex flex-col justify-between">
            <div>
              <h4 className="font-semibold text-sm text-slate-100 mb-1 leading-tight">{card.title}</h4>
              <p className="text-xs text-[#8696a0] leading-relaxed line-clamp-3">{card.description}</p>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => onSelectCardButton(card)}
              className="mt-3 w-full py-2 px-3 bg-[#005c4b] hover:bg-[#00a884] hover:text-slate-950 text-emerald-300 font-medium text-xs rounded-lg border border-emerald-500/30 transition-all flex items-center justify-center space-x-1 shadow-sm"
            >
              <span>{card.buttonText}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
