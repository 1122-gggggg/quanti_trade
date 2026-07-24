import React from 'react';
import { useTrading } from '../../context/TradingContext';
import { Wallet, PieChart, DollarSign, Award } from 'lucide-react';

export const PortfolioSummary: React.FC = () => {
  const { portfolio } = useTrading();

  const totalPositionsValue = portfolio.positions.reduce(
    (sum, pos) => sum + pos.amount * pos.currentPrice,
    0
  );
  const totalUnrealizedPnL = portfolio.positions.reduce(
    (sum, pos) => sum + pos.unrealizedPnL,
    0
  );

  const totalEquity = portfolio.cashBalance + totalPositionsValue;
  const netPnL = totalEquity - portfolio.initialBalance;
  const netPnLPct = (netPnL / portfolio.initialBalance) * 100;

  const cashPct = (portfolio.cashBalance / totalEquity) * 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {/* Total Equity Pill */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-mono font-medium">TOTAL EQUITY</span>
          <Wallet className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="text-2xl font-bold font-mono text-white mb-1">
          ${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="flex items-center text-xs font-mono">
          <span className={netPnL >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
            {netPnL >= 0 ? '+' : ''}${netPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({netPnLPct.toFixed(2)}%)
          </span>
          <span className="text-slate-500 ml-1">all time</span>
        </div>
      </div>

      {/* Cash Balance */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-mono font-medium">AVAILABLE CASH</span>
          <DollarSign className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-2xl font-bold font-mono text-white mb-1">
          ${portfolio.cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-2">
          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, cashPct)}%` }} />
        </div>
      </div>

      {/* Unrealized PnL */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-mono font-medium">OPEN POSITIONS PnL</span>
          <PieChart className="w-4 h-4 text-indigo-400" />
        </div>
        <div className={`text-2xl font-bold font-mono mb-1 ${totalUnrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {totalUnrealizedPnL >= 0 ? '+' : ''}${totalUnrealizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
        <div className="text-xs text-slate-400 font-mono">
          Positions Value: <strong className="text-white">${totalPositionsValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
        </div>
      </div>

      {/* Realized PnL */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-mono font-medium font-sans">REALIZED PROFIT</span>
          <Award className="w-4 h-4 text-amber-400" />
        </div>
        <div className={`text-2xl font-bold font-mono mb-1 ${portfolio.realizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {portfolio.realizedPnL >= 0 ? '+' : ''}${portfolio.realizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
        <div className="text-xs text-slate-500 font-mono">
          Closed trades PnL accumulator
        </div>
      </div>
    </div>
  );
};
