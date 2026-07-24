# ApexTrade Platform Architecture

## Product target

ApexTrade should evolve from a browser-only demo into a multi-market quantitative research platform with four independently scalable layers:

1. **Market data** — licensed and public feeds, symbol master, corporate actions, exchange calendars, quality checks, caching, and normalized OHLCV storage.
2. **Research and backtesting** — deterministic event-driven execution, realistic fills and costs, portfolio accounting, benchmark comparison, parameter sweeps, walk-forward tests, and reproducible run manifests.
3. **Charting and discovery** — high-performance charts, indicators, drawings, screeners, watchlists, alerts, and synchronized layouts.
4. **Execution and user platform** — authentication, workspaces, saved strategies, paper accounts, broker adapters, audit logs, quotas, and observability.

The React application should be a client of these services rather than the owner of market data, portfolio state, and strategy execution.

## Recommended repository evolution

```text
apps/
  web/                 React terminal
  api/                 authenticated HTTP/WebSocket gateway
  worker/              backtest and optimization workers
packages/
  domain/              instruments, orders, fills, portfolios, calendars
  backtest-engine/     deterministic event-driven simulator
  indicators/          tested numerical indicators
  data-contracts/      provider-neutral market-data interfaces
  strategy-sdk/        safe strategy API and versioned runtime
services/
  ingestion/           vendor adapters and normalization
  scheduler/           recurring ingestion and corporate-action jobs
infra/
  migrations/          PostgreSQL/Timescale schemas
  docker/              local development stack
```

## Market-data model

Every instrument must have a stable internal ID. A ticker alone is not an identity because symbols can collide across exchanges and change over time.

Minimum identity fields:

- provider and vendor symbol
- exchange/MIC
- asset class
- quote currency
- timezone and exchange calendar
- contract metadata for futures/options
- adjustment policy for equities

Historical requests should return both candles and a data-quality report. Do not silently interpolate missing data. Corporate actions and futures rolls must be explicit and versioned.

Suggested initial providers:

- Crypto: Binance public market data
- US equities/ETFs: a provider with explicit redistribution and historical-data rights
- Taiwan equities: TWSE/TPEx-compatible licensed or officially permitted source
- FX: broker or institutional FX feed
- Futures/options: exchange-authorized vendor with contract metadata

Provider terms, rate limits, redistribution rights, and delayed/real-time status must be displayed in the product. Data licensing is a product constraint, not an implementation detail.

## Backtest correctness requirements

A production backtest run must record:

- immutable strategy version and parameters
- exact instrument IDs and data snapshot/version
- date range, interval, timezone, and exchange calendar
- commission, spread, slippage, borrow/funding, and tax assumptions
- order sizing and fill policy
- random seed where simulation is stochastic
- engine version and run timestamp

Execution rules:

- signals calculated at bar close cannot fill at that same close unless the strategy explicitly models a market-on-close order
- stop and limit orders must use OHLC-aware intrabar rules or higher-resolution data
- ambiguous bars require an explicit conservative/optimistic policy
- rejected orders, partial fills, insufficient liquidity, and margin events must be represented
- performance ratios should use periodic equity returns, not trade-level percentages

## Storage and compute

Recommended baseline:

- PostgreSQL for users, strategies, runs, instruments, permissions, and audit records
- TimescaleDB or partitioned PostgreSQL for moderate OHLCV scale
- object storage with Parquet for large historical datasets and reproducible snapshots
- Redis for cache, rate limiting, sessions, and job coordination
- a durable queue for backtests, imports, optimizations, and alert evaluation
- isolated workers for user-authored strategy code

Do not execute arbitrary strategy JavaScript in the main browser context or API process. Use a constrained, versioned runtime with CPU, memory, time, network, and filesystem limits.

## Delivery sequence

### Phase 1 — trustworthy research core

- provider-neutral market-data contracts
- historical data import with validation report
- realistic next-bar backtester with costs
- benchmark, drawdown, Sharpe, Sortino, Calmar, exposure, and trade ledger
- deterministic tests using small golden datasets

### Phase 2 — persistent platform

- authentication and workspaces
- PostgreSQL schema and migrations
- saved layouts, watchlists, strategies, and backtest runs
- API/WebSocket boundary between frontend and services
- background job queue and progress reporting

### Phase 3 — multi-asset depth

- equities with corporate-action adjustment
- FX sessions and spread modelling
- futures contract chains and continuous-series policies
- options chains, Greeks, expiration and assignment modelling
- portfolio and multi-symbol event-driven backtests

### Phase 4 — TradingView-class experience

- synchronized multi-chart layouts
- drawing persistence and replay mode
- scalable screener engine
- alert rules evaluated server-side
- strategy publishing, versioning, permissions, and community features
- paper broker adapters followed by tightly controlled live execution

## Non-goals for the current browser-only implementation

The current localStorage portfolio, generated candles, browser strategy execution, and hard-coded feed switching are useful prototypes. They should not be presented as institutional execution or production-grade research until they are replaced by auditable server-side services and licensed data pipelines.
