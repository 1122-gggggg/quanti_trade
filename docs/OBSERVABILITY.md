# Observability Requirements

Track at minimum:

- market-data freshness, gaps, duplicates and provider errors
- WebSocket reconnects and subscription lag
- API latency and error rates
- backtest queue depth, runtime, memory and failures
- alert evaluation lag, trigger counts and delivery failures
- paper/live order acknowledgement and rejection rates
- broker adapter availability
- database and cache saturation
- user strategy sandbox violations

Every backtest, alert, order and data-ingestion job must carry a correlation ID. Financial events require immutable audit records separate from mutable application logs.
