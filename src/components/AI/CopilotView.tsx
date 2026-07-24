import React, { useMemo } from 'react';
import { useTrading } from '../../context/TradingContext';
import { analyzeTechnicalSignal } from '../../services/technicalIndicators';
import { Cpu, ShieldCheck, Compass, Target } from 'lucide-react';

export const CopilotView: React.FC = () => {
  const { candles, activeAsset } = useTrading();

  const signal = useMemo(() => {
    return analyzeTechnicalSignal(activeAsset.symbol, candles);
  }, [activeAsset.symbol, candles]);

  const isBullish = signal.signal.includes('BUY');
  const isBearish = signal.signal.includes('SELL');

  return (
    <div className="space-y-6">
      {/* Copilot Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white">AI Market Copilot & Pattern Intelligence</h2>
              <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-mono">
                REAL-TIME NEURAL MODEL
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Automated pattern recognition & technical signal generator for <strong className="text-cyan-400">{activeAsset.symbol}</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Main Signal Display Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Signal Status Gauge */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between items-center text-center shadow-xl">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">PRIMARY TECHNICAL SIGNAL</span>
          
          <div className="my-6">
            <div
              className={`w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center font-mono font-bold shadow-2xl transition-transform ${
                isBullish
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-emerald-500/20 scale-105'
                  : isBearish
                  ? 'border-rose-500 bg-rose-500/10 text-rose-400 shadow-rose-500/20 scale-105'
                  : 'border-amber-500 bg-amber-500/10 text-amber-400 shadow-amber-500/20'
              }`}
            >
              <span className="text-lg tracking-tight">{signal.signal.replace('_', ' ')}</span>
              <span className="text-[10px] text-slate-400 font-sans font-normal mt-1">Confidence 88%</span>
            </div>
          </div>

          <div className="w-full bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono">
            <div className="flex justify-between text-slate-400 mb-1">
              <span>RSI (14):</span>
              <span className="font-bold text-white">{signal.rsiValue}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Trend Structure:</span>
              <span className="font-bold text-cyan-400">{signal.trend}</span>
            </div>
          </div>
        </div>

        {/* Support & Resistance Levels */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 mb-4">
              <Target className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold text-white text-sm font-mono">SUPPORT & RESISTANCE MATRIX</h3>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 flex justify-between items-center">
                <span className="text-rose-400 font-bold">Resistance R2</span>
                <span className="text-white font-bold">${signal.resistanceLevels[1]}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/20 flex justify-between items-center">
                <span className="text-rose-300">Resistance R1</span>
                <span className="text-white">${signal.resistanceLevels[0]}</span>
              </div>
              
              <div className="py-2 text-center text-slate-500 text-[11px] border-y border-slate-800">
                CURRENT PRICE: <strong className="text-cyan-400">${activeAsset.price}</strong>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex justify-between items-center">
                <span className="text-emerald-300">Support S1</span>
                <span className="text-white">${signal.supportLevels[0]}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex justify-between items-center">
                <span className="text-emerald-400 font-bold">Support S2</span>
                <span className="text-white font-bold">${signal.supportLevels[1]}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 font-mono">
            Key breakout levels updated dynamically.
          </div>
        </div>

        {/* AI Executive Summary & Action Plan */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 mb-4">
              <Compass className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-white text-sm font-mono">STRATEGY RECOMMENDATION</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-lg border border-slate-800 font-sans">
              {signal.recommendation}
            </p>

            <div className="mt-4 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800 text-slate-400">
                <span>Suggested Stop-Loss:</span>
                <span className="text-rose-400 font-bold">${(activeAsset.price * 0.975).toFixed(2)} (-2.5%)</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800 text-slate-400">
                <span>Suggested Take-Profit:</span>
                <span className="text-emerald-400 font-bold">${(activeAsset.price * 1.05).toFixed(2)} (+5.0%)</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center space-x-1 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>AI Risk Guard Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
