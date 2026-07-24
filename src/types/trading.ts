export type AssetCategory = 'crypto' | 'stocks' | 'forex' | 'commodities';

export interface Asset {
  symbol: string;
  name: string;
  category: AssetCategory;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCap?: number;
  icon?: string;
  historySparkline?: number[];
  peRatio?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
}

export interface Candle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type ChartType = 'candlestick' | 'line' | 'area' | 'heikinAshi';
export type DrawingTool = 'cursor' | 'trendline' | 'horizontalLine' | 'fibonacci' | 'ruler';

export interface DrawingElement {
  id: string;
  type: DrawingTool;
  points: { time: number; price: number }[];
  color: string;
}

export type IndicatorType = 'SMA' | 'EMA' | 'RSI' | 'MACD' | 'BB' | 'VOLUME' | 'VWAP' | 'STOCH';

export interface IndicatorConfig {
  id: string;
  type: IndicatorType;
  enabled: boolean;
  period: number;
  color: string;
  params?: Record<string, number>;
}

export type OrderType = 'market' | 'limit' | 'stop';
export type OrderSide = 'buy' | 'sell';

export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  amount: number;
  price: number;
  total: number;
  status: 'pending' | 'executed' | 'cancelled';
  timestamp: number;
  leverage?: number;
  takeProfit?: number;
  stopLoss?: number;
}

export interface Position {
  id: string;
  symbol: string;
  side: OrderSide;
  amount: number;
  entryPrice: number;
  currentPrice: number;
  liquidationPrice?: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  leverage: number;
  openedAt: number;
  takeProfit?: number;
  stopLoss?: number;
}

export interface Portfolio {
  cashBalance: number;
  initialBalance: number;
  realizedPnL: number;
  positions: Position[];
  history: { timestamp: number; equity: number }[];
}

export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: 'above' | 'below';
  triggered: boolean;
  createdAt: number;
}

export type StrategyName =
  | 'SMA_CROSSOVER'
  | 'RSI_REVERSAL'
  | 'BOLLINGER_BREAKOUT'
  | 'MACD_MOMENTUM';

export type IntrabarFillPolicy = 'stop_first' | 'take_profit_first';

export interface StrategyConfig {
  strategy: StrategyName;
  fastPeriod: number;
  slowPeriod: number;
  rsiThresholdLow: number;
  rsiThresholdHigh: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  initialCapital: number;
  /** Round-trip modelling inputs. Defaults are deliberately non-zero. */
  commissionPercent?: number;
  slippagePercent?: number;
  positionSizePercent?: number;
  riskFreeRatePercent?: number;
  annualizationPeriods?: number;
  intrabarFillPolicy?: IntrabarFillPolicy;
}

export interface BacktestTrade {
  entryTime: string;
  exitTime: string;
  symbol: string;
  side: OrderSide;
  entryPrice: number;
  exitPrice: number;
  amount: number;
  pnl: number;
  pnlPercent: number;
  reason: 'Signal' | 'StopLoss' | 'TakeProfit' | 'EndOfData';
  grossPnl?: number;
  fees?: number;
  barsHeld?: number;
}

export interface BacktestResult {
  strategyName: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalReturnPct: number;
  benchmarkReturnPct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  profitFactor: number;
  finalEquity: number;
  feesPaid: number;
  exposurePercent: number;
  trades: BacktestTrade[];
  equityCurve: { time: string; equity: number }[];
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  timestamp: string;
  relatedSymbols: string[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
  summary: string;
}

export interface TechnicalSignal {
  symbol: string;
  timeframe: string;
  signal: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
  rsiValue: number;
  macdState: 'Bullish Crossover' | 'Bearish Crossover' | 'Neutral';
  trend: 'Uptrend' | 'Downtrend' | 'Sideways';
  supportLevels: number[];
  resistanceLevels: number[];
  recommendation: string;
}
