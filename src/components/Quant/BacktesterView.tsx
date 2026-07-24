import React, { useState, useEffect } from 'react';
import { useTrading } from '../../context/TradingContext';
import type { StrategyConfig, BacktestResult, StrategyName } from '../../types/trading';
import { runBacktest } from '../../services/backtester';
import { StrategyEditor } from './StrategyEditor';
import { BotsManager } from './BotsManager';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { StrategyImporter } from './StrategyImporter';
import { StrategyExplorerView } from './StrategyExplorerView';
import { Activity, Play, Code, Bot, Grid, Globe, Sparkles } from 'lucide-react';

export const BacktesterView: React.FC = () => {
  const { candles, activeAsset } = useTrading();
  const [subTab, setSubTab] = useState<'backtest' | 'explorer' | 'editor' | 'bots' | 'importer' | 'analytics'>('explorer');

  const [config, setConfig] = useState<StrategyConfig>({
    strategy: 'SMA_CROSSOVER',
    fastPeriod: 9,
    slowPeriod: 21,
    rsiThresholdLow: 30,
    rsiThresholdHigh: 70,
    stopLossPercent: 2.5,
    takeProfitPercent: 5.0,
    initialCapital: 10000,
  });

  const [result, setResult] = useState<BacktestResult | null>(null);

  const handleRun = () => {
    if (!candles || candles.length === 0) return;
    const res = runBacktest(candles, config, activeAsset.symbol);
    setResult(res);
  };

  useEffect(() => {
    handleRun();
  }, [activeAsset.symbol, config.strategy, candles]);

  return (
    <div className="space-y-6">
      {/* Sub Navigation Bar for Quant Suite */}
      <div className="bg-slate-900 border border-slate-800 p-1.5 rounded-xl flex flex-wrap items-center justify-between gap-2 font-mono text-xs shadow-lg">
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => setSubTab('explorer')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              subTab === 'explorer'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Autonomous Strategy Explorer</span>
          </button>

          <button
            onClick={() => setSubTab('backtest')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              subTab === 'backtest'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Manual Backtester</span>
          </button>

          <button
            onClick={() => setSubTab('editor')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              subTab === 'editor'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Strategy Code IDE</span>
          </button>

          <button
            onClick={() => setSubTab('importer')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              subTab === 'importer'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Data Importer</span>
          </button>

          <button
            onClick={() => setSubTab('bots')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              subTab === 'bots'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Automated Bots</span>
          </button>

          <button
            onClick={() => setSubTab('analytics')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              subTab === 'analytics'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Heatmaps & Analytics</span>
          </button>
        </div>

        <span className="text-[11px] text-slate-500 font-sans px-2 hidden md:inline">
          Institutional Quantitative Engine v2.4
        </span>
      </div>

      {/* Sub Tab View Router */}
      {subTab === 'explorer' && <StrategyExplorerView />}
      {subTab === 'editor' && <StrategyEditor />}
      {subTab === 'importer' && <StrategyImporter />}
      {subTab === 'bots' && <BotsManager />}
      {subTab === 'analytics' && <AnalyticsDashboard />}

      {subTab === 'backtest' && (
        <div className="space-y-6">
          {/* Top Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white font-mono">Quantitative Strategy Backtester</h2>
                <p className="text-xs text-slate-400">
                  Test algorithmic trading strategies against historical candle data for <strong className="text-cyan-400">{activeAsset.symbol}</strong> ({candles.length} candles loaded).
                </p>
              </div>
            </div>

            {/* Strategy Selection Controls */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-slate-800">
              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1 font-mono">Strategy Algorithm</label>
                <select
                  value={config.strategy}
                  onChange={e => setConfig({ ...config, strategy: e.target.value as StrategyName })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                >
                  <option value="SMA_CROSSOVER">Golden Cross (SMA Crossover)</option>
                  <option value="RSI_REVERSAL">RSI Mean Reversal</option>
                  <option value="BOLLINGER_BREAKOUT">Bollinger Bands Breakout</option>
                </select>
              </div>

              {config.strategy === 'SMA_CROSSOVER' && (
                <>
                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1 font-mono">Fast MA Period</label>
                    <input
                      type="number"
                      value={config.fastPeriod}
                      onChange={e => setConfig({ ...config, fastPeriod: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1 font-mono">Slow MA Period</label>
                    <input
                      type="number"
                      value={config.slowPeriod}
                      onChange={e => setConfig({ ...config, slowPeriod: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs"
                    />
                  </div>
                </>
              )}

              {config.strategy === 'RSI_REVERSAL' && (
                <>
                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1 font-mono">Oversold Threshold</label>
                    <input
                      type="number"
                      value={config.rsiThresholdLow}
                      onChange={e => setConfig({ ...config, rsiThresholdLow: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1 font-mono">Overbought Threshold</label>
                    <input
                      type="number"
                      value={config.rsiThresholdHigh}
                      onChange={e => setConfig({ ...config, rsiThresholdHigh: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1 font-mono">Stop-Loss %</label>
                <input
                  type="number"
                  step="0.5"
                  value={config.stopLossPercent}
                  onChange={e => setConfig({ ...config, stopLossPercent: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleRun}
                  className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold font-mono text-xs rounded-lg flex items-center justify-center space-x-2 shadow-lg hover:from-cyan-400 hover:to-blue-500 transition-all"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>RUN BACKTEST</span>
                </button>
              </div>
            </div>
          </div>

          {/* Backtest Results Cards */}
          {result && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <span className="text-[11px] text-slate-400 font-mono block">TOTAL RETURN</span>
                  <span className={`text-xl font-bold font-mono ${result.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {result.totalReturnPct >= 0 ? '+' : ''}{result.totalReturnPct}%
                  </span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <span className="text-[11px] text-slate-400 font-mono block">WIN RATE</span>
                  <span className="text-xl font-bold font-mono text-cyan-400">
                    {result.winRate}%
                  </span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <span className="text-[11px] text-slate-400 font-mono block">MAX DRAWDOWN</span>
                  <span className="text-xl font-bold font-mono text-rose-400">
                    -{result.maxDrawdownPct}%
                  </span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <span className="text-[11px] text-slate-400 font-mono block">SHARPE RATIO</span>
                  <span className="text-xl font-bold font-mono text-amber-400">
                    {result.sharpeRatio}
                  </span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <span className="text-[11px] text-slate-400 font-mono block">PROFIT FACTOR</span>
                  <span className="text-xl font-bold font-mono text-indigo-400">
                    {result.profitFactor}
                  </span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <span className="text-[11px] text-slate-400 font-mono block">TOTAL TRADES</span>
                  <span className="text-xl font-bold font-mono text-white">
                    {result.totalTrades}
                  </span>
                </div>
              </div>

              {/* Equity Curve Visual Bar */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
                <h3 className="font-bold text-white text-sm mb-4 font-mono">EQUITY CURVE HISTOGRAM</h3>
                <div className="h-44 w-full flex items-end space-x-1 pt-4 pb-2 px-2 bg-slate-950 rounded-lg border border-slate-800 overflow-x-auto">
                  {result.equityCurve.map((pt, idx) => {
                    const heightPct = Math.min(100, Math.max(10, (pt.equity / config.initialCapital) * 50));
                    const isGain = pt.equity >= config.initialCapital;
                    return (
                      <div
                        key={idx}
                        className={`flex-1 rounded-t transition-all ${isGain ? 'bg-cyan-500/80 hover:bg-cyan-400' : 'bg-rose-500/80 hover:bg-rose-400'}`}
                        style={{ height: `${heightPct}%` }}
                        title={`${pt.time}: $${pt.equity}`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Trades Log Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
                <h3 className="font-bold text-white text-sm mb-4 font-mono">EXECUTED STRATEGY TRADES LOG</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="pb-2">ENTRY TIME</th>
                        <th className="pb-2">EXIT TIME</th>
                        <th className="pb-2">ENTRY PRICE</th>
                        <th className="pb-2">EXIT PRICE</th>
                        <th className="pb-2">PROFIT / LOSS</th>
                        <th className="pb-2">RETURN %</th>
                        <th className="pb-2">EXIT TRIGGER</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {result.trades.map((tr, idx) => (
                        <tr key={idx} className="hover:bg-slate-950/40">
                          <td className="py-2.5 text-slate-300">{tr.entryTime}</td>
                          <td className="py-2.5 text-slate-300">{tr.exitTime}</td>
                          <td className="py-2.5 text-slate-200">${tr.entryPrice}</td>
                          <td className="py-2.5 text-slate-200">${tr.exitPrice}</td>
                          <td className={`py-2.5 font-bold ${tr.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {tr.pnl >= 0 ? '+' : ''}${tr.pnl}
                          </td>
                          <td className={`py-2.5 font-bold ${tr.pnlPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {tr.pnlPercent >= 0 ? '+' : ''}{tr.pnlPercent}%
                          </td>
                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                              tr.reason === 'TakeProfit' 
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                : tr.reason === 'StopLoss' 
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                                : 'bg-slate-800 text-slate-300'
                            }`}>
                              {tr.reason}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
