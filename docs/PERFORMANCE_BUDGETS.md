# Initial Performance Budgets

- Initial web bundle: target below 500 KB compressed before optional editors
- Chart interaction: sustain 60 FPS for ordinary pan/zoom operations
- Standard chart load: 10,000 visible bars without blocking the main thread
- Large history: stream/downsample rather than loading unbounded arrays
- Quote propagation: p95 below 250 ms after provider receipt for non-exchange latency
- Saved layout API: p95 below 300 ms
- Alert evaluation lag: p95 below one configured evaluation interval
- Small backtest: p95 below 2 seconds for 100,000 bars on a worker
- Long jobs: cancellable with progress reporting

Budgets are targets, not claims. They require measurement in CI and production telemetry.
