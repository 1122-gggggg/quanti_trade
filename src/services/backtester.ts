import type { Candle, StrategyConfig, BacktestResult, BacktestTrade } from '../types/trading';
import { calculateSMA, calculateRSI, calculateBollingerBands } from './technicalIndicators';

export function runBacktest(
  candles: Candle[],
  config: StrategyConfig,
  symbol: string
): BacktestResult {
  const closes = candles.map(c => c.close);
  const fastMA = calculateSMA(closes, config.fastPeriod);
  const slowMA = calculateSMA(closes, config.slowPeriod);
  const rsi = calculateRSI(candles, 14);
  const bb = calculateBollingerBands(closes, 20, 2);

  let cash = config.initialCapital;
  let holdings = 0;
  let entryPrice = 0;
  let entryTime = '';
  
  const trades: BacktestTrade[] = [];
  const equityCurve: { time: string; equity: number }[] = [];
  
  let maxEquity = config.initialCapital;
  let maxDrawdownPct = 0;

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const dateStr = new Date(candle.time * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
    });

    const currentPrice = candle.close;
    
    // Check existing position for Stop-loss / Take-profit
    if (holdings > 0) {
      const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;
      
      let exitReason: 'Signal' | 'StopLoss' | 'TakeProfit' | null = null;
      if (config.stopLossPercent > 0 && pnlPct <= -config.stopLossPercent) {
        exitReason = 'StopLoss';
      } else if (config.takeProfitPercent > 0 && pnlPct >= config.takeProfitPercent) {
        exitReason = 'TakeProfit';
      }

      if (exitReason) {
        const proceeds = holdings * currentPrice;
        const pnl = proceeds - (holdings * entryPrice);
        cash += proceeds;

        trades.push({
          entryTime,
          exitTime: dateStr,
          symbol,
          side: 'sell',
          entryPrice,
          exitPrice: currentPrice,
          amount: holdings,
          pnl: Number(pnl.toFixed(2)),
          pnlPercent: Number(pnlPct.toFixed(2)),
          reason: exitReason,
        });

        holdings = 0;
      }
    }

    // Strategy Signal Check
    let buySignal = false;
    let sellSignal = false;

    if (i > Math.max(config.fastPeriod, config.slowPeriod)) {
      if (config.strategy === 'SMA_CROSSOVER') {
        const prevFast = fastMA[i - 1];
        const prevSlow = slowMA[i - 1];
        const currFast = fastMA[i];
        const currSlow = slowMA[i];
        
        if (prevFast !== null && prevSlow !== null && currFast !== null && currSlow !== null) {
          if (prevFast <= prevSlow && currFast > currSlow) buySignal = true;
          if (prevFast >= prevSlow && currFast < currSlow) sellSignal = true;
        }
      } else if (config.strategy === 'RSI_REVERSAL') {
        const currRSI = rsi[i];
        if (currRSI !== null) {
          if (currRSI < config.rsiThresholdLow) buySignal = true;
          if (currRSI > config.rsiThresholdHigh) sellSignal = true;
        }
      } else if (config.strategy === 'BOLLINGER_BREAKOUT') {
        const lower = bb.lower[i];
        const upper = bb.upper[i];
        if (lower !== null && upper !== null) {
          if (currentPrice <= lower) buySignal = true;
          if (currentPrice >= upper) sellSignal = true;
        }
      }
    }

    // Execute Buy
    if (buySignal && holdings === 0 && cash > 0) {
      entryPrice = currentPrice;
      entryTime = dateStr;
      holdings = cash / currentPrice;
      cash = 0;
    } 
    // Execute Sell (Signal based)
    else if (sellSignal && holdings > 0) {
      const proceeds = holdings * currentPrice;
      const pnl = proceeds - (holdings * entryPrice);
      const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;
      cash += proceeds;

      trades.push({
        entryTime,
        exitTime: dateStr,
        symbol,
        side: 'sell',
        entryPrice,
        exitPrice: currentPrice,
        amount: holdings,
        pnl: Number(pnl.toFixed(2)),
        pnlPercent: Number(pnlPct.toFixed(2)),
        reason: 'Signal',
      });

      holdings = 0;
    }

    const currentEquity = cash + (holdings * currentPrice);
    if (currentEquity > maxEquity) maxEquity = currentEquity;
    const drawdown = ((maxEquity - currentEquity) / maxEquity) * 100;
    if (drawdown > maxDrawdownPct) maxDrawdownPct = drawdown;

    equityCurve.push({
      time: dateStr,
      equity: Number(currentEquity.toFixed(2)),
    });
  }

  // Force close remaining open position at backtest end
  if (holdings > 0) {
    const lastCandle = candles[candles.length - 1];
    const lastPrice = lastCandle.close;
    const dateStr = new Date(lastCandle.time * 1000).toLocaleDateString();
    const proceeds = holdings * lastPrice;
    const pnl = proceeds - (holdings * entryPrice);
    const pnlPct = ((lastPrice - entryPrice) / entryPrice) * 100;
    cash += proceeds;

    trades.push({
      entryTime,
      exitTime: dateStr,
      symbol,
      side: 'sell',
      entryPrice,
      exitPrice: lastPrice,
      amount: holdings,
      pnl: Number(pnl.toFixed(2)),
      pnlPercent: Number(pnlPct.toFixed(2)),
      reason: 'Signal',
    });
  }

  const finalEquity = cash;
  const totalReturnPct = ((finalEquity - config.initialCapital) / config.initialCapital) * 100;
  
  const winningTrades = trades.filter(t => t.pnl > 0).length;
  const losingTrades = trades.filter(t => t.pnl <= 0).length;
  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  const totalWinsPnL = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
  const totalLossesPnL = Math.abs(trades.filter(t => t.pnl <= 0).reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = totalLossesPnL > 0 ? totalWinsPnL / totalLossesPnL : totalWinsPnL > 0 ? 99 : 0;

  // Simple Sharpe Ratio estimation
  const returns = trades.map(t => t.pnlPercent);
  const avgReturn = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const variance = returns.length ? returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length : 0;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(12) : 0;

  return {
    strategyName: config.strategy.replace('_', ' '),
    totalTrades,
    winningTrades,
    losingTrades,
    winRate: Number(winRate.toFixed(1)),
    totalReturnPct: Number(totalReturnPct.toFixed(2)),
    maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
    sharpeRatio: Number(sharpeRatio.toFixed(2)),
    profitFactor: Number(profitFactor.toFixed(2)),
    finalEquity: Number(finalEquity.toFixed(2)),
    trades,
    equityCurve,
  };
}
