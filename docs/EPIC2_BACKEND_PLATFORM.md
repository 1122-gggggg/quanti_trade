# Epic #2 — Backend, Database, and Multi-Market Historical Data Platform

## Delivered architecture

The repository now includes a complete self-hosted vertical slice:

- **Web terminal** — existing React/Vite application with a backend connection and workspace panel.
- **API service** — dependency-free Node HTTP service with stateful authentication, workspaces, instruments, versioned bars, imports, layouts, watchlists, strategies, jobs, and backtests.
- **Worker service** — Redis-backed asynchronous ingestion and deterministic backtest execution.
- **PostgreSQL/TimescaleDB** — canonical instrument master, sessions, corporate actions, entitlements, immutable datasets, OHLCV bars, users, workspaces, saved research objects, jobs, and append-only audit logs.
- **PostgREST** — private database API used only inside the Docker backend network.
- **Redis** — durable queue transport using the RESP protocol.
- **MinIO** — private object storage for raw CSV, Parquet, and provider payloads.
- **Alpha Vantage adapter** — server-side search and daily ingestion for equities/ETFs/funds/index symbols, FX pairs, and digital currencies.
- **User imports** — asynchronous CSV and Parquet ingestion for every supported asset class.

## Security model

- Browser clients never connect to PostgreSQL, PostgREST, Redis, or MinIO.
- Provider credentials remain in API/worker environment variables.
- Passwords use salted `scrypt` hashes.
- Sessions use random bearer tokens; only SHA-256 token hashes are persisted.
- Workspace membership and role checks are performed by the API on every private resource.
- PostgREST is isolated on the internal Docker network.
- Audit records are append-only at the database layer.
- Raw data objects are private by default.

The development secrets in `.env.example` are intentionally unsuitable for public deployment and must be replaced.

## Data lineage and reproducibility

Every dataset stores:

- canonical instrument ID
- provider and source revision
- interval and adjustment mode
- timezone and date range
- immutable SHA-256 data hash
- raw object key
- row count and structured quality report
- delay and access-scope metadata

Every backtest stores an immutable manifest containing the dataset hash, strategy hash, runtime version, costs, execution assumptions, initial capital, and annualization settings. The worker rejects a run if the dataset hash no longer matches its manifest.

## Data quality controls

The ingestion pipeline:

- validates numeric fields and OHLC invariants
- rejects negative volume
- sorts timestamps
- replaces duplicate timestamps deterministically with the last row
- identifies missing in-session intervals
- separates expected closed-session intervals
- records first/last timestamps and warnings
- hashes normalized bars, not raw vendor formatting

## Historical providers

### Alpha Vantage

Configure `ALPHA_VANTAGE_API_KEY` in `.env`. The adapter supports daily:

- global equities, ETFs, funds, and index symbols through daily time-series endpoints
- FX through `FX_DAILY`
- cryptocurrencies through `DIGITAL_CURRENCY_DAILY`

Provider quotas and redistribution rights remain governed by the provider agreement. The system records attribution and delay metadata but does not grant redistribution rights.

### CSV and Parquet

`POST /v1/imports` accepts:

- UTF-8 CSV text
- base64-encoded Parquet files
- explicit column mappings
- canonical instrument metadata
- interval, timezone, and adjustment mode

Raw files are stored in MinIO before ingestion. Parquet conversion is performed in the worker using pinned PyArrow.

## API overview

Public endpoints:

- `GET /health`
- `GET /openapi.json`
- `POST /v1/auth/register`
- `POST /v1/auth/login`

Authenticated endpoints:

- `POST /v1/auth/logout`
- `GET /v1/me`
- `GET|POST /v1/workspaces`
- `GET /v1/instruments`
- `GET /v1/bars`
- `GET /v1/providers/alpha-vantage/search`
- `POST /v1/providers/alpha-vantage/ingest`
- `GET|POST /v1/imports`
- `GET|POST /v1/layouts`
- `GET|POST /v1/watchlists`
- `GET|POST /v1/strategies`
- `GET|POST /v1/backtests`
- `GET /v1/backtests/:id`
- `POST /v1/backtests/:id/cancel`
- `GET /v1/jobs/:id`
- `GET /v1/data-sets`

## Local deployment

```bash
cp .env.example .env
# Replace all development credentials and optionally add ALPHA_VANTAGE_API_KEY.
docker compose up -d --build
```

Services:

- Web: `http://localhost:8080`
- API: `http://localhost:8787`
- OpenAPI summary: `http://localhost:8787/openapi.json`
- MinIO console: `http://localhost:9001`

PostgreSQL, PostgREST, Redis, and the MinIO S3 port are not published to the host.

## Validation

```bash
npm ci
npm run lint
npm run test:platform
npm run check:platform
npm run build
docker compose config
npm run test:integration
```

The integration workflow starts the backend stack, registers a user, creates a workspace, uploads and ingests CSV history, retrieves versioned bars, creates a strategy version, runs an asynchronous backtest, validates the persisted result, and saves a chart layout.

## Production hardening still required before public launch

Epic #2 is functionally complete, but public production operation additionally requires infrastructure choices outside this repository:

- managed secrets or a hardware-backed secret store
- TLS termination and domain configuration
- database backups, point-in-time recovery, replication, and connection pooling
- pinned container digests and vulnerability scanning
- external email verification and account recovery
- provider-specific licensing and entitlement contracts
- capacity planning, telemetry storage, paging, and incident procedures
- malware scanning and import-size policies for untrusted uploads
