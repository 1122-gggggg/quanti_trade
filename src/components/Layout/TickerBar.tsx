import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

export const TickerBar: React.FC = () => {
  const { assets, setActiveAsset } = useTrading();

  return (
    <div className="w-full bg-slate-950 border-b border-slate-900 overflow-hidden py-1.5 px-2 flex items-center select-none text-xs font-mono">
      <div className="flex items-center space-x-6 animate-marquee whitespace-nowrap">
        {assets.concat(assets).map((asset, idx) => {
          const isPositive = asset.change24h >= 0;
          return (
            <div
              key={`${asset.symbol}-${idx}`}
              onClick={() => setActiveAsset(asset)}
              className="inline-flex items-center space-x-2 cursor-pointer hover:bg-slate-900/80 px-2 py-0.5 rounded transition-colors group"
            >
              <span className="font-semibold text-slate-300 group-hover:text-cyan-400">
                {asset.symbol}
              </span>
              <span className="text-slate-200">
                ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span
                className={`inline-flex items-center text-[11px] font-bold ${
                  isPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isPositive ? <TrendingUp className="w-3 h-3 mr-0.5 inline" /> : <TrendingDown className="w-3 h-3 mr-0.5 inline" />}
                {isPositive ? '+' : ''}{asset.change24h.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
