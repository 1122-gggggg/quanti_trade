import type { Candle, StrategyConfig } from '../types/trading';
import { runBacktest } from './backtester';
import { calculateInstitutionalMetrics } from './quantEngine';

export interface ExplorationCandidate {
  id: string;
  strategyName: string;
  config: StrategyConfig;
  totalReturnPct: number;
  cagrPct: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdownPct: number;
  winRatePct: number;
  profitFactor: number;
  passedVerification: boolean;
  score: number;
  verificationDetails: {
    sharpePass: boolean;
    drawdownPass: boolean;
    profitFactorPass: boolean;
    winRatePass: boolean;
  };
}

/**
 * Autonomous Strategy Space Explorer & Multi-Param Grid Search Engine
 */
export function exploreProfitableStrategies(
  candles: Candle[],
  symbol: string
): ExplorationCandidate[] {
  const candidates: ExplorationCandidate[] = [];

  // Parameter Grid Exploration Space
  const fastPeriods = [5, 9, 12, 15, 20];
  const slowPeriods = [21, 34, 50, 80, 100];
  const rsiLows = [25, 30, 35];
  const rsiHighs = [65, 70, 75];
  const stopLosses = [1.5, 2.0, 3.0, 4.0];
  const takeProfits = [4.0, 6.0, 8.0, 10.0];

  let idCounter = 1;

  // 1. Grid Search: SMA Crossover Variants
  for (const fast of fastPeriods) {
    for (const slow of slowPeriods) {
      if (fast >= slow) continue;
      for (const sl of stopLosses) {
        for (const tp of takeProfits) {
          const config: StrategyConfig = {
            strategy: 'SMA_CROSSOVER',
            fastPeriod: fast,
            slowPeriod: slow,
            rsiThresholdLow: 30,
            rsiThresholdHigh: 70,
            stopLossPercent: sl,
            takeProfitPercent: tp,
            initialCapital: 10000,
          };

          const backtest = runBacktest(candles, config, symbol);
          if (backtest.totalTrades < 5) continue;

          const metrics = calculateInstitutionalMetrics(
            candles,
            backtest.trades,
            10000,
            backtest.finalEquity
          );

          // Gate Rules for Long-term Profitability:
          // Sharpe > 1.1, Max Drawdown < 18%, Profit Factor > 1.35, Win Rate > 45%
          const sharpePass = metrics.sharpeRatio >= 1.1;
          const drawdownPass = metrics.maxDrawdownPct <= 18.0;
          const profitFactorPass = metrics.profitFactor >= 1.35;
          const winRatePass = metrics.winRatePct >= 45.0;

          const passedVerification = sharpePass && drawdownPass && profitFactorPass && winRatePass;

          // Composite Performance Score
          const score = Number((
            (metrics.totalReturnPct * 0.3) + 
            (metrics.sharpeRatio * 20) + 
            (metrics.profitFactor * 15) - 
            (metrics.maxDrawdownPct * 1.5)
          ).toFixed(2));

          candidates.push({
            id: `exp-${idCounter++}`,
            strategyName: `Adaptive Golden Cross (SMA ${fast}/${slow}, SL:${sl}%, TP:${tp}%)`,
            config,
            totalReturnPct: metrics.totalReturnPct,
            cagrPct: metrics.cagrPct,
            sharpeRatio: metrics.sharpeRatio,
            sortinoRatio: metrics.sortinoRatio,
            maxDrawdownPct: metrics.maxDrawdownPct,
            winRatePct: metrics.winRatePct,
            profitFactor: metrics.profitFactor,
            passedVerification,
            score,
            verificationDetails: { sharpePass, drawdownPass, profitFactorPass, winRatePass },
          });
        }
      }
    }
  }

  // 2. Grid Search: RSI Mean Reversion Variants
  for (const rsiLow of rsiLows) {
    for (const rsiHigh of rsiHighs) {
      for (const sl of [2.0, 3.0]) {
        for (const tp of [4.0, 6.0]) {
          const config: StrategyConfig = {
            strategy: 'RSI_REVERSAL',
            fastPeriod: 9,
            slowPeriod: 21,
            rsiThresholdLow: rsiLow,
            rsiThresholdHigh: rsiHigh,
            stopLossPercent: sl,
            takeProfitPercent: tp,
            initialCapital: 10000,
          };

          const backtest = runBacktest(candles, config, symbol);
          if (backtest.totalTrades < 5) continue;

          const metrics = calculateInstitutionalMetrics(
            candles,
            backtest.trades,
            10000,
            backtest.finalEquity
          );

          const sharpePass = metrics.sharpeRatio >= 1.1;
          const drawdownPass = metrics.maxDrawdownPct <= 18.0;
          const profitFactorPass = metrics.profitFactor >= 1.35;
          const winRatePass = metrics.winRatePct >= 45.0;

          const passedVerification = sharpePass && drawdownPass && profitFactorPass && winRatePass;

          const score = Number((
            (metrics.totalReturnPct * 0.3) + 
            (metrics.sharpeRatio * 20) + 
            (metrics.profitFactor * 15) - 
            (metrics.maxDrawdownPct * 1.5)
          ).toFixed(2));

          candidates.push({
            id: `exp-${idCounter++}`,
            strategyName: `RSI Mean Reversion (RSI ${rsiLow}/${rsiHigh}, SL:${sl}%, TP:${tp}%)`,
            config,
            totalReturnPct: metrics.totalReturnPct,
            cagrPct: metrics.cagrPct,
            sharpeRatio: metrics.sharpeRatio,
            sortinoRatio: metrics.sortinoRatio,
            maxDrawdownPct: metrics.maxDrawdownPct,
            winRatePct: metrics.winRatePct,
            profitFactor: metrics.profitFactor,
            passedVerification,
            score,
            verificationDetails: { sharpePass, drawdownPass, profitFactorPass, winRatePass },
          });
        }
      }
    }
  }

  // Sort candidates by highest score
  return candidates.sort((a, b) => b.score - a.score);
}
