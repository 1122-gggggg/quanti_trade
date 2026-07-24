# Implementation Backlog

## P0 — Required before adding more UI

- [x] Remove same-bar lookahead from built-in backtests
- [x] Add commissions, slippage, intrabar stop/target policy
- [x] Fix leveraged paper-account margin and PnL accounting
- [x] Correct real-time candle rollover
- [x] Add canonical instrument/timeframe/provider contracts
- [ ] Add unit tests for backtest fills, metrics, candle transforms and margin
- [ ] Add a backend service and persistent database
- [ ] Replace simulated history with clearly attributed provider datasets

## P1 — Research-grade platform

- [ ] Authentication and user workspaces
- [ ] Instrument master and full symbol search
- [ ] Multi-provider historical OHLCV ingestion
- [ ] Exchange calendars, sessions and timezones
- [ ] Corporate actions and adjusted/unadjusted series
- [ ] Saved watchlists, layouts and indicator templates
- [ ] Asynchronous backtest jobs with immutable run manifests
- [ ] Server-side price and indicator alerts
- [ ] Bar replay with strict no-future-data evaluation

## P2 — Supercharts workspace

- [ ] Multi-pane chart engine
- [ ] 1–16 chart grid layouts
- [ ] Symbol, interval, crosshair and date-range synchronization
- [ ] Logarithmic, percentage and indexed scales
- [ ] Compare symbols and spread/formula series
- [ ] Full drawing object model and object tree
- [ ] Drawing templates, lock/hide and synchronization
- [ ] Renko, Kagi, line break, point-and-figure and range charts
- [ ] Volume profile, TPO and footprint charts
- [ ] Chart/data export and sharing

## P3 — Quant and scripting

- [ ] Sandboxed strategy DSL
- [ ] Editor diagnostics, autocomplete and documentation hover
- [ ] Indicator and strategy versioning
- [ ] Multi-symbol and multi-timeframe requests
- [ ] Multi-asset portfolio backtester
- [ ] Limit, stop, stop-limit and partial-fill execution
- [ ] Bid/ask spread and liquidity models
- [ ] Futures rolls, options contracts and expiration handling
- [ ] Parameter search and optimization workers
- [ ] Walk-forward and Monte Carlo analysis
- [ ] Custom-script screener

## P4 — Trading and licensed content

- [ ] Durable paper-trading execution service
- [ ] Chart trading and draggable orders
- [ ] Bracket/OCO orders
- [ ] Broker/exchange adapter SDK
- [ ] Secrets vault and OAuth/API-key lifecycle
- [ ] Order book and DOM
- [ ] Fundamentals and estimates
- [ ] News and economic/earnings/dividend calendars
- [ ] Real-time exchange feeds and tick history

## P5 — Community and operations

- [ ] Script and idea publishing
- [ ] Profiles, follows, comments and notifications
- [ ] Moderation, abuse prevention and copyright workflows
- [ ] Organizations, plans and entitlements
- [ ] Billing and usage limits
- [ ] Audit logs, observability and incident response
- [ ] Data retention and regional compliance controls
