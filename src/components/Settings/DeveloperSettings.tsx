import React from 'react';
import { useTrading } from '../../context/TradingContext';
import { Settings, Download, Server, Radio } from 'lucide-react';

export const DeveloperSettings: React.FC = () => {
  const { volatility, setVolatility, resetPortfolio, portfolio, assets, dataFeedMode, setDataFeedMode } = useTrading();

  const exportData = () => {
    const data = {
      portfolio,
      assets,
      exportedAt: new Date().toISOString(),
      version: '2.4.0',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apextrade-backup-${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Developer Hub & Open Source System Settings</h2>
            <p className="text-xs text-slate-400">Configure market engine parameters, export trading history, and view self-hosting guides</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Data Feed Mode Selector */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Radio className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-white text-sm font-mono">LIVE MARKET DATA FEED SOURCE</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setDataFeedMode('simulated')}
              className={`p-3 rounded-lg border text-left font-mono text-xs transition-all ${
                dataFeedMode === 'simulated'
                  ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="font-bold text-sm mb-1">Simulated Market Engine</div>
              <div className="text-[11px] text-slate-500 font-sans">stochastic random walk engine (Works offline 100%)</div>
            </button>

            <button
              onClick={() => setDataFeedMode('binance_live')}
              className={`p-3 rounded-lg border text-left font-mono text-xs transition-all ${
                dataFeedMode === 'binance_live'
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="font-bold text-sm mb-1 flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1.5" />
                Binance Live WebSockets
              </div>
              <div className="text-[11px] text-slate-500 font-sans">Real-time live crypto prices from Binance public feed</div>
            </button>
          </div>

          {dataFeedMode === 'simulated' && (
            <div className="pt-2">
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-2">
                <span>Market Volatility Multiplier:</span>
                <span className="font-bold text-cyan-400">{volatility.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="5.0"
                step="0.1"
                value={volatility}
                onChange={e => setVolatility(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>0.2x (Calm)</span>
                <span>1.0x (Normal)</span>
                <span>5.0x (High Volatility)</span>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white font-mono">Reset Portfolio State</div>
              <div className="text-[11px] text-slate-400 font-sans">Restore cash to $100,000 and clear trades</div>
            </div>
            <button
              onClick={() => {
                if (confirm('Reset paper trading balance?')) resetPortfolio();
              }}
              className="px-3 py-1.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-mono font-bold hover:bg-rose-500 hover:text-white transition-colors"
            >
              RESET STATE
            </button>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white font-mono">Backup Trading Data</div>
              <div className="text-[11px] text-slate-400 font-sans">Export JSON snapshot of portfolio & orders</div>
            </div>
            <button
              onClick={exportData}
              className="px-3 py-1.5 rounded bg-slate-950 text-cyan-400 border border-cyan-500/40 text-xs font-mono font-bold hover:bg-cyan-500/10 transition-colors flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT JSON</span>
            </button>
          </div>
        </div>

        {/* Self-Hosting & Docker Documentation */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Server className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-white text-sm font-mono">SELF-HOSTING & DOCKER</h3>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            ApexTrade OS is 100% free, MIT licensed, and optimized for instant single-command deployment on Docker, Kubernetes, or Vercel.
          </p>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 space-y-1.5">
            <div className="text-slate-500 text-[10px]"># Deploy locally using Docker</div>
            <div className="text-emerald-400">docker compose up -d</div>
            <div className="text-slate-500 text-[10px]"># Node production build</div>
            <div className="text-cyan-400">npm install && npm run build</div>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>License:</span>
              <strong className="text-emerald-400">MIT Open Source</strong>
            </div>
            <div className="flex justify-between">
              <span>Chart Engine:</span>
              <strong className="text-white">TradingView Lightweight Charts v4</strong>
            </div>
            <div className="flex justify-between">
              <span>Live WebSocket Feed:</span>
              <strong className="text-emerald-400">Binance Public Ticker Stream</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
