import React from 'react';
import { useTrading } from '../../context/TradingContext';
import { Sliders, Eye, EyeOff } from 'lucide-react';

export const IndicatorControls: React.FC = () => {
  const { indicators, toggleIndicator } = useTrading();

  return (
    <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
      <div className="flex items-center space-x-2 text-slate-400 font-medium">
        <Sliders className="w-3.5 h-3.5 text-cyan-400" />
        <span>Technical Overlays:</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {indicators.map(ind => (
          <button
            key={ind.id}
            onClick={() => toggleIndicator(ind.id)}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md border font-mono font-medium transition-all ${
              ind.enabled
                ? 'bg-slate-800 border-slate-700 text-white shadow-sm'
                : 'bg-slate-950/50 border-slate-800/60 text-slate-500 hover:text-slate-300'
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: ind.color, opacity: ind.enabled ? 1 : 0.4 }}
            />
            <span>{ind.type} {ind.period > 0 ? `(${ind.period})` : ''}</span>
            {ind.enabled ? <Eye className="w-3 h-3 text-slate-300 ml-1" /> : <EyeOff className="w-3 h-3 text-slate-600 ml-1" />}
          </button>
        ))}
      </div>
    </div>
  );
};
