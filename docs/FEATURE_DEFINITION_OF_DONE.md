# Feature Definition of Done

A platform feature is not complete merely because a control appears in the UI.

Each feature must include:

- domain behavior and explicit edge cases
- persistent API contract where state must survive reloads
- loading, empty, degraded and error states
- deterministic tests for financial calculations
- data-source and entitlement handling
- performance budget and large-dataset behavior
- keyboard and accessibility behavior
- audit logs for alerts, orders and strategy runs
- security isolation for user code and credentials
- documentation and operational telemetry

Financial calculations additionally require documented assumptions for timestamps, sessions, adjustments, fees, slippage, execution timing, liquidity, leverage and currency conversion.
