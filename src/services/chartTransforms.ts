import type { Candle } from '../types/trading';

/**
 * Convert standard OHLC candles to Heikin-Ashi candles without mutating the
 * source data. Volume and timestamps are preserved.
 */
export function toHeikinAshi(candles: readonly Candle[]): Candle[] {
  if (candles.length === 0) return [];

  const output: Candle[] = [];

  candles.forEach((candle, index) => {
    const close = (candle.open + candle.high + candle.low + candle.close) / 4;
    const open = index === 0
      ? (candle.open + candle.close) / 2
      : (output[index - 1].open + output[index - 1].close) / 2;
    const high = Math.max(candle.high, open, close);
    const low = Math.min(candle.low, open, close);

    output.push({
      time: candle.time,
      open,
      high,
      low,
      close,
      volume: candle.volume,
    });
  });

  return output;
}

/**
 * Keep chart input deterministic and safe for charting libraries that require
 * strictly increasing timestamps and valid OHLC ranges.
 */
export function normalizeChartCandles(candles: readonly Candle[]): Candle[] {
  const byTimestamp = new Map<number, Candle>();

  candles.forEach(candle => {
    if (
      !Number.isFinite(candle.time) ||
      !Number.isFinite(candle.open) ||
      !Number.isFinite(candle.high) ||
      !Number.isFinite(candle.low) ||
      !Number.isFinite(candle.close) ||
      !Number.isFinite(candle.volume) ||
      candle.time <= 0 ||
      candle.open <= 0 ||
      candle.high <= 0 ||
      candle.low <= 0 ||
      candle.close <= 0
    ) {
      return;
    }

    const high = Math.max(candle.high, candle.open, candle.close);
    const low = Math.min(candle.low, candle.open, candle.close);

    byTimestamp.set(candle.time, {
      ...candle,
      high,
      low,
      volume: Math.max(0, candle.volume),
    });
  });

  return [...byTimestamp.values()].sort((a, b) => a.time - b.time);
}
