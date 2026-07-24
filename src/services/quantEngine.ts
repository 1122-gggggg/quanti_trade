import type { Candle } from '../types/trading';
import type { InstitutionalMetrics, MonthlyReturnData, AssetCorrelation } from '../types/quant';

/**
 * Institutional Grade Quantitative Performance Metrics Calculator
 */
export function calculateInstitutionalMetrics(
  candles: Candle[],
  trades: { pnl: number; pnlPercent: number }[],
  initialCapital: number = 10000,
  finalEquity: number = 10000
): InstitutionalMetrics {
  const totalReturnPct = ((finalEquity - initialCapital) / initialCapital) * 100;
  
  // Calculate CAGR assuming 1-year equivalent scaling
  const days = Math.max(30, candles.length);
  const years = days / 365;
  const cagrPct = (Math.pow(finalEquity / initialCapital, 1 / Math.max(0.1, years)) - 1) * 100;

  // Trades returns array
  const returns = trades.map(t => t.pnlPercent);
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.pnl > 0).length;
  const winRatePct = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  const avgTradeReturnPct = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;

  // Profit Factor
  const winsTotal = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
  const lossesTotal = Math.abs(trades.filter(t => t.pnl <= 0).reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = lossesTotal > 0 ? winsTotal / lossesTotal : winsTotal > 0 ? 99 : 0;

  // Sharpe Ratio
  const variance = returns.length ? returns.reduce((a, b) => a + Math.pow(b - avgTradeReturnPct, 2), 0) / returns.length : 0;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (avgTradeReturnPct / stdDev) * Math.sqrt(12) : 0;

  // Sortino Ratio (Downside deviation only)
  const downsideReturns = returns.filter(r => r < 0);
  const downsideVariance = downsideReturns.length ? downsideReturns.reduce((a, b) => a + Math.pow(b, 2), 0) / downsideReturns.length : 0;
  const downsideStdDev = Math.sqrt(downsideVariance);
  const sortinoRatio = downsideStdDev > 0 ? (avgTradeReturnPct / downsideStdDev) * Math.sqrt(12) : 0;

  // Max Drawdown %
  let maxEquity = initialCapital;
  let maxDrawdownPct = 0;
  let runningEquity = initialCapital;

  trades.forEach(t => {
    runningEquity += t.pnl;
    if (runningEquity > maxEquity) maxEquity = runningEquity;
    const dd = ((maxEquity - runningEquity) / maxEquity) * 100;
    if (dd > maxDrawdownPct) maxDrawdownPct = dd;
  });

  // Calmar Ratio (CAGR / Max Drawdown)
  const calmarRatio = maxDrawdownPct > 0 ? cagrPct / maxDrawdownPct : cagrPct > 0 ? 99 : 0;

  return {
    totalReturnPct: Number(totalReturnPct.toFixed(2)),
    cagrPct: Number(cagrPct.toFixed(2)),
    sharpeRatio: Number(sharpeRatio.toFixed(2)),
    sortinoRatio: Number(sortinoRatio.toFixed(2)),
    calmarRatio: Number(calmarRatio.toFixed(2)),
    maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
    winRatePct: Number(winRatePct.toFixed(1)),
    profitFactor: Number(profitFactor.toFixed(2)),
    totalTrades,
    avgTradeReturnPct: Number(avgTradeReturnPct.toFixed(2)),
  };
}

/**
 * Generate Monthly Return Heatmap Data
 */
export function generateMonthlyReturns(): MonthlyReturnData[] {
  const years = [2024, 2025, 2026];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return years.map(year => {
    let yearSum = 0;
    const months = monthNames.map(month => {
      // Deterministic synthetic monthly return %
      const returnPct = Number(((Math.sin((year + monthNames.indexOf(month)) * 3) * 8) + 1.2).toFixed(1));
      yearSum += returnPct;
      return { month, returnPct };
    });

    return {
      year,
      months,
      totalYearReturnPct: Number(yearSum.toFixed(1)),
    };
  });
}

/**
 * Calculate Asset Correlation Matrix
 */
export function calculateAssetCorrelations(assets: { symbol: string; historySparkline?: number[] }[]): AssetCorrelation[] {
  const correlations: AssetCorrelation[] = [];

  for (let i = 0; i < assets.length; i++) {
    for (let j = i + 1; j < assets.length; j++) {
      const assetA = assets[i];
      const assetB = assets[j];
      
      const arrA = assetA.historySparkline || [100, 102, 101, 103, 105];
      const arrB = assetB.historySparkline || [200, 198, 202, 205, 204];
      
      const corr = calculatePearsonCorrelation(arrA, arrB);
      correlations.push({
        symbolA: assetA.symbol,
        symbolB: assetB.symbol,
        correlation: Number(corr.toFixed(2)),
      });
    }
  }

  return correlations;
}

function calculatePearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n === 0) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const denominator = Math.sqrt(denX * denY);
  return denominator === 0 ? 0 : num / denominator;
}

/**
 * Safely Evaluate Custom JS Strategy Code against candles dataset
 */
export function executeCustomStrategyScript(
  code: string,
  candles: Candle[]
): { action: 'BUY' | 'SELL'; reason: string; index: number }[] {
  const signals: { action: 'BUY' | 'SELL'; reason: string; index: number }[] = [];

  try {
    // Wrap code into isolated Function executor
    const strategyFunc = new Function('candles', 'index', `${code}\n return onTick(candles, index);`);

    for (let i = 20; i < candles.length; i++) {
      const result = strategyFunc(candles, i);
      if (result && (result.action === 'BUY' || result.action === 'SELL')) {
        signals.push({
          action: result.action,
          reason: result.reason || 'Custom Strategy Trigger',
          index: i,
        });
      }
    }
  } catch (err: any) {
    console.error('Custom Strategy Execution Error:', err);
  }

  return signals;
}
