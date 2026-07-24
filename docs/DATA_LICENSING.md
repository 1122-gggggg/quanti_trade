# Market Data and Licensing Boundaries

A TradingView-equivalent product is primarily a data and infrastructure product. The application must not imply that it can legally redistribute every market shown by TradingView merely because a technical connector exists.

## Data classes

| Data class | Typical requirement | Repository policy |
|---|---|---|
| Delayed/end-of-day OHLCV | Provider agreement or open-data terms | Store connector code only; record provider attribution |
| Real-time exchange quotes | Exchange entitlement and per-user reporting | Never expose without entitlement checks |
| Tick/trade/order-book history | Commercial license and substantial storage | Keep outside Git; partition in object/time-series storage |
| Fundamentals and estimates | Commercial vendor license | Do not scrape or redistribute without permission |
| News | Publisher/vendor license | Store references and licensed content according to terms |
| Broker account/order data | Broker approval, authentication and regional rules | Encrypt credentials; use a secrets vault |

## Required metadata for every series

- provider
- canonical instrument ID
- provider symbol
- exchange/venue
- currency
- timezone and trading session
- interval
- adjustment mode
- delayed/real-time status
- ingestion timestamp
- source revision or data version
- redistribution entitlement

## UI requirements

Every chart and backtest must expose the data source, delay status, adjustment mode and loaded date range. Simulated data must be visibly labelled `SIMULATED` and must never be described as historical market data.

## Backtest reproducibility

A saved run must reference immutable data partitions or hashes. Re-running a strategy against revised vendor history must create a new run version rather than silently replacing the original result.
