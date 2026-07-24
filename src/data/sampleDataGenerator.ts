import type { Candle } from '../types/trading';

/**
 * Generates realistic OHLC historical candlestick data using a Geometric Brownian Motion model.
 */
export function generateHistoricalCandles(
  basePrice: number,
  count: number = 200,
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1D' = '1h'
): Candle[] {
  const candles: Candle[] = [];
  
  // Time step in seconds per candle
  const timeframeSecondsMap: Record<string, number> = {
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '1h': 3600,
    '4h': 14400,
    '1D': 86400,
  };
  
  const stepSeconds = timeframeSecondsMap[timeframe] || 3600;
  const now = Math.floor(Date.now() / 1000);
  const startTime = now - count * stepSeconds;

  let currentPrice = basePrice * (0.85 + Math.random() * 0.15); // Start slightly below current price
  
  for (let i = 0; i < count; i++) {
    const candleTime = startTime + i * stepSeconds;
    
    // Daily volatility % based on asset price level
    const volatility = basePrice > 10000 ? 0.008 : basePrice > 100 ? 0.012 : 0.005;
    const trendBias = (Math.sin(i / 15) * 0.003) + 0.0005; // Gentle wave trend
    
    const open = currentPrice;
    const priceChange = open * (trendBias + (Math.random() - 0.49) * volatility * 2);
    const close = Math.max(0.01, open + priceChange);
    
    const highMargin = Math.random() * volatility * open * 1.5;
    const lowMargin = Math.random() * volatility * open * 1.5;
    
    const high = Math.max(open, close) + highMargin;
    const low = Math.min(open, close) - lowMargin;
    
    const volume = Math.floor((open * 1000) * (0.8 + Math.random() * 0.8));

    candles.push({
      time: candleTime,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    });

    currentPrice = close;
  }

  // Ensure last candle close is close to current basePrice
  if (candles.length > 0) {
    candles[candles.length - 1].close = basePrice;
  }

  return candles;
}

/**
 * Generate a next real-time tick/candle update for live market simulation
 */
export function generateNextTick(lastCandle: Candle, timeframeSeconds: number = 3600): Candle {
  const isNewCandle = Math.floor(Date.now() / 1000) - lastCandle.time >= timeframeSeconds;
  const volatility = 0.002;
  const changePct = (Math.random() - 0.495) * volatility;
  
  if (isNewCandle) {
    const newTime = Math.floor(Date.now() / 1000);
    const open = lastCandle.close;
    const close = open * (1 + changePct);
    return {
      time: newTime,
      open: Number(open.toFixed(2)),
      high: Number(Math.max(open, close).toFixed(2)),
      low: Number(Math.min(open, close).toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Math.floor(open * 50),
    };
  } else {
    const newClose = Number((lastCandle.close * (1 + changePct)).toFixed(2));
    return {
      ...lastCandle,
      high: Math.max(lastCandle.high, newClose),
      low: Math.min(lastCandle.low, newClose),
      close: newClose,
      volume: lastCandle.volume + Math.floor(Math.random() * 20),
    };
  }
}
