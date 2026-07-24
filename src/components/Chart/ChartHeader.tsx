import React from 'react';
import { useTrading } from '../../context/TradingContext';
import type { ChartType, Timeframe } from '../../types/trading';
import { Star, TrendingUp, TrendingDown, Layers, BarChart2 } from 'lucide-react';

const TIMEFRAMES: Timeframe[] = [
  '1s',
  '5s',
  '15s',
  '30s',
  '1m',
  '3m',
  '5m',
  '15m',
  '30m',
  '45m',
  '1h',
  '2h',
  '4h',
  '1D',
  '1W',
  '1M',
];

const CHART_TYPES: Array<{ id: ChartType; label: string }> = [
  { id: 'candlestick', label: 'Candles' },
  { id: 'hollowCandles', label: 'Hollow Candles' },
  { id: 'bar', label: 'Bars' },
  { id: 'line', label: 'Line' },
  { id: 'area', label: 'Area' },
  { id: 'baseline', label: 'Baseline' },
  { id: 'heikinAshi', label: 'Heikin-Ashi' },
];

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
    setChartType,
  } = useTrading();

  const isFavorite = watchlist.includes(activeAsset.symbol);
  const isPositive = activeAsset.change24h >= 0;
  const priceDigits = activeAsset.category === 'forex' ? 5 : 2;

  return (
    <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center space-x-3">
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

          <select
            value={activeAsset.symbol}
            onChange={event => {
              const selected = assets.find(asset => asset.symbol === event.target.value);
              if (selected) setActiveAsset(selected);
            }}
            className="max-w-[260px] bg-slate-950 text-white font-bold text-base px-3 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500 font-mono cursor-pointer"
            aria-label="Select market symbol"
          >
            {assets.map(asset => (
              <option key={asset.symbol} value={asset.symbol}>
                {asset.symbol} · {asset.name}
              </option>
            ))}
          </select>

          <div className="hidden sm:flex items-baseline space-x-2 font-mono">
            <span className="text-xl font-bold text-white">
              {activeAsset.price.toLocaleString(undefined, {
                minimumFractionDigits: priceDigits,
                maximumFractionDigits: priceDigits,
              })}
            </span>
            <span className={`text-sm font-semibold flex items-center ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isPositive
                ? <TrendingUp className="w-3.5 h-3.5 mr-1" />
                : <TrendingDown className="w-3.5 h-3.5 mr-1" />}
              {isPositive ? '+' : ''}{activeAsset.change24h.toFixed(2)}%
            </span>
          </div>
        </div>

        <label className="flex items-center space-x-2 bg-slate-950 p-1 rounded-lg border border-slate-800 font-mono">
          <BarChart2 className="w-3.5 h-3.5 ml-2 text-slate-500" />
          <span className="sr-only">Chart type</span>
          <select
            value={chartType}
            onChange={event => setChartType(event.target.value as ChartType)}
            className="bg-transparent text-xs text-cyan-400 font-bold px-2 py-1 focus:outline-none cursor-pointer"
          >
            {CHART_TYPES.map(type => (
              <option key={type.id} value={type.id} className="bg-slate-950 text-slate-100">
                {type.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto bg-slate-950 p-1 rounded-lg border border-slate-800">
        <span className="sticky left-0 z-10 bg-slate-950 text-[11px] text-slate-500 font-mono px-2 flex items-center">
          <Layers className="w-3 h-3 mr-1" /> Interval
        </span>
        {TIMEFRAMES.map(value => (
          <button
            key={value}
            onClick={() => setTimeframe(value)}
            className={`shrink-0 px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${
              timeframe === value
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
};
