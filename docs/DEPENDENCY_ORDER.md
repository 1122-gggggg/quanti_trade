# Feature Dependency Order

1. Instrument master, sessions and licensed data contracts
2. Persistent backend, authentication and workspace storage
3. Historical storage, ingestion and reproducible datasets
4. Worker queue and deterministic backtest execution
5. Multi-chart/pane workspace and drawing object model
6. Strategy DSL and custom indicator runtime
7. Server-side alerts, screeners and replay
8. Durable paper execution and broker adapters
9. Licensed fundamentals, news, order book and tick data
10. Community publishing, moderation and commercial entitlements

Features should not bypass their dependencies with browser-only mock state except in an explicitly labelled demo mode.
