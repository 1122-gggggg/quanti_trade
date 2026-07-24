import React, { useState } from 'react';
import type { QuantBot } from '../../types/quant';
import { useTrading } from '../../context/TradingContext';
import { Bot, Play, Pause, Plus, Activity, Trash2 } from 'lucide-react';

export const BotsManager: React.FC = () => {
  const { assets } = useTrading();

  const [bots, setBots] = useState<QuantBot[]>([
    {
      id: 'bot-1',
      name: 'BTC Alpha Trend Follower',
      symbol: 'BTC/USD',
      strategyId: 'strat-sma-cross',
      timeframe: '1h',
      status: 'running',
      allocatedCapital: 25000,
      currentPnL: 1420.50,
      totalTrades: 18,
      winningTrades: 12,
      startedAt: Date.now() - 86400000 * 5,
      logs: [
        { timestamp: '10:15:02', message: 'Golden Cross detected on BTC/USD 1h. Executed BUY order @ $94,200', type: 'trade' },
        { timestamp: '09:00:00', message: 'Routine market volatility scan completed. Signal: Bullish Hold', type: 'info' }
      ]
    },
    {
      id: 'bot-2',
      name: 'NVDA Grid Arbitrage Bot',
      symbol: 'NVDA',
      strategyId: 'strat-grid',
      timeframe: '15m',
      status: 'running',
      allocatedCapital: 15000,
      currentPnL: 685.20,
      totalTrades: 32,
      winningTrades: 24,
      startedAt: Date.now() - 86400000 * 2,
      logs: [
        { timestamp: '11:02:40', message: 'Price hit lower grid band $138.5. Executed Grid BUY #4', type: 'trade' }
      ]
    }
  ]);

  const [newBotSymbol, setNewBotSymbol] = useState('BTC/USD');
  const [newBotName, setNewBotName] = useState('New Quant Trading Bot');

  const handleCreateBot = () => {
    const newBot: QuantBot = {
      id: `bot-${Date.now()}`,
      name: newBotName,
      symbol: newBotSymbol,
      strategyId: 'strat-sma-cross',
      timeframe: '1h',
      status: 'running',
      allocatedCapital: 10000,
      currentPnL: 0,
      totalTrades: 0,
      winningTrades: 0,
      startedAt: Date.now(),
      logs: [{ timestamp: new Date().toLocaleTimeString(), message: 'Bot deployed and started listening to market tick feed', type: 'info' }],
    };
    setBots(prev => [newBot, ...prev]);
  };

  const toggleBotStatus = (id: string) => {
    setBots(prev => prev.map(b => 
      b.id === id ? { ...b, status: b.status === 'running' ? 'paused' : 'running' } : b
    ));
  };

  const deleteBot = (id: string) => {
    setBots(prev => prev.filter(b => b.id !== id));
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header & Create Bot Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-mono">Automated Quant Trading Bots Control Center</h2>
            <p className="text-xs text-slate-400">Deploy background algorithmic bots that monitor ticks and execute automated paper trades</p>
          </div>
        </div>

        {/* Deploy New Bot Inline Bar */}
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newBotName}
            onChange={e => setNewBotName(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
            placeholder="Bot Name..."
          />
          <select
            value={newBotSymbol}
            onChange={e => setNewBotSymbol(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
          >
            {assets.map(a => (
              <option key={a.symbol} value={a.symbol}>{a.symbol}</option>
            ))}
          </select>
          <button
            onClick={handleCreateBot}
            className="px-3.5 py-1.5 bg-cyan-500 text-slate-950 font-bold font-mono text-xs rounded-lg flex items-center space-x-1 hover:bg-cyan-400 transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>DEPLOY BOT</span>
          </button>
        </div>
      </div>

      {/* Active Bots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {bots.map(bot => {
          const isRunning = bot.status === 'running';
          const isProfit = bot.currentPnL >= 0;

          return (
            <div key={bot.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                  <h3 className="font-bold text-white text-sm font-mono">{bot.name}</h3>
                  <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-cyan-400 font-mono">
                    {bot.symbol}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleBotStatus(bot.id)}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold flex items-center space-x-1 transition-colors ${
                      isRunning 
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500 hover:text-slate-950'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-slate-950'
                    }`}
                  >
                    {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
                    <span>{isRunning ? 'PAUSE' : 'START'}</span>
                  </button>

                  <button
                    onClick={() => deleteBot(bot.id)}
                    className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono">
                <div>
                  <span className="text-slate-500 text-[10px] block">TOTAL PnL</span>
                  <span className={`font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isProfit ? '+' : ''}${bot.currentPnL.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">WIN RATE</span>
                  <span className="text-cyan-400 font-bold">
                    {bot.totalTrades > 0 ? ((bot.winningTrades / bot.totalTrades) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">CAPITAL</span>
                  <span className="text-white font-bold">${bot.allocatedCapital.toLocaleString()}</span>
                </div>
              </div>

              {/* Bot Logs Feed */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1.5 max-h-32 overflow-y-auto">
                <div className="text-slate-500 text-[10px] uppercase font-bold flex items-center space-x-1 mb-1">
                  <Activity className="w-3 h-3 text-cyan-400" />
                  <span>Real-time Bot Event Log</span>
                </div>
                {bot.logs.map((log, idx) => (
                  <div key={idx} className="flex justify-between text-slate-300">
                    <span className="text-slate-500 mr-2">[{log.timestamp}]</span>
                    <span className={log.type === 'trade' ? 'text-emerald-400 font-bold' : 'text-slate-300'}>{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
