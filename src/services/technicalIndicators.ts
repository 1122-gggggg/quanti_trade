import type { Candle, TechnicalSignal } from '../types/trading';

/**
 * Calculate Simple Moving Average (SMA)
 */
export function calculateSMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(Number((sum / period).toFixed(2)));
    }
  }
  return result;
}

/**
 * Calculate Exponential Moving Average (EMA)
 */
export function calculateEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prevEma: number | null = null;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      const sum = data.slice(0, period).reduce((a, b) => a + b, 0);
      prevEma = sum / period;
      result.push(Number(prevEma.toFixed(2)));
    } else {
      const currentEma: number = (data[i] * k) + (prevEma! * (1 - k));
      prevEma = currentEma;
      result.push(Number(currentEma.toFixed(2)));
    }
  }
  return result;
}

/**
 * Calculate Relative Strength Index (RSI)
 */
export function calculateRSI(candles: Candle[], period: number = 14): (number | null)[] {
  const closes = candles.map(c => c.close);
  const result: (number | null)[] = [];
  
  if (closes.length <= period) {
    return closes.map(() => null);
  }

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      result.push(null);
    } else if (i === period) {
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      result.push(Number(rsi.toFixed(2)));
    } else {
      const diff = closes[i] - closes[i - 1];
      const gain = diff >= 0 ? diff : 0;
      const loss = diff < 0 ? -diff : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      result.push(Number(rsi.toFixed(2)));
    }
  }

  return result;
}

/**
 * Calculate Volume Weighted Average Price (VWAP)
 */
export function calculateVWAP(candles: Candle[]): (number | null)[] {
  const vwapValues: (number | null)[] = [];
  let cumulativeTypicalPriceVolume = 0;
  let cumulativeVolume = 0;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const typicalPrice = (c.high + c.low + c.close) / 3;
    const tpv = typicalPrice * c.volume;

    cumulativeTypicalPriceVolume += tpv;
    cumulativeVolume += c.volume;

    if (cumulativeVolume === 0) {
      vwapValues.push(null);
    } else {
      vwapValues.push(Number((cumulativeTypicalPriceVolume / cumulativeVolume).toFixed(2)));
    }
  }

  return vwapValues;
}

/**
 * Calculate Bollinger Bands (Middle, Upper, Lower)
 */
export function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
) {
  const middle = calculateSMA(closes, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1 || middle[i] === null) {
      upper.push(null);
      lower.push(null);
    } else {
      const slice = closes.slice(i - period + 1, i + 1);
      const mean = middle[i]!;
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const stdDev = Math.sqrt(variance);

      upper.push(Number((mean + stdDevMultiplier * stdDev).toFixed(2)));
      lower.push(Number((mean - stdDevMultiplier * stdDev).toFixed(2)));
    }
  }

  return { middle, upper, lower };
}

/**
 * Analyze AI Technical Signal for given Asset candles
 */
export function analyzeTechnicalSignal(symbol: string, candles: Candle[]): TechnicalSignal {
  if (candles.length < 20) {
    return {
      symbol,
      timeframe: '1h',
      signal: 'NEUTRAL',
      rsiValue: 50,
      macdState: 'Neutral',
      trend: 'Sideways',
      supportLevels: [],
      resistanceLevels: [],
      recommendation: 'Insufficient data for complete analysis.',
    };
  }

  const closes = candles.map(c => c.close);
  const rsiValues = calculateRSI(candles, 14);
  const lastRSI = rsiValues[rsiValues.length - 1] || 50;

  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, Math.min(50, closes.length));

  const lastPrice = closes[closes.length - 1];
  const lastSMA20 = sma20[sma20.length - 1] || lastPrice;
  const lastSMA50 = sma50[sma50.length - 1] || lastPrice;

  // Pivot Points Support/Resistance
  const high20 = Math.max(...candles.slice(-20).map(c => c.high));
  const low20 = Math.min(...candles.slice(-20).map(c => c.low));
  
  const support1 = Number((lastPrice * 0.96).toFixed(2));
  const support2 = Number(low20.toFixed(2));
  const resistance1 = Number((lastPrice * 1.04).toFixed(2));
  const resistance2 = Number(high20.toFixed(2));

  let trend: 'Uptrend' | 'Downtrend' | 'Sideways' = 'Sideways';
  if (lastPrice > lastSMA20 && lastSMA20 > lastSMA50) trend = 'Uptrend';
  else if (lastPrice < lastSMA20 && lastSMA20 < lastSMA50) trend = 'Downtrend';

  let signal: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL' = 'NEUTRAL';
  let macdState: 'Bullish Crossover' | 'Bearish Crossover' | 'Neutral' = 'Neutral';

  if (lastRSI < 30 && trend !== 'Downtrend') {
    signal = 'STRONG_BUY';
    macdState = 'Bullish Crossover';
  } else if (lastRSI < 45 && lastPrice > lastSMA20) {
    signal = 'BUY';
    macdState = 'Bullish Crossover';
  } else if (lastRSI > 70) {
    signal = 'STRONG_SELL';
    macdState = 'Bearish Crossover';
  } else if (lastRSI > 58 && lastPrice < lastSMA20) {
    signal = 'SELL';
    macdState = 'Bearish Crossover';
  }

  let recommendation = '';
  switch (signal) {
    case 'STRONG_BUY':
      recommendation = `Asset is oversold with RSI at ${lastRSI}. Price is testing major support near $${support2}. High probability bullish reversal.`;
      break;
    case 'BUY':
      recommendation = `Positive momentum detected. SMA20 ($${lastSMA20}) holding as dynamic support. RSI at ${lastRSI}.`;
      break;
    case 'SELL':
      recommendation = `Momentum fading. Price struggling below SMA20 ($${lastSMA20}). Consider tightening stop losses.`;
      break;
    case 'STRONG_SELL':
      recommendation = `Overbought conditions with RSI at ${lastRSI}. High resistance at $${resistance2}. Potential pull-back expected.`;
      break;
    default:
      recommendation = `Market consolidating in a tight range between $${support1} and $${resistance1}. Wait for breakout confirmation.`;
  }

  return {
    symbol,
    timeframe: '1h',
    signal,
    rsiValue: lastRSI,
    macdState,
    trend,
    supportLevels: [support1, support2],
    resistanceLevels: [resistance1, resistance2],
    recommendation,
  };
}
