import type { BacktestResult, BacktestTrade, Candle, StrategyConfig } from '../types/trading';
import { calculateBollingerBands, calculateRSI, calculateSMA } from './technicalIndicators';

interface OpenPosition {
  entryPrice: number;
  entryTime: string;
  entryIndex: number;
  quantity: number;
  entryFee: number;
  stopPrice: number | null;
  takeProfitPrice: number | null;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number, digits = 2) => Number(value.toFixed(digits));

function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

function validateCandles(candles: Candle[]): Candle[] {
  return candles
    .filter(c => Number.isFinite(c.time) && Number.isFinite(c.open) && Number.isFinite(c.high)
      && Number.isFinite(c.low) && Number.isFinite(c.close) && Number.isFinite(c.volume)
      && c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0
      && c.high >= Math.max(c.open, c.close) && c.low <= Math.min(c.open, c.close))
    .sort((a, b) => a.time - b.time)
    .filter((candle, index, sorted) => index === 0 || candle.time > sorted[index - 1].time);
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function runBacktest(
  rawCandles: Candle[],
  config: StrategyConfig,
  symbol: string,
): BacktestResult {
  const candles = validateCandles(rawCandles);
  if (candles.length < 3 || config.initialCapital <= 0) {
    return emptyResult(config, candles, symbol);
  }

  const commissionRate = Math.max(0, config.commissionPercent ?? 0.1) / 100;
  const slippageRate = Math.max(0, config.slippagePercent ?? 0.05) / 100;
  const positionSize = clamp(config.positionSizePercent ?? 100, 0, 100) / 100;
  const annualizationPeriods = Math.max(1, config.annualizationPeriods ?? 252);
  const riskFreePerPeriod = ((config.riskFreeRatePercent ?? 0) / 100) / annualizationPeriods;
  const fillPolicy = config.intrabarFillPolicy ?? 'stop_first';

  const closes = candles.map(candle => candle.close);
  const fastMA = calculateSMA(closes, Math.max(1, config.fastPeriod));
  const slowMA = calculateSMA(closes, Math.max(2, config.slowPeriod));
  const rsi = calculateRSI(candles, 14);
  const bands = calculateBollingerBands(closes, 20, 2);

  let cash = config.initialCapital;
  let position: OpenPosition | null = null;
  let pendingAction: 'buy' | 'sell' | null = null;
  let maxEquity = config.initialCapital;
  let maxDrawdownPct = 0;
  let totalFees = 0;
  let investedBars = 0;

  const trades: BacktestTrade[] = [];
  const equityCurve: { time: string; equity: number }[] = [];
  const periodReturns: number[] = [];
  let previousEquity = config.initialCapital;

  const closePosition = (
    candle: Candle,
    rawExitPrice: number,
    reason: BacktestTrade['reason'],
    index: number,
  ) => {
    if (!position) return;

    const exitPrice = rawExitPrice * (1 - slippageRate);
    const grossProceeds = position.quantity * exitPrice;
    const exitFee = grossProceeds * commissionRate;
    const grossPnl = position.quantity * (exitPrice - position.entryPrice);
    const netPnl = grossPnl - position.entryFee - exitFee;
    const investedCapital = (position.quantity * position.entryPrice) + position.entryFee;

    cash += grossProceeds - exitFee;
    totalFees += exitFee;
    trades.push({
      entryTime: position.entryTime,
      exitTime: formatTime(candle.time),
      symbol,
      side: 'sell',
      entryPrice: round(position.entryPrice, 6),
      exitPrice: round(exitPrice, 6),
      amount: round(position.quantity, 8),
      grossPnl: round(grossPnl),
      fees: round(position.entryFee + exitFee),
      pnl: round(netPnl),
      pnlPercent: round(investedCapital > 0 ? (netPnl / investedCapital) * 100 : 0),
      barsHeld: Math.max(1, index - position.entryIndex),
      reason,
    });
    position = null;
  };

  for (let index = 0; index < candles.length; index += 1) {
    const candle = candles[index];

    // Signals generated on the previous close are filled at this bar's open.
    if (pendingAction === 'sell' && position) {
      closePosition(candle, candle.open, 'Signal', index);
    } else if (pendingAction === 'buy' && !position && cash > 0 && positionSize > 0) {
      const entryPrice = candle.open * (1 + slippageRate);
      const budget = cash * positionSize;
      const quantity = budget / (entryPrice * (1 + commissionRate));
      const notional = quantity * entryPrice;
      const entryFee = notional * commissionRate;

      if (quantity > 0 && notional + entryFee <= cash) {
        cash -= notional + entryFee;
        totalFees += entryFee;
        position = {
          entryPrice,
          entryTime: formatTime(candle.time),
          entryIndex: index,
          quantity,
          entryFee,
          stopPrice: config.stopLossPercent > 0
            ? entryPrice * (1 - config.stopLossPercent / 100)
            : null,
          takeProfitPrice: config.takeProfitPercent > 0
            ? entryPrice * (1 + config.takeProfitPercent / 100)
            : null,
        };
      }
    }
    pendingAction = null;

    // OHLC-aware exits. When both levels occur in one candle, use an explicit policy.
    if (position) {
      investedBars += 1;
      const stopHit = position.stopPrice !== null && candle.low <= position.stopPrice;
      const takeProfitHit = position.takeProfitPrice !== null && candle.high >= position.takeProfitPrice;

      if (stopHit && takeProfitHit) {
        if (fillPolicy === 'take_profit_first') {
          closePosition(candle, position.takeProfitPrice!, 'TakeProfit', index);
        } else {
          closePosition(candle, position.stopPrice!, 'StopLoss', index);
        }
      } else if (stopHit) {
        closePosition(candle, position.stopPrice!, 'StopLoss', index);
      } else if (takeProfitHit) {
        closePosition(candle, position.takeProfitPrice!, 'TakeProfit', index);
      }
    }

    const equity = cash + (position ? position.quantity * candle.close : 0);
    maxEquity = Math.max(maxEquity, equity);
    maxDrawdownPct = Math.max(maxDrawdownPct, maxEquity > 0 ? ((maxEquity - equity) / maxEquity) * 100 : 0);
    equityCurve.push({ time: formatTime(candle.time), equity: round(equity) });

    if (previousEquity > 0) periodReturns.push((equity / previousEquity) - 1);
    previousEquity = equity;

    if (index >= candles.length - 1) continue;

    let buySignal = false;
    let sellSignal = false;
    if (index > Math.max(config.fastPeriod, config.slowPeriod)) {
      if (config.strategy === 'SMA_CROSSOVER') {
        const previousFast = fastMA[index - 1];
        const previousSlow = slowMA[index - 1];
        const currentFast = fastMA[index];
        const currentSlow = slowMA[index];
        if (previousFast !== null && previousSlow !== null && currentFast !== null && currentSlow !== null) {
          buySignal = previousFast <= previousSlow && currentFast > currentSlow;
          sellSignal = previousFast >= previousSlow && currentFast < currentSlow;
        }
      } else if (config.strategy === 'RSI_REVERSAL') {
        const currentRsi = rsi[index];
        buySignal = currentRsi !== null && currentRsi < config.rsiThresholdLow;
        sellSignal = currentRsi !== null && currentRsi > config.rsiThresholdHigh;
      } else if (config.strategy === 'BOLLINGER_BREAKOUT') {
        const lower = bands.lower[index];
        const upper = bands.upper[index];
        buySignal = lower !== null && candle.close <= lower;
        sellSignal = upper !== null && candle.close >= upper;
      }
    }

    if (position && sellSignal) pendingAction = 'sell';
    if (!position && buySignal) pendingAction = 'buy';
  }

  if (position) {
    const lastIndex = candles.length - 1;
    const lastCandle = candles[lastIndex];
    closePosition(lastCandle, lastCandle.close, 'EndOfData', lastIndex);
    equityCurve[lastIndex] = { time: formatTime(lastCandle.time), equity: round(cash) };
  }

  const finalEquity = cash;
  const totalReturnPct = ((finalEquity / config.initialCapital) - 1) * 100;
  const benchmarkReturnPct = ((candles[candles.length - 1].close / candles[0].open) - 1) * 100;
  const winningTrades = trades.filter(trade => trade.pnl > 0).length;
  const losingTrades = trades.length - winningTrades;
  const grossProfit = trades.filter(trade => trade.pnl > 0).reduce((sum, trade) => sum + trade.pnl, 0);
  const grossLoss = Math.abs(trades.filter(trade => trade.pnl < 0).reduce((sum, trade) => sum + trade.pnl, 0));
  const excessReturns = periodReturns.map(value => value - riskFreePerPeriod);
  const downsideReturns = excessReturns.filter(value => value < 0);
  const meanExcess = excessReturns.length > 0
    ? excessReturns.reduce((sum, value) => sum + value, 0) / excessReturns.length
    : 0;
  const sharpeRatio = standardDeviation(excessReturns) > 0
    ? (meanExcess / standardDeviation(excessReturns)) * Math.sqrt(annualizationPeriods)
    : 0;
  const downsideDeviation = standardDeviation(downsideReturns);
  const sortinoRatio = downsideDeviation > 0
    ? (meanExcess / downsideDeviation) * Math.sqrt(annualizationPeriods)
    : 0;
  const years = Math.max(1 / annualizationPeriods, (candles.length - 1) / annualizationPeriods);
  const cagr = finalEquity > 0 ? ((finalEquity / config.initialCapital) ** (1 / years)) - 1 : -1;
  const calmarRatio = maxDrawdownPct > 0 ? cagr / (maxDrawdownPct / 100) : 0;

  return {
    strategyName: config.strategy.replaceAll('_', ' '),
    totalTrades: trades.length,
    winningTrades,
    losingTrades,
    winRate: round(trades.length > 0 ? (winningTrades / trades.length) * 100 : 0, 1),
    totalReturnPct: round(totalReturnPct),
    benchmarkReturnPct: round(benchmarkReturnPct),
    maxDrawdownPct: round(maxDrawdownPct),
    sharpeRatio: round(sharpeRatio),
    sortinoRatio: round(sortinoRatio),
    calmarRatio: round(calmarRatio),
    profitFactor: round(grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Number.POSITIVE_INFINITY : 0),
    finalEquity: round(finalEquity),
    feesPaid: round(totalFees),
    exposurePercent: round((investedBars / candles.length) * 100),
    trades,
    equityCurve,
  };
}

function emptyResult(config: StrategyConfig, candles: Candle[], _symbol: string): BacktestResult {
  const initialCapital = Math.max(0, config.initialCapital);
  return {
    strategyName: config.strategy.replaceAll('_', ' '),
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    totalReturnPct: 0,
    benchmarkReturnPct: candles.length > 1 ? round(((candles.at(-1)!.close / candles[0].open) - 1) * 100) : 0,
    maxDrawdownPct: 0,
    sharpeRatio: 0,
    sortinoRatio: 0,
    calmarRatio: 0,
    profitFactor: 0,
    finalEquity: initialCapital,
    feesPaid: 0,
    exposurePercent: 0,
    trades: [],
    equityCurve: candles.map(candle => ({ time: formatTime(candle.time), equity: initialCapital })),
  };
}
