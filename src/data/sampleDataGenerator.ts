import type { Candle, Timeframe } from '../types/trading';
import { alignTimestampToTimeframe, timeframeToSeconds } from '../services/timeframes';

/**
 * Generates realistic OHLC historical candlestick data using a Geometric
 * Brownian Motion model. This is a demo feed only and must not be presented as
 * exchange-sourced market history.
 */
export function generateHistoricalCandles(
  basePrice: number,
  count: number = 200,
  timeframe: Timeframe = '1h'
): Candle[] {
  const candles: Candle[] = [];
  const stepSeconds = timeframeToSeconds(timeframe);
  const now = Math.floor(Date.now() / 1000);
  const currentBucket = alignTimestampToTimeframe(now, timeframe);
  const startTime = currentBucket - (count - 1) * stepSeconds;

  let currentPrice = basePrice * (0.85 + Math.random() * 0.15);

  for (let i = 0; i < count; i++) {
    const candleTime = startTime + i * stepSeconds;
    const intervalScale = Math.sqrt(stepSeconds / 86_400);
    const dailyVolatility = basePrice > 10_000 ? 0.04 : basePrice > 100 ? 0.025 : 0.015;
    const volatility = Math.max(0.0002, dailyVolatility * intervalScale);
    const trendBias = Math.sin(i / 15) * volatility * 0.15;

    const open = currentPrice;
    const priceChange = open * (trendBias + (Math.random() - 0.49) * volatility * 2);
    const close = Math.max(0.000001, open + priceChange);
    const highMargin = Math.random() * volatility * open;
    const lowMargin = Math.random() * volatility * open;
    const high = Math.max(open, close) + highMargin;
    const low = Math.max(0.000001, Math.min(open, close) - lowMargin);
    const volume = Math.floor((open * 1_000) * (0.8 + Math.random() * 0.8));

    candles.push({
      time: candleTime,
      open: Number(open.toFixed(6)),
      high: Number(high.toFixed(6)),
      low: Number(low.toFixed(6)),
      close: Number(close.toFixed(6)),
      volume,
    });

    currentPrice = close;
  }

  if (candles.length > 0) {
    const last = candles[candles.length - 1];
    last.close = basePrice;
    last.high = Math.max(last.high, basePrice);
    last.low = Math.min(last.low, basePrice);
  }

  return candles;
}

/**
 * Update the active candle or create a new candle when the next timeframe
 * bucket begins.
 */
export function generateNextTick(
  lastCandle: Candle,
  timeframe: Timeframe = '1h'
): Candle {
  const now = Math.floor(Date.now() / 1000);
  const bucketTime = alignTimestampToTimeframe(now, timeframe);
  const intervalScale = Math.sqrt(timeframeToSeconds(timeframe) / 86_400);
  const volatility = Math.max(0.00005, 0.02 * intervalScale);
  const changePct = (Math.random() - 0.495) * volatility;

  if (bucketTime > lastCandle.time) {
    const open = lastCandle.close;
    const close = Math.max(0.000001, open * (1 + changePct));

    return {
      time: bucketTime,
      open: Number(open.toFixed(6)),
      high: Number(Math.max(open, close).toFixed(6)),
      low: Number(Math.min(open, close).toFixed(6)),
      close: Number(close.toFixed(6)),
      volume: Math.max(1, Math.floor(open * 50)),
    };
  }

  const newClose = Math.max(0.000001, lastCandle.close * (1 + changePct));
  return {
    ...lastCandle,
    high: Math.max(lastCandle.high, newClose),
    low: Math.min(lastCandle.low, newClose),
    close: Number(newClose.toFixed(6)),
    volume: lastCandle.volume + Math.floor(Math.random() * 20),
  };
}
