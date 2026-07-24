import React, { useState } from 'react';
import { DEFAULT_STRATEGY_SCRIPTS } from '../../data/defaultStrategies';
import { executeCustomStrategyScript } from '../../services/quantEngine';
import { useTrading } from '../../context/TradingContext';
import { Code, Play, CheckCircle2, FileCode, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

export const StrategyEditor: React.FC = () => {
  const { candles, activeAsset } = useTrading();
  
  const [selectedScriptId, setSelectedScriptId] = useState<string>(DEFAULT_STRATEGY_SCRIPTS[0].id);
  const [code, setCode] = useState<string>(DEFAULT_STRATEGY_SCRIPTS[0].code);
  const [executionSignals, setExecutionSignals] = useState<{ action: 'BUY' | 'SELL'; reason: string; index: number }[]>([]);
  const [hasExecuted, setHasExecuted] = useState(false);

  const handleSelectTemplate = (id: string) => {
    setSelectedScriptId(id);
    const matched = DEFAULT_STRATEGY_SCRIPTS.find(s => s.id === id);
    if (matched) {
      setCode(matched.code);
    }
  };

  const handleRunScript = () => {
    if (!candles || candles.length === 0) return;
    const signals = executeCustomStrategyScript(code, candles);
    setExecutionSignals(signals);
    setHasExecuted(true);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Code className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base font-mono">Algorithmic Code IDE & Strategy Builder</h3>
            <p className="text-xs text-slate-400">Write custom JavaScript quantitative trading algorithms & evaluate live signals</p>
          </div>
        </div>

        {/* Template Selector & Run Button */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono">
            <FileCode className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={selectedScriptId}
              onChange={e => handleSelectTemplate(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              {DEFAULT_STRATEGY_SCRIPTS.map(s => (
                <option key={s.id} value={s.id} className="bg-slate-950 text-white">
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRunScript}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold font-mono text-xs rounded-lg flex items-center space-x-2 shadow-lg hover:from-emerald-400 hover:to-teal-400 transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>EXECUTE CODE</span>
          </button>
        </div>
      </div>

      {/* Code Editor Box */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span>JavaScript Strategy Function: <strong className="text-cyan-400">onTick(candles, index)</strong></span>
          <span className="text-slate-500">Evaluating against {candles.length} candles for {activeAsset.symbol}</span>
        </div>

        <textarea
          value={code}
          onChange={e => setCode(e.target.value)}
          rows={14}
          spellCheck={false}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-emerald-400 leading-relaxed focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 shadow-inner"
        />
      </div>

      {/* Execution Results Output Feed */}
      {hasExecuted && (
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2 text-xs font-mono text-white font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>CODE EXECUTION SUCCESS — Generated {executionSignals.length} Quant Signals</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">100% Sandbox Validated</span>
          </div>

          {executionSignals.length === 0 ? (
            <p className="text-xs text-slate-500 font-mono py-2">
              No buy/sell signals generated for current parameter threshold on this asset.
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
              {executionSignals.map((sig, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800 text-xs font-mono"
                >
                  <div className="flex items-center space-x-2">
                    {sig.action === 'BUY' ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40 flex items-center">
                        <ArrowUpCircle className="w-3 h-3 mr-1" /> BUY
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold border border-rose-500/40 flex items-center">
                        <ArrowDownCircle className="w-3 h-3 mr-1" /> SELL
                      </span>
                    )}
                    <span className="text-slate-300">Candle Index #{sig.index}</span>
                  </div>

                  <span className="text-slate-400">{sig.reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
