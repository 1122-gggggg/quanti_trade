import type { Candle } from '../types/trading';

/**
 * Fetch official daily stock data for 1371+ Taiwan listed stocks directly from TWSE OpenAPI (100% Free & Official)
 */
export async function fetchTWSEOfficialStock(stockNo: string = '2330'): Promise<{
  symbol: string;
  name: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
} | null> {
  try {
    const cleanNo = stockNo.replace('.TW', '').trim();
    const url = 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL';

    const response = await fetch(url);
    if (!response.ok) throw new Error('TWSE API error');

    const data = await response.json();
    const matched = data.find((item: any) => item.Code === cleanNo);

    if (matched) {
      return {
        symbol: `${matched.Code}.TW`,
        name: matched.Name,
        open: parseFloat(matched.OpeningPrice) || 0,
        high: parseFloat(matched.HighestPrice) || 0,
        low: parseFloat(matched.LowestPrice) || 0,
        close: parseFloat(matched.ClosingPrice) || 0,
        volume: parseInt(matched.TradeVolume, 10) || 0,
      };
    }
    return null;
  } catch (err) {
    console.warn('TWSE Fetch Error:', err);
    return null;
  }
}

/**
 * Fetch real historical OHLCV candle data from Binance API (100% Free, Public)
 */
export async function fetchBinanceKlines(
  symbol: string = 'BTCUSDT',
  interval: string = '1h',
  limit: number = 200
): Promise<Candle[]> {
  try {
    const formattedSymbol = symbol.replace('/', '').replace('.TW', '').toUpperCase();
    const binanceSymbol = formattedSymbol.endsWith('USDT') ? formattedSymbol : `${formattedSymbol}USDT`;
    
    const intervalMap: Record<string, string> = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '1h': '1h',
      '4h': '4h',
      '1D': '1d',
    };

    const binanceInterval = intervalMap[interval] || '1h';
    const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${binanceInterval}&limit=${limit}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.statusText}`);
    }

    const rawData = await response.json();
    
    // Binance response format: [ openTime, open, high, low, close, volume, closeTime, ... ]
    const candles: Candle[] = rawData.map((item: any) => ({
      time: Math.floor(item[0] / 1000),
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      volume: parseFloat(item[5]),
    }));

    return candles;
  } catch (err) {
    console.warn('Binance Fetch Error, falling back to local dataset:', err);
    throw err;
  }
}

/**
 * Fetch historical data for Taiwan / Global Stocks via Public Yahoo Finance Proxy
 */
export async function fetchYahooFinanceHistory(
  symbol: string = '2330.TW',
  interval: string = '1d',
  range: string = '3m'
): Promise<Candle[]> {
  try {
    const corsProxy = 'https://query1.finance.yahoo.com/v8/finance/chart/';
    const url = `${corsProxy}${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Yahoo Finance API HTTP error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.chart.result[0];
    const timestamps: number[] = result.timestamp || [];
    const quote = result.indicators.quote[0];

    const candles: Candle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (quote.open[i] != null && quote.close[i] != null) {
        candles.push({
          time: timestamps[i],
          open: Number(quote.open[i].toFixed(2)),
          high: Number(quote.high[i].toFixed(2)),
          low: Number(quote.low[i].toFixed(2)),
          close: Number(quote.close[i].toFixed(2)),
          volume: Math.floor(quote.volume[i] || 0),
        });
      }
    }

    return candles;
  } catch (err) {
    console.warn('Yahoo Finance Proxy Error:', err);
    throw err;
  }
}

/**
 * Parse user uploaded CSV file text into Candles
 * Format expected: Date/Time, Open, High, Low, Close, Volume
 */
export function parseCSVToCandles(csvText: string): Candle[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const candles: Candle[] = [];
  const header = lines[0].toLowerCase().split(',');
  
  // Find column indices
  const dateIdx = header.findIndex(h => h.includes('date') || h.includes('time'));
  const openIdx = header.findIndex(h => h.includes('open'));
  const highIdx = header.findIndex(h => h.includes('high'));
  const lowIdx = header.findIndex(h => h.includes('low'));
  const closeIdx = header.findIndex(h => h.includes('close'));
  const volIdx = header.findIndex(h => h.includes('vol'));

  let nowSec = Math.floor(Date.now() / 1000) - (lines.length * 3600);

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 4) continue;

    let timestamp = nowSec + (i * 3600);
    if (dateIdx !== -1 && cols[dateIdx]) {
      const parsedDate = Date.parse(cols[dateIdx]);
      if (!isNaN(parsedDate)) {
        timestamp = Math.floor(parsedDate / 1000);
      }
    }

    const open = parseFloat(cols[openIdx !== -1 ? openIdx : 0]);
    const high = parseFloat(cols[highIdx !== -1 ? highIdx : 1]);
    const low = parseFloat(cols[lowIdx !== -1 ? lowIdx : 2]);
    const close = parseFloat(cols[closeIdx !== -1 ? closeIdx : 3]);
    const volume = volIdx !== -1 && cols[volIdx] ? parseFloat(cols[volIdx]) : 1000;

    if (!isNaN(open) && !isNaN(close)) {
      candles.push({
        time: timestamp,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume,
      });
    }
  }

  return candles.sort((a, b) => a.time - b.time);
}
