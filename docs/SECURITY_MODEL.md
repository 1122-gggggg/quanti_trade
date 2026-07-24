# Security Model

## User strategy execution

- Execute untrusted strategies in isolated workers or microVMs.
- Disable network access by default.
- Enforce CPU, memory, execution-time and output-size limits.
- Use immutable input datasets and deterministic clocks.
- Never expose provider or broker secrets to strategy code.
- Record code hash, runtime version and resource usage for every run.

## Broker connectivity

- Keep credentials in a managed secrets vault.
- Prefer OAuth where supported.
- Encrypt tokens at rest and in transit.
- Separate read, trade and withdrawal scopes; never request withdrawal scope.
- Require explicit confirmation for live-trading enablement.
- Maintain idempotency keys and immutable order audit logs.
- Add per-account notional, leverage and loss limits.

## Alerts and webhooks

- Sign outbound webhook payloads.
- Retry with bounded exponential backoff.
- Deduplicate alert events.
- Prevent SSRF through destination validation.
- Rate-limit creation, evaluation and delivery.

## Market data

- Enforce provider entitlements at the API boundary.
- Do not cache or redistribute data beyond license terms.
- Log source, delay status and revision for every delivered dataset.
