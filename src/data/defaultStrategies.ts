import type { QuantStrategyScript } from '../types/quant';

export const DEFAULT_STRATEGY_SCRIPTS: QuantStrategyScript[] = [
  {
    id: 'strat-sma-cross',
    name: 'Dual Moving Average Crossover (雙均線交叉策略)',
    category: 'Trend Following',
    description: 'Golden Cross / Death Cross trend following algorithm using 9-period fast MA and 21-period slow MA.',
    code: `// Dual Moving Average Crossover Strategy Algorithm
// Param: fastPeriod = 9, slowPeriod = 21

function onTick(candles, index) {
  if (index < 21) return null; // Need at least 21 candles for slow MA

  const closes = candles.map(c => c.close);
  
  // Calculate fast MA (9)
  const fastSlice = closes.slice(index - 8, index + 1);
  const fastMA = fastSlice.reduce((a, b) => a + b, 0) / 9;

  // Calculate slow MA (21)
  const slowSlice = closes.slice(index - 20, index + 1);
  const slowMA = slowSlice.reduce((a, b) => a + b, 0) / 21;

  // Calculate previous MA
  const prevFastSlice = closes.slice(index - 9, index);
  const prevFastMA = prevFastSlice.reduce((a, b) => a + b, 0) / 9;

  const prevSlowSlice = closes.slice(index - 21, index);
  const prevSlowMA = prevSlowSlice.reduce((a, b) => a + b, 0) / 21;

  // Golden Cross: Buy Signal
  if (prevFastMA <= prevSlowMA && fastMA > slowMA) {
    return { action: 'BUY', reason: 'Golden Cross (Fast MA > Slow MA)' };
  }

  // Death Cross: Sell Signal
  if (prevFastMA >= prevSlowMA && fastMA < slowMA) {
    return { action: 'SELL', reason: 'Death Cross (Fast MA < Slow MA)' };
  }

  return null;
}`
  },
  {
    id: 'strat-rsi-reversion',
    name: 'RSI Mean Reversion (RSI 均值回歸量化策略)',
    category: 'Mean Reversion',
    description: 'Quantitative mean reversion strategy that buys oversold assets (RSI < 30) and sells overbought assets (RSI > 70).',
    code: `// RSI Mean Reversion Strategy
// Param: period = 14, lowerBound = 30, upperBound = 70

function onTick(candles, index) {
  if (index < 15) return null;

  const closes = candles.slice(0, index + 1).map(c => c.close);
  let gains = 0, losses = 0;

  for (let i = index - 13; i <= index; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  const avgGain = gains / 14;
  const avgLoss = losses / 14;
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  if (rsi < 30) {
    return { action: 'BUY', reason: \`Oversold RSI (\${rsi.toFixed(1)} < 30)\` };
  }

  if (rsi > 70) {
    return { action: 'SELL', reason: \`Overbought RSI (\${rsi.toFixed(1)} > 70)\` };
  }

  return null;
}`
  },
  {
    id: 'strat-grid',
    name: 'Quantitative Grid Trading (網格套利策略)',
    category: 'Grid Trading',
    description: 'Automated grid trading bot that places ladder buy/sell orders across dynamic grid bands in sideways markets.',
    code: `// Quantitative Grid Trading Strategy
// Places buy orders on lower grid levels and sell orders on upper grid levels

function onTick(candles, index) {
  if (index < 20) return null;
  
  const currentPrice = candles[index].close;
  const slice = candles.slice(index - 19, index + 1);
  const high20 = Math.max(...slice.map(c => c.high));
  const low20 = Math.min(...slice.map(c => c.low));
  const midGrid = (high20 + low20) / 2;

  const lowerGrid = midGrid * 0.97; // 3% lower grid
  const upperGrid = midGrid * 1.03; // 3% upper grid

  if (currentPrice <= lowerGrid) {
    return { action: 'BUY', reason: 'Price hit Lower Grid Support line' };
  }

  if (currentPrice >= upperGrid) {
    return { action: 'SELL', reason: 'Price hit Upper Grid Resistance line' };
  }

  return null;
}`
  }
];
