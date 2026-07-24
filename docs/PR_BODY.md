# TradingView-grade correctness and platform foundation

## What changed

- Replaced same-bar backtest fills with next-bar execution
- Added commissions, slippage, intrabar fill rules and institutional metrics
- Added normalized multi-provider market-data contracts
- Expanded instrument categories, metadata and intervals
- Fixed simulated/live candle rollover and Binance stream parsing
- Fixed leveraged paper-account margin and PnL accounting
- Added standard bar, hollow candle, baseline and true Heikin-Ashi charts
- Added a complete feature-parity registry, architecture and delivery backlog

## Why

The previous project presented many terminal-like controls but relied on simulated history, browser-local state and financially incorrect execution assumptions. This change establishes correctness and an architecture that can support real multi-market data, server-side jobs, alerts, replay and strategy execution.

## Validation required

- `npm ci`
- `npm run lint`
- `npm run build`
- add unit tests in the next slice
