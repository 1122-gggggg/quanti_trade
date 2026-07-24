import type { AssetCategory, Candle } from '../types/trading';

export type MarketDataInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1D';

export interface InstrumentId {
  provider: string;
  exchange: string;
  symbol: string;
  category: AssetCategory;
  currency: string;
}

export interface HistoricalDataRequest {
  instrument: InstrumentId;
  interval: MarketDataInterval;
  from: number;
  to: number;
  adjusted?: boolean;
}

export interface Quote {
  instrument: InstrumentId;
  timestamp: number;
  bid?: number;
  ask?: number;
  last: number;
  volume?: number;
  source: string;
}

export interface DataQualityReport {
  receivedRows: number;
  acceptedRows: number;
  rejectedRows: number;
  duplicateRows: number;
  missingIntervals: number;
  warnings: string[];
}

export interface HistoricalDataResponse {
  candles: Candle[];
  quality: DataQualityReport;
  source: string;
  timezone: string;
  exchangeCalendar?: string;
}

export interface MarketDataProvider {
  readonly id: string;
  readonly supportedCategories: readonly AssetCategory[];
  searchInstruments(query: string, limit?: number): Promise<InstrumentId[]>;
  getHistoricalCandles(request: HistoricalDataRequest): Promise<HistoricalDataResponse>;
  subscribeQuotes(
    instruments: InstrumentId[],
    onQuote: (quote: Quote) => void,
    onError?: (error: Error) => void,
  ): () => void;
}

export class MarketDataRegistry {
  private readonly providers = new Map<string, MarketDataProvider>();

  register(provider: MarketDataProvider): void {
    if (this.providers.has(provider.id)) {
      throw new Error(`Market-data provider already registered: ${provider.id}`);
    }
    this.providers.set(provider.id, provider);
  }

  get(providerId: string): MarketDataProvider {
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error(`Unknown market-data provider: ${providerId}`);
    return provider;
  }

  list(category?: AssetCategory): MarketDataProvider[] {
    const providers = [...this.providers.values()];
    return category
      ? providers.filter(provider => provider.supportedCategories.includes(category))
      : providers;
  }
}

/**
 * Normalizes vendor candles before they reach charting or backtesting code.
 * The function rejects malformed bars, sorts timestamps, and removes duplicates.
 */
export function normalizeCandles(candles: Candle[], expectedIntervalSeconds?: number): HistoricalDataResponse {
  let rejectedRows = 0;
  let duplicateRows = 0;

  const valid = candles.filter(candle => {
    const accepted = Number.isFinite(candle.time)
      && Number.isFinite(candle.open)
      && Number.isFinite(candle.high)
      && Number.isFinite(candle.low)
      && Number.isFinite(candle.close)
      && Number.isFinite(candle.volume)
      && candle.open > 0
      && candle.high >= Math.max(candle.open, candle.close)
      && candle.low <= Math.min(candle.open, candle.close);
    if (!accepted) rejectedRows += 1;
    return accepted;
  }).sort((a, b) => a.time - b.time);

  const unique = valid.filter((candle, index) => {
    const duplicate = index > 0 && candle.time === valid[index - 1].time;
    if (duplicate) duplicateRows += 1;
    return !duplicate;
  });

  let missingIntervals = 0;
  if (expectedIntervalSeconds && expectedIntervalSeconds > 0) {
    for (let index = 1; index < unique.length; index += 1) {
      const gap = unique[index].time - unique[index - 1].time;
      if (gap > expectedIntervalSeconds) {
        missingIntervals += Math.max(0, Math.round(gap / expectedIntervalSeconds) - 1);
      }
    }
  }

  const warnings: string[] = [];
  if (rejectedRows > 0) warnings.push(`${rejectedRows} malformed candles rejected`);
  if (duplicateRows > 0) warnings.push(`${duplicateRows} duplicate timestamps removed`);
  if (missingIntervals > 0) warnings.push(`${missingIntervals} expected intervals are missing`);

  return {
    candles: unique,
    quality: {
      receivedRows: candles.length,
      acceptedRows: unique.length,
      rejectedRows,
      duplicateRows,
      missingIntervals,
      warnings,
    },
    source: 'normalized',
    timezone: 'UTC',
  };
}
