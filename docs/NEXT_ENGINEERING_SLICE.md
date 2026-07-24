# Next Engineering Slice

The next pull request should implement the first backend vertical slice rather than adding more browser-only mock features.

## Scope

1. `apps/web`: existing React interface
2. `apps/api`: HTTP API for instruments, bars, layouts and backtest jobs
3. `apps/worker`: asynchronous backtest execution
4. PostgreSQL schema for users, instruments, layouts, strategies and runs
5. Time-series schema for OHLCV bars
6. Redis-backed job queue
7. One historical provider adapter plus CSV/Parquet user import
8. Saved backtest run manifests with strategy and data hashes
9. Unit tests for all execution assumptions introduced in Phase 0
10. Browser UI that explicitly shows provider, delay, adjustment mode and date range

## Acceptance criteria

- Browser reload does not destroy saved layouts or backtest runs
- A backtest executes in a worker, not the React render thread
- Two identical runs against the same data version produce identical results
- Invalid/duplicate bars are reported rather than silently accepted
- Simulated data is visibly marked
- Provider credentials remain server-side
- CI runs type checking, linting and unit tests
