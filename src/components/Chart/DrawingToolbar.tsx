import React from 'react';
import type { DrawingTool } from '../../types/trading';
import { useTrading } from '../../context/TradingContext';
import { MousePointer, TrendingUp, Minus, Compass, Ruler, Trash2 } from 'lucide-react';

export const DrawingToolbar: React.FC = () => {
  const { activeDrawingTool, setActiveDrawingTool, drawings, clearDrawings } = useTrading();

  const tools: { id: DrawingTool; name: string; icon: React.ReactNode }[] = [
    { id: 'cursor', name: 'Cursor Select', icon: <MousePointer className="w-4 h-4" /> },
    { id: 'trendline', name: 'Trend Line', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'horizontalLine', name: 'Horizontal Price Ray', icon: <Minus className="w-4 h-4" /> },
    { id: 'fibonacci', name: 'Fibonacci Retracement', icon: <Compass className="w-4 h-4" /> },
    { id: 'ruler', name: 'Price Ruler & Range', icon: <Ruler className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col bg-slate-900 border-r border-slate-800 p-1.5 space-y-1 rounded-l-xl z-10 font-mono text-xs select-none">
      {tools.map(tool => (
        <button
          key={tool.id}
          onClick={() => setActiveDrawingTool(tool.id)}
          className={`p-2 rounded-lg transition-all flex items-center justify-center ${
            activeDrawingTool === tool.id
              ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title={tool.name}
        >
          {tool.icon}
        </button>
      ))}

      <div className="my-1 border-t border-slate-800" />

      <button
        onClick={clearDrawings}
        disabled={drawings.length === 0}
        className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 disabled:opacity-30 transition-all flex items-center justify-center"
        title={`Clear All Drawings (${drawings.length})`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};
