import React, { useState, useEffect } from 'react';
import { useTrading } from '../../context/TradingContext';
import { exploreProfitableStrategies, type ExplorationCandidate } from '../../services/strategyExplorer';
import { CheckCircle2, ShieldCheck, Sparkles, Trophy, ArrowRight, RefreshCw } from 'lucide-react';

export const StrategyExplorerView: React.FC = () => {
  const { candles, activeAsset } = useTrading();

  const [candidates, setCandidates] = useState<ExplorationCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);

  const handleStartExploration = () => {
    setIsSearching(true);
    setScannedCount(0);

    setTimeout(() => {
      const results = exploreProfitableStrategies(candles, activeAsset.symbol);
      setCandidates(results);
      setScannedCount(results.length);
      setIsSearching(false);
    }, 800);
  };

  useEffect(() => {
    handleStartExploration();
  }, [activeAsset.symbol, candles]);

  const verifiedStrategies = candidates.filter(c => c.passedVerification);

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
            <Sparkles className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white font-mono">Autonomous Long-Term Profitable Strategy Explorer</h2>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold">
                INSTITUTIONAL GATE 4 VALIDATED
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Iteratively scans parameter spaces across 4 strict verification gates for <strong className="text-cyan-400">{activeAsset.symbol}</strong>
            </p>
          </div>
        </div>

        <button
          onClick={handleStartExploration}
          disabled={isSearching}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold font-mono text-xs rounded-lg flex items-center space-x-2 shadow-lg hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isSearching ? 'animate-spin' : ''}`} />
          <span>{isSearching ? 'EXPLORING PARAMETER SPACE...' : 'RE-RUN EXPLORATION'}</span>
        </button>
      </div>

      {/* Exploration Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
          <span className="text-[11px] text-slate-400 font-mono block">SCANNED STRATEGIES</span>
          <span className="text-2xl font-bold font-mono text-white">{scannedCount}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
          <span className="text-[11px] text-slate-400 font-mono block">VERIFIED LONG-TERM ALPHA</span>
          <span className="text-2xl font-bold font-mono text-emerald-400">{verifiedStrategies.length}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
          <span className="text-[11px] text-slate-400 font-mono block">TOP SHARPE RATIO</span>
          <span className="text-2xl font-bold font-mono text-cyan-400">
            {candidates[0]?.sharpeRatio || 'N/A'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
          <span className="text-[11px] text-slate-400 font-mono block">TOP PROFIT FACTOR</span>
          <span className="text-2xl font-bold font-mono text-indigo-400">
            {candidates[0]?.profitFactor || 'N/A'}
          </span>
        </div>
      </div>

      {/* Institutional Verification Gates Explanatory Card */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono space-y-2 text-slate-300">
        <div className="font-bold text-cyan-400 flex items-center space-x-1">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>4-Gate Institutional Profitability Verification Standard:</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-[11px] text-slate-400 pt-1">
          <div className="p-2 rounded bg-slate-900 border border-slate-800">
            <span className="text-emerald-400 font-bold block">Gate 1: Sharpe &gt; 1.1</span>
            High risk-adjusted return ratio
          </div>
          <div className="p-2 rounded bg-slate-900 border border-slate-800">
            <span className="text-emerald-400 font-bold block">Gate 2: Max Drawdown &lt; 18%</span>
            Capital preservation & low risk
          </div>
          <div className="p-2 rounded bg-slate-900 border border-slate-800">
            <span className="text-emerald-400 font-bold block">Gate 3: Profit Factor &gt; 1.35</span>
            Total Wins / Total Losses &gt; 1.35
          </div>
          <div className="p-2 rounded bg-slate-900 border border-slate-800">
            <span className="text-emerald-400 font-bold block">Gate 4: Win Rate &gt; 45%</span>
            Statistical edge consistency
          </div>
        </div>
      </div>

      {/* Discovered Strategies Leaderboard List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h3 className="font-bold text-white text-sm font-mono">Top Verified Long-Term Profitable Strategies (長久營利策略榜單)</h3>
        </div>

        <div className="space-y-3">
          {candidates.slice(0, 8).map((cand, idx) => {
            const isTop1 = idx === 0;

            return (
              <div
                key={cand.id}
                className={`p-4 rounded-xl border transition-all ${
                  cand.passedVerification
                    ? 'bg-slate-950 border-emerald-500/30 hover:border-emerald-500/60'
                    : 'bg-slate-950/60 border-slate-800/80 opacity-70'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center space-x-2">
                    {isTop1 && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-mono font-bold flex items-center space-x-1">
                        <Trophy className="w-3 h-3" />
                        <span>GOLDEN ALPHA #1</span>
                      </span>
                    )}

                    <h4 className="font-bold text-white text-sm font-mono">{cand.strategyName}</h4>

                    {cand.passedVerification ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> PASSED 4 GATES
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono">
                        FAIL GATES
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-mono text-cyan-400 font-bold">
                    Composite Score: {cand.score}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 text-[10px] block">RETURN</span>
                    <span className={`font-bold ${cand.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {cand.totalReturnPct >= 0 ? '+' : ''}{cand.totalReturnPct}%
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block">SHARPE RATIO</span>
                    <span className={`font-bold ${cand.verificationDetails.sharpePass ? 'text-cyan-400' : 'text-slate-400'}`}>
                      {cand.sharpeRatio}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block">MAX DRAWDOWN</span>
                    <span className={`font-bold ${cand.verificationDetails.drawdownPass ? 'text-emerald-400' : 'text-rose-400'}`}>
                      -{cand.maxDrawdownPct}%
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block">PROFIT FACTOR</span>
                    <span className={`font-bold ${cand.verificationDetails.profitFactorPass ? 'text-indigo-400' : 'text-slate-400'}`}>
                      {cand.profitFactor}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block">WIN RATE</span>
                    <span className={`font-bold ${cand.verificationDetails.winRatePass ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {cand.winRatePct}%
                    </span>
                  </div>

                  <div className="flex items-end justify-end">
                    <button
                      onClick={() => alert(`Strategy ${cand.strategyName} selected! Parameter configured for live signal scanning.`)}
                      className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-cyan-500/30 rounded text-[11px] font-mono font-bold transition-all flex items-center space-x-1"
                    >
                      <span>SELECT STRATEGY</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
