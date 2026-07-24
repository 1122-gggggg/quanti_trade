import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { ArrowUpCircle, ArrowDownCircle, ShieldAlert, Zap, Sliders, Target } from 'lucide-react';

export const OrderForm: React.FC = () => {
  const { activeAsset, portfolio, placeOrder } = useTrading();
  
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState<number>(1);
  const [leverage, setLeverage] = useState<number>(1);
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');

  const totalCost = (amount * activeAsset.price) / leverage;
  const isBuy = side === 'buy';

  const handleExecute = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      alert('Please enter a valid amount!');
      return;
    }

    const tpVal = takeProfit ? parseFloat(takeProfit) : undefined;
    const slVal = stopLoss ? parseFloat(stopLoss) : undefined;

    placeOrder(
      activeAsset.symbol, 
      side, 
      amount, 
      undefined, 
      leverage, 
      tpVal, 
      slVal
    );
  };

  const handlePercentageQuickSelect = (pct: number) => {
    if (activeAsset.price <= 0) return;
    const availableCash = portfolio.cashBalance * pct * leverage;
    const calculatedAmount = availableCash / activeAsset.price;
    setAmount(Number(calculatedAmount.toFixed(4)));
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col justify-between h-full font-sans">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-white text-sm">Execution Terminal</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Avail: <strong className="text-white">${portfolio.cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
          </span>
        </div>

        {/* Buy / Sell Side Selector */}
        <div className="grid grid-cols-2 gap-2 mb-4 p-1 bg-slate-950 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setSide('buy')}
            className={`py-2 rounded-md text-xs font-bold font-mono flex items-center justify-center space-x-1 transition-all ${
              isBuy
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowUpCircle className="w-4 h-4" />
            <span>BUY / LONG</span>
          </button>
          <button
            type="button"
            onClick={() => setSide('sell')}
            className={`py-2 rounded-md text-xs font-bold font-mono flex items-center justify-center space-x-1 transition-all ${
              !isBuy
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span>SELL / SHORT</span>
          </button>
        </div>

        <form onSubmit={handleExecute} className="space-y-3">
          {/* Asset & Current Price */}
          <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs font-mono">
            <span className="text-slate-400">Market Price:</span>
            <span className="text-white font-bold text-sm">
              ${activeAsset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Leverage Selector */}
          <div>
            <label className="block text-xs text-slate-400 font-medium mb-1 flex justify-between font-mono">
              <span className="flex items-center"><Sliders className="w-3 h-3 mr-1 text-cyan-400" /> Leverage Multiplier</span>
              <span className="text-cyan-400 font-bold">{leverage}x</span>
            </label>
            <div className="grid grid-cols-5 gap-1">
              {[1, 2, 5, 10, 20].map(lev => (
                <button
                  key={lev}
                  type="button"
                  onClick={() => setLeverage(lev)}
                  className={`py-1 rounded text-xs font-mono font-bold transition-all ${
                    leverage === lev
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {lev}x
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs text-slate-400 font-medium mb-1 flex justify-between">
              <span>Order Amount ({activeAsset.symbol.split('/')[0]})</span>
              <span className="font-mono text-slate-500">Min: 0.0001</span>
            </label>
            <input
              type="number"
              step="any"
              min="0.0001"
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
              placeholder="Enter quantity..."
            />
          </div>

          {/* Quick % Selector Buttons */}
          <div className="grid grid-cols-4 gap-1.5">
            {[0.25, 0.50, 0.75, 1.0].map(pct => (
              <button
                key={pct}
                type="button"
                onClick={() => handlePercentageQuickSelect(pct)}
                className="py-1 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-colors"
              >
                {pct * 100}%
              </button>
            ))}
          </div>

          {/* TP / SL Inputs */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="block text-[11px] text-emerald-400 font-mono mb-1 flex items-center">
                <Target className="w-3 h-3 mr-1" /> Take Profit $
              </label>
              <input
                type="number"
                step="any"
                value={takeProfit}
                onChange={e => setTakeProfit(e.target.value)}
                placeholder={(activeAsset.price * 1.05).toFixed(2)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-rose-400 font-mono mb-1 flex items-center">
                <Target className="w-3 h-3 mr-1" /> Stop Loss $
              </label>
              <input
                type="number"
                step="any"
                value={stopLoss}
                onChange={e => setStopLoss(e.target.value)}
                placeholder={(activeAsset.price * 0.95).toFixed(2)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-white font-mono text-xs focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Total Value calculation */}
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 space-y-1 text-xs font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Required Margin:</span>
              <span className="text-cyan-400 font-bold">${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Est. Fee (0.05%):</span>
              <span className="text-slate-400">${(totalCost * 0.0005).toFixed(2)}</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`w-full py-2.5 rounded-lg font-bold font-mono text-xs tracking-wide transition-all shadow-lg ${
              isBuy
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:from-emerald-400 hover:to-teal-400 shadow-emerald-500/20'
                : 'bg-gradient-to-r from-rose-600 to-red-600 text-white hover:from-rose-500 hover:to-red-500 shadow-rose-600/20'
            }`}
          >
            {isBuy ? `BUY ${activeAsset.symbol}` : `SELL ${activeAsset.symbol}`} ({leverage}x)
          </button>
        </form>
      </div>

      <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-center space-x-1 font-mono">
        <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
        <span>Leveraged Paper Trading Mode</span>
      </div>
    </div>
  );
};
