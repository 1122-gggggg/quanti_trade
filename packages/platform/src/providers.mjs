import { normalizeBars } from './core.mjs';

const API_URL = 'https://www.alphavantage.co/query';

function assertProviderResponse(payload) {
  const message = payload?.['Error Message'] ?? payload?.Note ?? payload?.Information;
  if (message) throw new Error(`Alpha Vantage: ${message}`);
  return payload;
}

export async function alphaVantageSearch(query, apiKey, limit = 20) {
  if (!apiKey) throw new Error('ALPHA_VANTAGE_API_KEY is not configured');
  const url = new URL(API_URL);
  url.search = new URLSearchParams({ function: 'SYMBOL_SEARCH', keywords: query, apikey: apiKey }).toString();
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Alpha Vantage search failed: ${response.status}`);
  const payload = assertProviderResponse(await response.json());
  return (payload.bestMatches ?? []).slice(0, limit).map((row) => ({
    provider: 'alpha_vantage',
    providerSymbol: row['1. symbol'],
    canonicalSymbol: row['1. symbol'],
    name: row['2. name'],
    assetClass: String(row['3. type'] ?? 'stock').toLowerCase().includes('etf') ? 'etf' : 'stock',
    venue: row['4. region'] ?? 'UNKNOWN',
    currency: row['8. currency'] ?? 'USD',
    timezone: row['7. timezone'] ?? 'UTC',
    metadata: {
      marketOpen: row['5. marketOpen'],
      marketClose: row['6. marketClose'],
      matchScore: Number(row['9. matchScore'] ?? 0),
    },
  }));
}

function stockRequest(instrument, apiKey, outputSize, adjusted) {
  return {
    function: adjusted ? 'TIME_SERIES_DAILY_ADJUSTED' : 'TIME_SERIES_DAILY',
    symbol: instrument.provider_symbol,
    outputsize: outputSize,
    apikey: apiKey,
  };
}

function forexRequest(instrument, apiKey, outputSize) {
  const [fromSymbol, toSymbol] = instrument.provider_symbol.split(/[/:_-]/);
  if (!fromSymbol || !toSymbol) throw new Error('Forex provider symbol must contain base and quote currency, e.g. EUR/USD');
  return {
    function: 'FX_DAILY',
    from_symbol: fromSymbol,
    to_symbol: toSymbol,
    outputsize: outputSize,
    apikey: apiKey,
  };
}

function cryptoRequest(instrument, apiKey) {
  const [symbol, market = instrument.currency || 'USD'] = instrument.provider_symbol.split(/[/:_-]/);
  return {
    function: 'DIGITAL_CURRENCY_DAILY',
    symbol,
    market,
    apikey: apiKey,
  };
}

function findSeries(payload) {
  const key = Object.keys(payload).find((candidate) => candidate.toLowerCase().includes('time series'));
  if (!key || typeof payload[key] !== 'object') throw new Error('Provider response did not contain a time series');
  return { key, series: payload[key] };
}

function value(row, candidates, fallback = 0) {
  for (const candidate of candidates) {
    if (row[candidate] != null) return Number(row[candidate]);
  }
  return fallback;
}

export async function alphaVantageDaily(instrument, {
  apiKey,
  outputSize = 'compact',
  adjusted = false,
  interval = '1D',
} = {}) {
  if (!apiKey) throw new Error('ALPHA_VANTAGE_API_KEY is not configured');
  if (interval !== '1D') throw new Error('The built-in Alpha Vantage adapter currently ingests daily bars only');
  let params;
  if (['stock', 'etf', 'fund', 'index'].includes(instrument.asset_class)) {
    params = stockRequest(instrument, apiKey, outputSize, adjusted);
  } else if (instrument.asset_class === 'forex') {
    params = forexRequest(instrument, apiKey, outputSize);
  } else if (instrument.asset_class === 'crypto') {
    params = cryptoRequest(instrument, apiKey);
  } else {
    throw new Error(`Alpha Vantage adapter does not support ${instrument.asset_class}; use CSV/Parquet import`);
  }

  const url = new URL(API_URL);
  url.search = new URLSearchParams(params).toString();
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Alpha Vantage history request failed: ${response.status}`);
  const payload = assertProviderResponse(await response.json());
  const { series } = findSeries(payload);
  const bars = Object.entries(series).map(([date, row]) => ({
    time: Math.floor(Date.parse(`${date}T00:00:00Z`) / 1000),
    open: value(row, ['1. open', '1a. open (USD)']),
    high: value(row, ['2. high', '2a. high (USD)']),
    low: value(row, ['3. low', '3a. low (USD)']),
    close: value(row, ['4. close', '4a. close (USD)']),
    volume: value(row, ['5. volume', '5. volume', '5. adjusted close', '6. volume']),
  }));
  const normalized = normalizeBars(bars, { interval });
  return {
    ...normalized,
    raw: payload,
    metadata: payload['Meta Data'] ?? {},
    source: 'alpha_vantage',
    delaySeconds: 86400,
  };
}
