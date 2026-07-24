import React, { useMemo } from 'react';
import { useTrading } from '../../context/TradingContext';
import { analyzeTechnicalSignal } from '../../services/technicalIndicators';
import { Radar, ArrowUpCircle, ArrowDownCircle, Minus, Activity } from 'lucide-react';

export const SignalRadar: React.FC = () => {
  const { assets, candles, setActiveAsset } = useTrading();

  const signalsList = useMemo(() => {
    return assets.map(asset => {
      const sig = analyzeTechnicalSignal(asset.symbol, candles);
      return {
        asset,
        signal: sig,
      };
    });
  }, [assets, candles]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4 font-sans">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <Radar className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm font-mono">Live Market Signal Radar (實時訊號偵測雷達)</h3>
            <p className="text-xs text-slate-400">Automated multi-asset technical indicator & pattern detection engine</p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono text-xs font-bold flex items-center space-x-1">
          <Activity className="w-3.5 h-3.5" />
          <span>Active Scanner</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {signalsList.map(({ asset, signal }) => {
          const isBuy = signal.signal.includes('BUY');
          const isSell = signal.signal.includes('SELL');

          return (
            <div
              key={asset.symbol}
              onClick={() => setActiveAsset(asset)}
              className="bg-slate-950 hover:bg-slate-800/80 border border-slate-800/80 hover:border-cyan-500/50 p-3.5 rounded-xl transition-all cursor-pointer space-y-2 group"
            >
              <div className="flex items-center justify-between font-mono">
                <div>
                  <span className="font-bold text-white text-sm group-hover:text-cyan-400 transition-colors">
                    {asset.symbol}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-sans">{asset.name}</span>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold font-mono flex items-center space-x-1 ${
                    isBuy
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : isSell
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {isBuy ? <ArrowUpCircle className="w-3.5 h-3.5" /> : isSell ? <ArrowDownCircle className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                  <span>{signal.signal.replace('_', ' ')}</span>
                </span>
              </div>

              <div className="flex justify-between items-center text-xs font-mono pt-1 text-slate-400">
                <span>Price: <strong className="text-white">${asset.price.toLocaleString()}</strong></span>
                <span>RSI (14): <strong className="text-cyan-400">{signal.rsiValue}</strong></span>
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-900/90 p-2 rounded border border-slate-800/60 line-clamp-2">
                {signal.recommendation}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
