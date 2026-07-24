import React from 'react';
import { useTrading } from '../../context/TradingContext';
import type { ChartType } from '../../types/trading';
import { Star, TrendingUp, TrendingDown, Layers, BarChart2, LineChart, AreaChart } from 'lucide-react';

export const ChartHeader: React.FC = () => {
  const { 
    assets, 
    activeAsset, 
    setActiveAsset, 
    timeframe, 
    setTimeframe, 
    watchlist, 
    toggleWatchlist,
    chartType,
    setChartType
  } = useTrading();

  const isFavorite = watchlist.includes(activeAsset.symbol);
  const isPositive = activeAsset.change24h >= 0;

  const timeframes: ('1m' | '5m' | '15m' | '1h' | '4h' | '1D')[] = ['1m', '5m', '15m', '1h', '4h', '1D'];

  const chartTypes: { id: ChartType; label: string; icon: React.ReactNode }[] = [
    { id: 'candlestick', label: 'Candles', icon: <BarChart2 className="w-3.5 h-3.5" /> },
    { id: 'line', label: 'Line', icon: <LineChart className="w-3.5 h-3.5" /> },
    { id: 'area', label: 'Area', icon: <AreaChart className="w-3.5 h-3.5" /> },
    { id: 'heikinAshi', label: 'Heikin-Ashi', icon: <BarChart2 className="w-3.5 h-3.5 text-cyan-400" /> },
  ];

  return (
    <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-4">
      {/* Left Asset Selector & Favorite */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => toggleWatchlist(activeAsset.symbol)}
          className={`p-1.5 rounded-lg border transition-colors ${
            isFavorite
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
              : 'border-slate-800 text-slate-500 hover:text-slate-300'
          }`}
          title={isFavorite ? 'Remove from Watchlist' : 'Add to Watchlist'}
        >
          <Star className="w-4 h-4 fill-current" />
        </button>

        <div className="relative">
          <select
            value={activeAsset.symbol}
            onChange={e => {
              const selected = assets.find(a => a.symbol === e.target.value);
              if (selected) setActiveAsset(selected);
            }}
            className="bg-slate-950 text-white font-bold text-base px-3 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500 font-mono cursor-pointer"
          >
            {assets.map(asset => (
              <option key={asset.symbol} value={asset.symbol}>
                {asset.symbol} - {asset.name}
              </option>
            ))}
          </select>
        </div>

        {/* Current Asset Live Price & Change */}
        <div className="flex items-baseline space-x-2 font-mono">
          <span className="text-xl font-bold text-white">
            ${activeAsset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          <span className={`text-sm font-semibold flex items-center ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPositive ? <TrendingUp className="w-3.5 h-3.5 mr-1" /> : <TrendingDown className="w-3.5 h-3.5 mr-1" />}
            {isPositive ? '+' : ''}{activeAsset.change24h.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Chart Style Switcher (Candles, Line, Area, Heikin-Ashi) */}
      <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 font-mono">
        {chartTypes.map(ct => (
          <button
            key={ct.id}
            onClick={() => setChartType(ct.id)}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              chartType === ct.id
                ? 'bg-slate-800 text-cyan-400 font-bold border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
            title={ct.label}
          >
            {ct.icon}
            <span className="hidden sm:inline">{ct.label}</span>
          </button>
        ))}
      </div>

      {/* Right Timeframe Controls */}
      <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
        <span className="text-[11px] text-slate-500 font-mono px-2 flex items-center">
          <Layers className="w-3 h-3 mr-1" /> TF:
        </span>
        {timeframes.map(tf => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${
              timeframe === tf
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>
    </div>
  );
};
