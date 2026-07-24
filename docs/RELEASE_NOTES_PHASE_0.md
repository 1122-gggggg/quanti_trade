# Phase 0 Release Notes

## Delivered

- Research-grade single-asset backtest execution assumptions
- Commission, slippage and intrabar stop/target policies
- Benchmark, Sharpe, Sortino, Calmar, drawdown, fee and exposure metrics
- Canonical market-data provider contracts
- Expanded asset classes and instrument metadata
- Second-to-month timeframe model
- Correct candle bucket alignment and rollover
- Correct leveraged paper-account margin return and PnL calculation
- Binance combined-stream parsing with reconnect backoff
- Standard candles, hollow candles, bars, line, area, baseline and Heikin-Ashi charts
- Deterministic chart-data normalization
- Full TradingView-equivalent architecture and implementation backlog

## Still prototype-only

- Browser-local portfolio state
- Simulated historical candles
- Browser-side alert evaluation
- Single-chart workspace
- Small indicator and drawing library
- No authenticated users, backend database, server workers or licensed datasets

These limitations must remain visible until the corresponding backend services are implemented.
