# TradingView-Equivalent Platform Roadmap

## Product definition

The target is an independently implemented, multi-asset charting and quantitative research platform with capability parity across charting, research, scripting, backtesting, alerts, screeners, replay, paper trading, broker connectivity, and community workflows.

This does **not** mean copying TradingView source code, branding, proprietary Pine Script internals, community content, or market-data entitlements. Exchange data, fundamentals, news, tick history, and broker connectivity require separate commercial agreements.

## Non-negotiable architecture

The current browser-only React application must evolve into the following services:

```text
Web application
  ├─ Supercharts workspace
  ├─ Research and screeners
  ├─ Strategy editor and tester
  └─ Trading terminal

API gateway
  ├─ Authentication and entitlements
  ├─ Workspace/layout API
  ├─ Instrument search API
  ├─ Market-data API
  ├─ Backtest and optimization API
  ├─ Alerts API
  └─ Trading API

Workers and streaming
  ├─ Data ingestion and normalization
  ├─ Historical backtest workers
  ├─ Screener workers
  ├─ Alert evaluators
  ├─ Strategy sandbox workers
  └─ Broker/exchange adapters

Storage
  ├─ PostgreSQL: users, layouts, strategies, alerts, orders
  ├─ TimescaleDB/ClickHouse: bars, quotes, trades, derived metrics
  ├─ Object storage/Parquet: immutable historical partitions
  ├─ Redis: sessions, cache, live state
  └─ Queue: long-running scans, optimization, exports
```

A browser-only architecture cannot provide reliable server-side alerts, large historical datasets, secure user strategy execution, multi-user layouts, durable portfolios, or broker connectivity.

## Capability inventory

### 1. Supercharts

- Standard charts: candles, hollow candles, bars, line, area, baseline, Heikin-Ashi
- Price-based charts: Renko, Kagi, line break, point-and-figure, range
- Order-flow charts: volume footprint, volume profile, TPO
- Multiple price scales, logarithmic/percentage/indexed scales
- Sessions, extended hours, settlement prices and contract adjustments
- Compare symbols, spreads and formulas
- Indicator panes, pane resizing and pane synchronization
- Crosshair, tooltips, legends, data window and keyboard shortcuts
- Data export and chart image export

### 2. Layouts and workspaces

- 1–16 chart layouts
- Symbol, interval, crosshair, date-range and drawing synchronization
- Named layouts, autosave, favorites and restore
- Indicator templates and chart templates
- Cross-device real-time synchronization
- Shareable read-only layouts

### 3. Drawing system

- Trend and channel tools
- Fibonacci and Gann tools
- Geometric shapes
- Elliott wave, harmonic and pattern tools
- Text, notes, icons, images and anchored annotations
- Measurement, risk/reward and position tools
- Magnet mode, object tree, lock/hide, cloning and templates
- Per-layout and global drawing synchronization

### 4. Indicators and scripting

- Large built-in indicator library
- Indicator-on-indicator inputs
- Multi-timeframe and multi-symbol requests
- Sandboxed strategy language with deterministic execution
- Editor diagnostics, autocomplete, documentation hover and versioning
- Private/public scripts, access control and moderation
- Migration helpers for common Pine-like syntax, without copying Pine internals

### 5. Strategy tester

- Event-driven next-bar and intrabar execution
- Market, limit, stop and stop-limit orders
- Long, short, pyramiding, margin and liquidation
- Commission, slippage, bid/ask spread and partial fills
- Corporate actions and futures rolling
- Multi-asset portfolio backtests
- Benchmarking and risk-adjusted metrics
- Trade list, equity, drawdown, monthly returns and distribution analysis
- Parameter search, walk-forward validation and Monte Carlo analysis
- Reproducible run manifests with data-version hashes

### 6. Bar replay

- Selectable historical start point
- Adjustable speed and step mode
- Synchronized multi-chart replay
- Indicators and drawings calculated only from revealed data
- Session persistence and restore
- Replay paper portfolio isolated from live trading

### 7. Alerts

- Price, indicator, drawing, strategy, pattern and watchlist alerts
- Crossing, crossing-up/down, range and bar-count conditions
- Once, once-per-bar, once-per-close and recurring schedules
- Server-side evaluation independent of browser sessions
- Web, push, email and webhook delivery
- Delivery retries, deduplication, audit logs and rate limits

### 8. Screeners and research

- Stocks, ETFs, funds, crypto, forex, futures and bonds
- Technical, fundamental, valuation, performance and risk filters
- Custom watchlists and saved screens
- Custom-script screener
- Heatmaps, market breadth and correlation views
- News, economic calendar, earnings and dividend calendars
- Company financial statements, estimates and corporate actions

### 9. Trading

- Paper trading across asset classes
- Chart trading and draggable orders
- Order ticket and bracket orders
- Positions, orders, executions, account history and risk dashboard
- Depth of market and order-book ladder where licensed
- Broker/exchange adapter SDK
- Secrets vault, OAuth/API-key lifecycle and regional compliance controls

### 10. Community and publishing

- Public/private ideas
- Script publishing and version history
- Profiles, follows, comments, reactions and notifications
- Search, discovery, reputation and moderation
- Abuse prevention and copyright workflows

## Delivery sequence

### Phase 0 — Correctness foundation

Status: in progress

- Correct next-bar backtesting
- Commission, slippage and intrabar stop/target handling
- Normalized market-data provider interface
- Canonical instrument and timeframe types
- Correct candle formation and paper-trading margin accounting
- Standard chart types and Heikin-Ashi transform

### Phase 1 — Research-grade MVP

- Backend API and authentication
- PostgreSQL plus time-series storage
- Licensed or user-supplied historical-data connectors
- Symbol search and instrument master
- Saved layouts, watchlists and strategies
- Reliable single-asset backtest jobs
- Bar replay
- Server-side price and indicator alerts

### Phase 2 — Supercharts parity

- Multi-chart workspace
- Pane engine and scale modes
- Full drawing object model
- Indicator templates
- Non-standard price charts
- Spread/formula charts
- Export and sharing

### Phase 3 — Quant platform

- Sandboxed strategy DSL
- Multi-asset portfolios
- Optimization, walk-forward and Monte Carlo
- Script screener
- Reproducible datasets and run manifests
- Distributed execution workers

### Phase 4 — Trading and licensed data

- Paper-trading execution service
- Broker adapters
- Order book and DOM
- Fundamentals, estimates, news and calendars
- Exchange-grade real-time and tick data

### Phase 5 — Community and commercial platform

- Organizations and plan entitlements
- Script/idea publishing
- Social graph and moderation
- Notifications, billing, usage limits and observability

## Current implementation rules

1. Never label simulated data as historical exchange data.
2. Backtests must declare costs, execution timing, data source and adjustment policy.
3. Provider-specific symbols must be mapped to canonical instruments.
4. Market timestamps are stored in UTC; exchange sessions retain their IANA timezone.
5. User scripts execute in isolated workers with CPU, memory and network limits.
6. Alerts and bots run on servers, never exclusively in a browser tab.
7. All persisted strategy runs record code version, parameters and data version.
8. Licensed datasets are never committed to the repository.

## Definition of parity

A feature is complete only when it has:

- functional UI
- deterministic domain logic
- persistence and API contracts where required
- error states and loading states
- unit/integration tests
- performance limits
- security review where user code, credentials or trading are involved
- documentation and operational telemetry
