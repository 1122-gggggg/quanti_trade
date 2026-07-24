# Browser Prototype Migration Plan

1. Preserve the current Vite app as `apps/web`.
2. Extract financial domain types into a shared package.
3. Move market-data provider contracts and backtest execution into server packages.
4. Add API schemas before replacing browser-local state.
5. Migrate layouts, watchlists, strategies and portfolios from local storage to PostgreSQL.
6. Move alerts, bots and backtests into queue-backed workers.
7. Retain local simulation only as an explicitly labelled demo provider.
8. Introduce licensed providers behind server-side adapters and entitlement checks.
9. Add compatibility migrations for saved browser state.
10. Remove browser execution paths only after server equivalents pass parity tests.
