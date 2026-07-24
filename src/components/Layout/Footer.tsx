import React from 'react';
import { Heart, Terminal } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-900 py-6 px-4 text-xs font-mono text-slate-500">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-slate-300">ApexTrade Studio</span>
          <span>— Open Source Trading & Quantitative Analytics Terminal</span>
        </div>

        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1">
            <span>Built with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-current" />
            <span>for traders & quants</span>
          </span>
          <span>•</span>
          <span className="text-emerald-400">MIT License</span>
        </div>
      </div>
    </footer>
  );
};
