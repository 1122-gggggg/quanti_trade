import React from 'react';
import { useTrading } from '../../context/TradingContext';
import { TrendingUp, TrendingDown, RefreshCw, Download } from 'lucide-react';

export const PositionsTable: React.FC = () => {
  const { portfolio, closePosition, resetPortfolio, orders } = useTrading();
  const { positions } = portfolio;

  const exportCSV = () => {
    let csv = 'Order ID,Symbol,Side,Type,Amount,Price,Total,Status,Timestamp\n';
    orders.forEach(o => {
      csv += `${o.id},${o.symbol},${o.side},${o.type},${o.amount},${o.price},${o.total},${o.status},${new Date(o.timestamp).toISOString()}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trading-history-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <h3 className="font-bold text-white text-sm font-mono">Open Leveraged Positions</h3>
          <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-mono font-bold">
            {positions.length}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={exportCSV}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-cyan-400 font-mono transition-colors"
          >
            <Download className="w-3 h-3" />
            <span>Export CSV</span>
          </button>
          
          <button
            onClick={() => {
              if (confirm('Are you sure you want to reset your paper portfolio balance back to $100,000 USD?')) {
                resetPortfolio();
              }
            }}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-400 hover:text-white font-mono transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {positions.length === 0 ? (
        <div className="text-center py-10 text-slate-500 font-mono text-xs">
          No open positions. Select an asset and use the Execution Terminal to open a paper trade.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                <th className="pb-2">ASSET</th>
                <th className="pb-2">SIDE</th>
                <th className="pb-2">LEV</th>
                <th className="pb-2">QTY</th>
                <th className="pb-2">ENTRY</th>
                <th className="pb-2">MARK</th>
                <th className="pb-2">TP / SL</th>
                <th className="pb-2">UNREALIZED PnL</th>
                <th className="pb-2 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {positions.map(pos => {
                const isPositive = pos.unrealizedPnL >= 0;
                return (
                  <tr key={pos.id} className="hover:bg-slate-950/50 transition-colors">
                    <td className="py-3 font-bold text-white">{pos.symbol}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          pos.side === 'buy'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {pos.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 text-cyan-400 font-bold">{pos.leverage}x</td>
                    <td className="py-3 text-slate-200">{pos.amount}</td>
                    <td className="py-3 text-slate-300">${pos.entryPrice.toLocaleString()}</td>
                    <td className="py-3 font-bold text-white">${pos.currentPrice.toLocaleString()}</td>
                    <td className="py-3 text-[11px] text-slate-400">
                      <div>
                        {pos.takeProfit ? <span className="text-emerald-400">TP: ${pos.takeProfit}</span> : 'TP: -'}
                      </div>
                      <div>
                        {pos.stopLoss ? <span className="text-rose-400">SL: ${pos.stopLoss}</span> : 'SL: -'}
                      </div>
                    </td>
                    <td className={`py-3 font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      <div className="flex items-center">
                        {isPositive ? <TrendingUp className="w-3.5 h-3.5 mr-1" /> : <TrendingDown className="w-3.5 h-3.5 mr-1" />}
                        {isPositive ? '+' : ''}${pos.unrealizedPnL.toFixed(2)} ({pos.unrealizedPnLPercent.toFixed(2)}%)
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => closePosition(pos.id)}
                        className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 font-bold transition-all"
                      >
                        CLOSE
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
