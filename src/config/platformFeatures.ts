export type FeatureStatus =
  | 'implemented'
  | 'foundation'
  | 'planned'
  | 'license_required';

export interface PlatformFeature {
  id: string;
  area: string;
  name: string;
  status: FeatureStatus;
  dependsOn?: string[];
  notes?: string;
}

/**
 * Product-level source of truth for the TradingView-equivalent roadmap.
 * "Equivalent" means an independently implemented capability, not copied
 * proprietary code, branding, exchange entitlements, or Pine Script internals.
 */
export const PLATFORM_FEATURES: readonly PlatformFeature[] = [
  { id: 'charts-standard', area: 'Supercharts', name: 'Standard time-based chart series', status: 'implemented' },
  { id: 'charts-heikin-ashi', area: 'Supercharts', name: 'Heikin-Ashi chart transform', status: 'implemented' },
  { id: 'charts-price-based', area: 'Supercharts', name: 'Renko, Kagi, line break, point-and-figure, range charts', status: 'planned', dependsOn: ['market-history'] },
  { id: 'charts-orderflow', area: 'Supercharts', name: 'Volume footprint, session volume profile, TPO', status: 'planned', dependsOn: ['tick-data', 'market-history'] },
  { id: 'layouts-multi-chart', area: 'Workspace', name: '1–16 chart layouts and synchronized symbols/intervals', status: 'planned', dependsOn: ['workspace-storage'] },
  { id: 'layouts-cloud', area: 'Workspace', name: 'Named layouts, autosave, templates, cross-device sync', status: 'planned', dependsOn: ['auth', 'workspace-storage'] },
  { id: 'drawings-core', area: 'Drawings', name: 'Interactive drawing primitives', status: 'foundation' },
  { id: 'drawings-library', area: 'Drawings', name: 'Full trend, Fibonacci, Gann, geometric, annotation and measurement library', status: 'planned', dependsOn: ['drawings-core'] },
  { id: 'indicators-built-in', area: 'Indicators', name: 'Built-in technical indicator library', status: 'foundation' },
  { id: 'indicators-custom', area: 'Indicators', name: 'Custom indicator runtime and indicator templates', status: 'planned', dependsOn: ['strategy-runtime'] },
  { id: 'strategy-runtime', area: 'Scripting', name: 'Sandboxed domain-specific strategy language', status: 'planned', dependsOn: ['job-queue', 'market-history'] },
  { id: 'pine-compatibility', area: 'Scripting', name: 'Pine-like language migration layer', status: 'planned', dependsOn: ['strategy-runtime'], notes: 'Independent syntax/runtime; no proprietary Pine implementation is copied.' },
  { id: 'strategy-publishing', area: 'Community', name: 'Versioned public/private scripts and moderation', status: 'planned', dependsOn: ['auth', 'strategy-runtime'] },
  { id: 'backtest-event-engine', area: 'Strategy Tester', name: 'Event-driven backtesting with costs and next-bar execution', status: 'implemented' },
  { id: 'backtest-portfolio', area: 'Strategy Tester', name: 'Multi-asset portfolio, margin, shorting and corporate actions', status: 'planned', dependsOn: ['market-history', 'corporate-actions'] },
  { id: 'backtest-optimization', area: 'Strategy Tester', name: 'Walk-forward analysis, parameter search and Monte Carlo', status: 'planned', dependsOn: ['job-queue', 'backtest-event-engine'] },
  { id: 'bar-replay', area: 'Replay', name: 'Synchronized historical bar replay and session restore', status: 'planned', dependsOn: ['market-history', 'layouts-multi-chart'] },
  { id: 'alerts-price', area: 'Alerts', name: 'Price alerts', status: 'foundation' },
  { id: 'alerts-technical', area: 'Alerts', name: 'Indicator, drawing, strategy, pattern and watchlist alerts', status: 'planned', dependsOn: ['alert-workers', 'strategy-runtime'] },
  { id: 'alerts-delivery', area: 'Alerts', name: 'Web, push, email and webhook delivery', status: 'planned', dependsOn: ['alert-workers', 'auth'] },
  { id: 'screener-market', area: 'Screeners', name: 'Stock, ETF, crypto, forex and bond screeners', status: 'foundation', dependsOn: ['instrument-master'] },
  { id: 'screener-script', area: 'Screeners', name: 'Custom-script watchlist screener', status: 'planned', dependsOn: ['strategy-runtime', 'market-history'] },
  { id: 'fundamentals', area: 'Data', name: 'Company financials, estimates, valuation and corporate events', status: 'license_required', dependsOn: ['instrument-master'] },
  { id: 'market-history', area: 'Data', name: 'Normalized multi-provider historical OHLCV store', status: 'foundation' },
  { id: 'tick-data', area: 'Data', name: 'Trades, quotes, order book and tick history', status: 'license_required', dependsOn: ['instrument-master'] },
  { id: 'corporate-actions', area: 'Data', name: 'Splits, dividends, symbol changes and delistings', status: 'planned', dependsOn: ['instrument-master'] },
  { id: 'instrument-master', area: 'Data', name: 'Canonical symbols, exchanges, sessions, currencies and contract metadata', status: 'foundation' },
  { id: 'news-calendar', area: 'Research', name: 'News, economic calendar, earnings and dividends calendar', status: 'license_required', dependsOn: ['instrument-master'] },
  { id: 'heatmaps', area: 'Research', name: 'Market and sector heatmaps', status: 'planned', dependsOn: ['market-history', 'fundamentals'] },
  { id: 'paper-trading', area: 'Trading', name: 'Paper trading, chart orders and risk controls', status: 'foundation' },
  { id: 'dom', area: 'Trading', name: 'Depth-of-market ladder and order-book trading', status: 'license_required', dependsOn: ['tick-data'] },
  { id: 'broker-adapters', area: 'Trading', name: 'Broker/exchange account adapters', status: 'planned', dependsOn: ['auth'], notes: 'Each integration requires broker approval, API terms and regional compliance.' },
  { id: 'social', area: 'Community', name: 'Ideas, comments, follows, reputation and moderation', status: 'planned', dependsOn: ['auth'] },
  { id: 'auth', area: 'Platform', name: 'Accounts, organizations, plans and entitlements', status: 'planned' },
  { id: 'workspace-storage', area: 'Platform', name: 'Persistent user workspace storage', status: 'planned', dependsOn: ['auth'] },
  { id: 'job-queue', area: 'Platform', name: 'Distributed jobs for backtests, scans and optimization', status: 'planned' },
  { id: 'alert-workers', area: 'Platform', name: 'Server-side continuous alert evaluation', status: 'planned', dependsOn: ['job-queue'] },
] as const;

export function getFeatureProgress(): Record<FeatureStatus, number> {
  return PLATFORM_FEATURES.reduce<Record<FeatureStatus, number>>(
    (progress, feature) => {
      progress[feature.status] += 1;
      return progress;
    },
    { implemented: 0, foundation: 0, planned: 0, license_required: 0 }
  );
}
