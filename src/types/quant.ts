export interface QuantStrategyScript {
  id: string;
  name: string;
  description: string;
  category: 'Trend Following' | 'Mean Reversion' | 'Grid Trading' | 'Arbitrage';
  code: string;
}

export interface QuantBot {
  id: string;
  name: string;
  symbol: string;
  strategyId: string;
  timeframe: string;
  status: 'running' | 'paused' | 'stopped';
  allocatedCapital: number;
  currentPnL: number;
  totalTrades: number;
  winningTrades: number;
  startedAt: number;
  logs: { timestamp: string; message: string; type: 'info' | 'trade' | 'alert' }[];
}

export interface InstitutionalMetrics {
  totalReturnPct: number;
  cagrPct: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdownPct: number;
  winRatePct: number;
  profitFactor: number;
  totalTrades: number;
  avgTradeReturnPct: number;
}

export interface MonthlyReturnData {
  year: number;
  months: { month: string; returnPct: number }[];
  totalYearReturnPct: number;
}

export interface AssetCorrelation {
  symbolA: string;
  symbolB: string;
  correlation: number; // -1.0 to +1.0
}
