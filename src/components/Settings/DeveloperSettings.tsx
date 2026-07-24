import React from 'react';
import { useTrading } from '../../context/TradingContext';
import { Settings, Download, Server, Radio } from 'lucide-react';
import { PlatformBackendPanel } from './PlatformBackendPanel';

export const DeveloperSettings: React.FC = () => {
  const { volatility, setVolatility, resetPortfolio, portfolio, assets, dataFeedMode, setDataFeedMode } = useTrading();

  const exportData = () => {
    const data = {
      portfolio,
      assets,
      exportedAt: new Date().toISOString(),
      version: '3.0.0',
      note: 'Browser demo-state export. Persistent platform data is stored by the backend.',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `apextrade-backup-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Developer Hub & Platform Settings</h2>
            <p className="text-xs text-slate-400">Manage the persistent backend, market-data sources, local simulation and self-hosting environment.</p>
          </div>
        </div>
      </div>

      <PlatformBackendPanel />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Radio className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-white text-sm font-mono">BROWSER DEMO DATA FEED</h3>
          </div>

          <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 text-[11px] text-amber-200">
            These modes are for browser demonstrations. Research-grade history must be loaded from a versioned backend dataset.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDataFeedMode('simulated')}
              className={`p-3 rounded-lg border text-left font-mono text-xs transition-all ${
                dataFeedMode === 'simulated'
                  ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="font-bold text-sm mb-1">Simulated Engine</div>
              <div className="text-[11px] text-slate-500 font-sans">Offline stochastic demonstration feed.</div>
            </button>

            <button
              type="button"
              onClick={() => setDataFeedMode('binance_live')}
              className={`p-3 rounded-lg border text-left font-mono text-xs transition-all ${
                dataFeedMode === 'binance_live'
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="font-bold text-sm mb-1 flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5" />
                Binance Ticker
              </div>
              <div className="text-[11px] text-slate-500 font-sans">Public crypto ticker stream; not persisted history.</div>
            </button>
          </div>

          {dataFeedMode === 'simulated' && (
            <div className="pt-2">
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-2">
                <span>Volatility multiplier:</span>
                <span className="font-bold text-cyan-400">{volatility.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="5.0"
                step="0.1"
                value={volatility}
                onChange={event => setVolatility(parseFloat(event.target.value))}
                className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          )}

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-white font-mono">Reset browser portfolio</div>
              <div className="text-[11px] text-slate-400">Clears only the local paper-trading demonstration state.</div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm('Reset browser paper-trading state?')) resetPortfolio();
              }}
              className="px-3 py-1.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-mono font-bold hover:bg-rose-500 hover:text-white transition-colors"
            >
              RESET
            </button>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-white font-mono">Export browser state</div>
              <div className="text-[11px] text-slate-400">Persistent backend records are exported through API endpoints.</div>
            </div>
            <button
              type="button"
              onClick={exportData}
              className="px-3 py-1.5 rounded bg-slate-950 text-cyan-400 border border-cyan-500/40 text-xs font-mono font-bold hover:bg-cyan-500/10 transition-colors flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT JSON</span>
            </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Server className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-white text-sm font-mono">SELF-HOSTING STACK</h3>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            The full stack includes the web terminal, Node API, asynchronous worker, PostgreSQL/TimescaleDB, PostgREST, Redis and private MinIO object storage.
          </p>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 space-y-1.5">
            <div className="text-slate-500 text-[10px]"># Copy and replace development secrets</div>
            <div className="text-cyan-400">cp .env.example .env</div>
            <div className="text-slate-500 text-[10px]"># Start the complete platform</div>
            <div className="text-emerald-400">docker compose up -d --build</div>
            <div className="text-slate-500 text-[10px]"># Run deterministic backend tests</div>
            <div className="text-cyan-400">npm run test:platform</div>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-slate-400 space-y-1">
            <div className="flex justify-between"><span>API:</span><strong className="text-white">:8787</strong></div>
            <div className="flex justify-between"><span>Web:</span><strong className="text-white">:8080</strong></div>
            <div className="flex justify-between"><span>MinIO console:</span><strong className="text-white">:9001</strong></div>
            <div className="flex justify-between"><span>Database access:</span><strong className="text-emerald-400">Private network only</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
};
