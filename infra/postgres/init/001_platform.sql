\set ON_ERROR_STOP on

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS timescaledb;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'TimescaleDB extension unavailable; app.bars will remain a native PostgreSQL table: %', SQLERRM;
END $$;

CREATE SCHEMA IF NOT EXISTS app;
REVOKE ALL ON SCHEMA app FROM PUBLIC;
GRANT USAGE ON SCHEMA app TO api_service;

CREATE OR REPLACE FUNCTION app.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS app.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE,
  password_hash text NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_active_idx ON app.sessions(user_id, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS app.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES app.users(id),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.workspace_members (
  workspace_id uuid NOT NULL REFERENCES app.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('viewer', 'editor', 'admin', 'owner')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS app.trading_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  timezone text NOT NULL,
  weekly_schedule jsonb NOT NULL,
  holidays jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.instruments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_symbol text NOT NULL,
  provider text NOT NULL,
  provider_symbol text NOT NULL,
  asset_class text NOT NULL CHECK (asset_class IN ('stock', 'etf', 'crypto', 'forex', 'commodity', 'index', 'bond', 'future', 'option', 'fund', 'economic')),
  venue text NOT NULL,
  name text NOT NULL,
  currency text NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  session_id uuid REFERENCES app.trading_sessions(id),
  tick_size numeric,
  price_precision integer,
  contract_multiplier numeric NOT NULL DEFAULT 1,
  expiration_date date,
  underlying_instrument_id uuid REFERENCES app.instruments(id),
  strike numeric,
  option_right text CHECK (option_right IN ('call', 'put')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_symbol, venue)
);
CREATE INDEX IF NOT EXISTS instruments_symbol_idx ON app.instruments(canonical_symbol);
CREATE INDEX IF NOT EXISTS instruments_class_venue_idx ON app.instruments(asset_class, venue) WHERE active;

CREATE TABLE IF NOT EXISTS app.instrument_aliases (
  provider text NOT NULL,
  alias_symbol text NOT NULL,
  instrument_id uuid NOT NULL REFERENCES app.instruments(id) ON DELETE CASCADE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (provider, alias_symbol)
);

CREATE TABLE IF NOT EXISTS app.corporate_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id uuid NOT NULL REFERENCES app.instruments(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('split', 'dividend', 'spinoff', 'symbol_change', 'delisting')),
  ex_timestamp timestamptz NOT NULL,
  ratio numeric,
  cash_amount numeric,
  currency text,
  new_symbol text,
  provider text NOT NULL,
  source_revision text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(instrument_id, action_type, ex_timestamp, provider, source_revision)
);
CREATE INDEX IF NOT EXISTS corporate_actions_instrument_time_idx ON app.corporate_actions(instrument_id, ex_timestamp DESC);

CREATE TABLE IF NOT EXISTS app.data_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES app.workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL,
  market text NOT NULL,
  realtime boolean NOT NULL DEFAULT false,
  delay_seconds integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, provider, market)
);

CREATE TABLE IF NOT EXISTS app.data_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES app.workspaces(id) ON DELETE CASCADE,
  instrument_id uuid NOT NULL REFERENCES app.instruments(id),
  provider text NOT NULL,
  source_revision text NOT NULL,
  interval text NOT NULL,
  adjustment_mode text NOT NULL DEFAULT 'raw' CHECK (adjustment_mode IN ('raw', 'split', 'total_return')),
  timezone text NOT NULL DEFAULT 'UTC',
  from_ts timestamptz NOT NULL,
  to_ts timestamptz NOT NULL,
  data_hash text NOT NULL,
  row_count bigint NOT NULL,
  quality_report jsonb NOT NULL,
  raw_object_key text,
  delay_seconds integer NOT NULL DEFAULT 0,
  access_scope text NOT NULL DEFAULT 'workspace' CHECK (access_scope IN ('private', 'workspace', 'public')),
  immutable boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(instrument_id, interval, adjustment_mode, data_hash)
);
CREATE INDEX IF NOT EXISTS data_sets_lookup_idx ON app.data_sets(instrument_id, interval, created_at DESC);
CREATE INDEX IF NOT EXISTS data_sets_workspace_idx ON app.data_sets(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS app.bars (
  dataset_id uuid NOT NULL REFERENCES app.data_sets(id) ON DELETE CASCADE,
  instrument_id uuid NOT NULL REFERENCES app.instruments(id),
  interval text NOT NULL,
  ts timestamptz NOT NULL,
  open numeric NOT NULL CHECK (open > 0),
  high numeric NOT NULL CHECK (high > 0),
  low numeric NOT NULL CHECK (low > 0),
  close numeric NOT NULL CHECK (close > 0),
  volume numeric NOT NULL DEFAULT 0 CHECK (volume >= 0),
  vwap numeric,
  trade_count bigint,
  source_revision text NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dataset_id, instrument_id, interval, ts),
  CHECK (high >= GREATEST(open, close)),
  CHECK (low <= LEAST(open, close))
);
CREATE INDEX IF NOT EXISTS bars_instrument_interval_time_idx ON app.bars(instrument_id, interval, ts DESC);
DO $$
BEGIN
  PERFORM create_hypertable('app.bars', 'ts', if_not_exists => TRUE, migrate_data => TRUE, chunk_time_interval => INTERVAL '7 days');
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'create_hypertable unavailable; using native app.bars table';
WHEN OTHERS THEN
  RAISE NOTICE 'Could not convert app.bars to hypertable: %', SQLERRM;
END $$;

CREATE TABLE IF NOT EXISTS app.imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES app.workspaces(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES app.users(id),
  object_key text NOT NULL,
  format text NOT NULL CHECK (format IN ('csv', 'parquet')),
  interval text NOT NULL,
  adjustment_mode text NOT NULL CHECK (adjustment_mode IN ('raw', 'split', 'total_return')),
  instrument_spec jsonb NOT NULL,
  mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  timezone text NOT NULL DEFAULT 'UTC',
  source_name text NOT NULL DEFAULT 'user_import',
  raw_hash text NOT NULL,
  status text NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  dataset_id uuid REFERENCES app.data_sets(id),
  quality_report jsonb,
  error jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS imports_workspace_created_idx ON app.imports(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS app.layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES app.workspaces(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES app.users(id),
  name text NOT NULL,
  layout_state jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS layouts_workspace_idx ON app.layouts(workspace_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS app.watchlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES app.workspaces(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES app.users(id),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app.watchlist_items (
  watchlist_id uuid NOT NULL REFERENCES app.watchlists(id) ON DELETE CASCADE,
  instrument_id uuid NOT NULL REFERENCES app.instruments(id),
  position integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (watchlist_id, instrument_id)
);

CREATE TABLE IF NOT EXISTS app.indicator_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES app.workspaces(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES app.users(id),
  name text NOT NULL,
  template jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES app.workspaces(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES app.users(id),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'workspace', 'public')),
  current_version_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app.strategy_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid NOT NULL REFERENCES app.strategies(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  language text NOT NULL,
  source jsonb NOT NULL,
  source_hash text NOT NULL,
  compiled_config jsonb,
  created_by uuid NOT NULL REFERENCES app.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(strategy_id, version_number),
  UNIQUE(strategy_id, source_hash)
);
ALTER TABLE app.strategies DROP CONSTRAINT IF EXISTS strategies_current_version_id_fkey;
ALTER TABLE app.strategies ADD CONSTRAINT strategies_current_version_id_fkey FOREIGN KEY (current_version_id) REFERENCES app.strategy_versions(id);

CREATE TABLE IF NOT EXISTS app.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('ingest_import', 'provider_ingest', 'backtest')),
  workspace_id uuid NOT NULL REFERENCES app.workspaces(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES app.users(id),
  payload jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('queued', 'running', 'retrying', 'completed', 'failed', 'cancelled')),
  progress numeric NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  attempts integer NOT NULL DEFAULT 0,
  worker_id text,
  correlation_id text NOT NULL,
  result jsonb,
  error jsonb,
  cancellation_requested_at timestamptz,
  heartbeat_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_status_created_idx ON app.jobs(status, created_at);
CREATE INDEX IF NOT EXISTS jobs_workspace_created_idx ON app.jobs(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS app.backtest_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES app.workspaces(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES app.users(id),
  dataset_id uuid NOT NULL REFERENCES app.data_sets(id),
  strategy_version_id uuid REFERENCES app.strategy_versions(id),
  job_id uuid REFERENCES app.jobs(id),
  manifest jsonb NOT NULL,
  manifest_hash text NOT NULL,
  status text NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  result jsonb,
  result_hash text,
  error jsonb,
  cancellation_requested_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS backtest_runs_workspace_created_idx ON app.backtest_runs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS backtest_runs_manifest_idx ON app.backtest_runs(manifest_hash);

CREATE TABLE IF NOT EXISTS app.audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id uuid REFERENCES app.users(id),
  workspace_id uuid REFERENCES app.workspaces(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  correlation_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_workspace_time_idx ON app.audit_log(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_correlation_idx ON app.audit_log(correlation_id);

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['users','workspaces','trading_sessions','instruments','layouts','watchlists','indicator_templates','strategies']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_at ON app.%I', table_name, table_name);
    EXECUTE format('CREATE TRIGGER %I_updated_at BEFORE UPDATE ON app.%I FOR EACH ROW EXECUTE FUNCTION app.set_updated_at()', table_name, table_name);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION app.prevent_audit_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$;
DROP TRIGGER IF EXISTS audit_log_immutable ON app.audit_log;
CREATE TRIGGER audit_log_immutable BEFORE UPDATE OR DELETE ON app.audit_log FOR EACH ROW EXECUTE FUNCTION app.prevent_audit_mutation();

INSERT INTO app.trading_sessions(id, code, name, timezone, weekly_schedule)
VALUES
  ('00000000-0000-0000-0000-000000000001', '24X7', '24 hours / 7 days', 'UTC', '[{"start":0,"end":10080}]'),
  ('00000000-0000-0000-0000-000000000002', 'XNYS', 'NYSE regular session', 'America/New_York', '[{"start":2010,"end":2400},{"start":3450,"end":3840},{"start":4890,"end":5280},{"start":6330,"end":6720},{"start":7770,"end":8160}]'),
  ('00000000-0000-0000-0000-000000000003', 'XTAI', 'Taiwan Stock Exchange regular session', 'Asia/Taipei', '[{"start":1980,"end":2250},{"start":3420,"end":3690},{"start":4860,"end":5130},{"start":6300,"end":6570},{"start":7740,"end":8010}]'),
  ('00000000-0000-0000-0000-000000000004', 'FX_24X5', 'Foreign exchange trading week', 'America/New_York', '[{"start":1020,"end":8220}]')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  timezone = EXCLUDED.timezone,
  weekly_schedule = EXCLUDED.weekly_schedule;

INSERT INTO app.instruments(id, canonical_symbol, provider, provider_symbol, asset_class, venue, name, currency, timezone, session_id, price_precision, metadata)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'BTC/USD', 'alpha_vantage', 'BTC/USD', 'crypto', 'GLOBAL', 'Bitcoin / US Dollar', 'USD', 'UTC', '00000000-0000-0000-0000-000000000001', 2, '{"seed":true}'),
  ('10000000-0000-0000-0000-000000000002', 'EUR/USD', 'alpha_vantage', 'EUR/USD', 'forex', 'FX', 'Euro / US Dollar', 'USD', 'America/New_York', '00000000-0000-0000-0000-000000000004', 5, '{"seed":true}'),
  ('10000000-0000-0000-0000-000000000003', 'IBM', 'alpha_vantage', 'IBM', 'stock', 'XNYS', 'International Business Machines', 'USD', 'America/New_York', '00000000-0000-0000-0000-000000000002', 2, '{"seed":true}'),
  ('10000000-0000-0000-0000-000000000004', '2330.TW', 'user_import', '2330.TW', 'stock', 'XTAI', 'Taiwan Semiconductor Manufacturing', 'TWD', 'Asia/Taipei', '00000000-0000-0000-0000-000000000003', 2, '{"seed":true}')
ON CONFLICT (id) DO NOTHING;

GRANT USAGE ON SCHEMA app TO api_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO api_service;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO api_service;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO api_service;
REVOKE UPDATE, DELETE ON app.audit_log FROM api_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO api_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT USAGE, SELECT ON SEQUENCES TO api_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT EXECUTE ON FUNCTIONS TO api_service;

NOTIFY pgrst, 'reload schema';
