import http from 'node:http';
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { canonicalJson, sha256, adjustBars } from '../../../packages/platform/src/core.mjs';
import { PostgrestClient } from '../../../packages/platform/src/postgrest.mjs';
import { RedisClient } from '../../../packages/platform/src/redis.mjs';
import { S3Client } from '../../../packages/platform/src/s3.mjs';
import { alphaVantageSearch } from '../../../packages/platform/src/providers.mjs';

const scrypt = promisify(scryptCallback);

const config = Object.freeze({
  port: Number(process.env.PORT ?? 8787),
  postgrestUrl: process.env.POSTGREST_URL ?? 'http://127.0.0.1:3000',
  redisHost: process.env.REDIS_HOST ?? '127.0.0.1',
  redisPort: Number(process.env.REDIS_PORT ?? 6379),
  redisPassword: process.env.REDIS_PASSWORD ?? '',
  redisDatabase: Number(process.env.REDIS_DATABASE ?? 0),
  queueName: process.env.JOB_QUEUE_NAME ?? 'apextrade:jobs',
  sessionTtlSeconds: Number(process.env.SESSION_TTL_SECONDS ?? 2_592_000),
  maxJsonBytes: Number(process.env.MAX_JSON_BYTES ?? 10_000_000),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:8080',
  alphaVantageApiKey: process.env.ALPHA_VANTAGE_API_KEY ?? '',
  s3Endpoint: process.env.S3_ENDPOINT ?? 'http://127.0.0.1:9000',
  s3AccessKey: process.env.S3_ACCESS_KEY ?? 'apextrade',
  s3SecretKey: process.env.S3_SECRET_KEY ?? 'change-me-in-production',
  s3Bucket: process.env.S3_BUCKET ?? 'apextrade-data',
  s3Region: process.env.S3_REGION ?? 'us-east-1',
});

const db = new PostgrestClient({ baseUrl: config.postgrestUrl });
const redis = new RedisClient({
  host: config.redisHost,
  port: config.redisPort,
  password: config.redisPassword,
  database: config.redisDatabase,
});
const objectStorage = new S3Client({
  endpoint: config.s3Endpoint,
  accessKey: config.s3AccessKey,
  secretKey: config.s3SecretKey,
  bucket: config.s3Bucket,
  region: config.s3Region,
});

function sendJson(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(body);
}

function sendError(res, error, requestId) {
  const status = Number(error.statusCode ?? error.status ?? 500);
  const safeStatus = status >= 400 && status < 600 ? status : 500;
  if (safeStatus >= 500) console.error(`[${requestId}]`, error);
  sendJson(res, safeStatus, {
    error: {
      code: error.code ?? (safeStatus === 500 ? 'internal_error' : 'request_error'),
      message: safeStatus === 500 && !error.expose ? 'Internal server error' : error.message,
      requestId,
      details: error.details,
    },
  });
}

function httpError(statusCode, message, code = 'request_error', details) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.expose = true;
  error.details = details;
  return error;
}

async function readJson(req) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > config.maxJsonBytes) throw httpError(413, 'Request body is too large', 'payload_too_large');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw httpError(400, 'Request body must be valid JSON', 'invalid_json');
  }
}

function match(pathname, pattern) {
  const pathParts = pathname.split('/').filter(Boolean);
  const patternParts = pattern.split('/').filter(Boolean);
  if (pathParts.length !== patternParts.length) return null;
  const params = {};
  for (let index = 0; index < pathParts.length; index += 1) {
    const expected = patternParts[index];
    if (expected.startsWith(':')) params[expected.slice(1)] = decodeURIComponent(pathParts[index]);
    else if (expected !== pathParts[index]) return null;
  }
  return params;
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    createdAt: user.created_at,
  };
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('base64url')}$${Buffer.from(derived).toString('base64url')}`;
}

async function verifyPassword(password, encoded) {
  const [algorithm, saltText, hashText] = String(encoded ?? '').split('$');
  if (algorithm !== 'scrypt' || !saltText || !hashText) return false;
  const expected = Buffer.from(hashText, 'base64url');
  const derived = Buffer.from(await scrypt(password, Buffer.from(saltText, 'base64url'), expected.length));
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

async function createSession(userId, metadata = {}) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + (config.sessionTtlSeconds * 1000)).toISOString();
  const [session] = await db.insert('sessions', {
    user_id: userId,
    token_hash: sha256(token),
    expires_at: expiresAt,
    metadata,
  });
  return { token, expiresAt, sessionId: session.id };
}

async function authenticate(req) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) throw httpError(401, 'Authentication is required', 'unauthorized');
  const sessions = await db.query('sessions', {
    filters: {
      token_hash: sha256(token),
      revoked_at: 'is.null',
      expires_at: `gt.${new Date().toISOString()}`,
    },
    limit: 1,
  });
  const session = sessions[0];
  if (!session) throw httpError(401, 'Session is invalid or expired', 'invalid_session');
  const users = await db.query('users', { filters: { id: session.user_id }, limit: 1 });
  if (!users[0]) throw httpError(401, 'Session user no longer exists', 'invalid_session');
  return { token, session, user: users[0] };
}

async function workspaceIdsForUser(userId) {
  const rows = await db.query('workspace_members', { filters: { user_id: userId }, select: 'workspace_id' });
  return rows.map((row) => row.workspace_id);
}

async function requireWorkspace(userId, workspaceId, minimumRole = 'viewer') {
  if (!workspaceId) throw httpError(400, 'workspaceId is required', 'workspace_required');
  const memberships = await db.query('workspace_members', {
    filters: { user_id: userId, workspace_id: workspaceId },
    limit: 1,
  });
  const membership = memberships[0];
  if (!membership) throw httpError(403, 'Workspace access denied', 'workspace_forbidden');
  const ranks = { viewer: 0, editor: 1, admin: 2, owner: 3 };
  if ((ranks[membership.role] ?? -1) < ranks[minimumRole]) {
    throw httpError(403, `Workspace role ${minimumRole} is required`, 'workspace_role_required');
  }
  return membership;
}

async function audit({ userId = null, workspaceId = null, action, entityType, entityId = null, requestId, metadata = {} }) {
  try {
    await db.insert('audit_log', {
      actor_user_id: userId,
      workspace_id: workspaceId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      correlation_id: requestId,
      metadata,
    });
  } catch (error) {
    console.error(`[${requestId}] audit write failed`, error);
  }
}

async function enqueueJob({ type, workspaceId, userId, payload, requestId }) {
  const [job] = await db.insert('jobs', {
    type,
    workspace_id: workspaceId,
    requested_by: userId,
    payload,
    status: 'queued',
    correlation_id: requestId,
  });
  await redis.push(config.queueName, { jobId: job.id, correlationId: requestId });
  return job;
}

function openApiDocument() {
  return {
    openapi: '3.1.0',
    info: { title: 'ApexTrade Platform API', version: '1.0.0' },
    servers: [{ url: '/v1' }],
    paths: {
      '/auth/register': { post: { summary: 'Register a user and create a default workspace' } },
      '/auth/login': { post: { summary: 'Create a stateful bearer session' } },
      '/workspaces': { get: { summary: 'List workspaces' }, post: { summary: 'Create workspace' } },
      '/instruments': { get: { summary: 'Search canonical instrument master' } },
      '/bars': { get: { summary: 'Read versioned OHLCV bars with source metadata' } },
      '/imports': { post: { summary: 'Upload CSV or Parquet history to object storage and enqueue ingestion' } },
      '/providers/alpha-vantage/ingest': { post: { summary: 'Enqueue a server-side provider ingestion' } },
      '/backtests': { get: { summary: 'List saved runs' }, post: { summary: 'Enqueue deterministic backtest' } },
      '/layouts': { get: { summary: 'List saved layouts' }, post: { summary: 'Save layout' } },
      '/strategies': { get: { summary: 'List strategies' }, post: { summary: 'Create versioned strategy' } },
    },
  };
}

async function register(body, req) {
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const displayName = String(body.displayName ?? email.split('@')[0] ?? '').trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw httpError(400, 'A valid email is required', 'invalid_email');
  if (password.length < 10) throw httpError(400, 'Password must contain at least 10 characters', 'weak_password');
  const existing = await db.query('users', { filters: { email }, limit: 1 });
  if (existing.length) throw httpError(409, 'An account already exists for this email', 'email_exists');
  const [user] = await db.insert('users', {
    email,
    password_hash: await hashPassword(password),
    display_name: displayName || 'ApexTrade User',
  });
  const [workspace] = await db.insert('workspaces', {
    owner_user_id: user.id,
    name: `${user.display_name}'s Workspace`,
    slug: `${user.id.slice(0, 8)}-default`,
    settings: { baseCurrency: 'USD', timezone: 'UTC' },
  });
  await db.insert('workspace_members', { workspace_id: workspace.id, user_id: user.id, role: 'owner' });
  const session = await createSession(user.id, { userAgent: req.headers['user-agent'] ?? null });
  return { user: publicUser(user), workspace, session };
}

async function login(body, req) {
  const email = String(body.email ?? '').trim().toLowerCase();
  const users = await db.query('users', { filters: { email }, limit: 1 });
  const user = users[0];
  if (!user || !(await verifyPassword(String(body.password ?? ''), user.password_hash))) {
    throw httpError(401, 'Email or password is incorrect', 'invalid_credentials');
  }
  const session = await createSession(user.id, { userAgent: req.headers['user-agent'] ?? null });
  return { user: publicUser(user), session };
}

async function listWorkspaces(userId) {
  const ids = await workspaceIdsForUser(userId);
  if (!ids.length) return [];
  return db.query('workspaces', { filters: { id: `in.(${ids.join(',')})` }, order: 'created_at.asc' });
}

async function listInstruments(url) {
  const params = new URLSearchParams({
    select: 'id,canonical_symbol,provider,provider_symbol,asset_class,venue,name,currency,timezone,session_id,tick_size,price_precision,contract_multiplier,metadata,active',
    active: 'eq.true',
    order: 'canonical_symbol.asc',
    limit: String(Math.min(200, Number(url.searchParams.get('limit') ?? 50))),
  });
  const query = url.searchParams.get('query')?.trim();
  const assetClass = url.searchParams.get('assetClass');
  const venue = url.searchParams.get('venue');
  if (query) params.set('or', `(canonical_symbol.ilike.*${query.replace(/[,*()]/g, '')}*,name.ilike.*${query.replace(/[,*()]/g, '')}*)`);
  if (assetClass) params.set('asset_class', `eq.${assetClass}`);
  if (venue) params.set('venue', `eq.${venue}`);
  return db.request(`instruments?${params.toString()}`);
}

async function accessibleDataset(userId, { datasetId, instrumentId, interval, workspaceId }) {
  let rows;
  if (datasetId) rows = await db.query('data_sets', { filters: { id: datasetId }, limit: 1 });
  else {
    rows = await db.query('data_sets', {
      filters: { instrument_id: instrumentId, interval },
      order: 'created_at.desc',
      limit: 50,
    });
  }
  const workspaceIds = await workspaceIdsForUser(userId);
  if (workspaceId && !workspaceIds.includes(workspaceId)) throw httpError(403, 'Workspace access denied', 'workspace_forbidden');
  const dataset = rows.find((row) => row.access_scope === 'public' || workspaceIds.includes(row.workspace_id));
  if (!dataset) throw httpError(404, 'No accessible dataset matched the request', 'dataset_not_found');
  return dataset;
}

async function readBars(userId, url) {
  const dataset = await accessibleDataset(userId, {
    datasetId: url.searchParams.get('datasetId'),
    instrumentId: url.searchParams.get('instrumentId'),
    interval: url.searchParams.get('interval') ?? '1D',
    workspaceId: url.searchParams.get('workspaceId'),
  });
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const filters = { dataset_id: dataset.id };
  if (from) filters.ts = `gte.${new Date(Number(from) * 1000).toISOString()}`;
  const extra = {};
  if (to) extra.and = `(ts.lte.${new Date(Number(to) * 1000).toISOString()})`;
  const rows = await db.query('bars', {
    filters,
    order: 'ts.asc',
    limit: Math.min(200_000, Number(url.searchParams.get('limit') ?? 20_000)),
    extra,
  });
  let bars = rows.map((row) => ({
    time: Math.floor(Date.parse(row.ts) / 1000),
    open: Number(row.open),
    high: Number(row.high),
    low: Number(row.low),
    close: Number(row.close),
    volume: Number(row.volume),
    vwap: row.vwap == null ? null : Number(row.vwap),
    tradeCount: row.trade_count == null ? null : Number(row.trade_count),
  }));
  const adjustmentMode = url.searchParams.get('adjustmentMode') ?? dataset.adjustment_mode ?? 'raw';
  if (adjustmentMode !== 'raw') {
    const actions = await db.query('corporate_actions', {
      filters: { instrument_id: dataset.instrument_id },
      order: 'ex_timestamp.desc',
    });
    bars = adjustBars(bars, actions.map((action) => ({
      actionType: action.action_type,
      exTimestamp: Math.floor(Date.parse(action.ex_timestamp) / 1000),
      ratio: action.ratio,
      cashAmount: action.cash_amount,
    })), adjustmentMode);
  }
  const instruments = await db.query('instruments', { filters: { id: dataset.instrument_id }, limit: 1 });
  return {
    data: bars,
    meta: {
      datasetId: dataset.id,
      instrument: instruments[0] ?? null,
      provider: dataset.provider,
      sourceRevision: dataset.source_revision,
      dataHash: dataset.data_hash,
      delaySeconds: dataset.delay_seconds,
      interval: dataset.interval,
      adjustmentMode,
      timezone: dataset.timezone,
      from: bars[0]?.time ?? null,
      to: bars.at(-1)?.time ?? null,
      quality: dataset.quality_report,
      immutable: dataset.immutable,
    },
  };
}

async function createImport(user, body, requestId) {
  await requireWorkspace(user.id, body.workspaceId, 'editor');
  const format = String(body.format ?? 'csv').toLowerCase();
  if (!['csv', 'parquet'].includes(format)) throw httpError(400, 'format must be csv or parquet', 'invalid_import_format');
  const content = format === 'csv'
    ? Buffer.from(String(body.csv ?? body.content ?? ''), 'utf8')
    : Buffer.from(String(body.contentBase64 ?? ''), 'base64');
  if (!content.length) throw httpError(400, 'Import content is empty', 'empty_import');
  const importId = randomUUID();
  const objectKey = `raw/${body.workspaceId}/${importId}.${format}`;
  await objectStorage.putObject(objectKey, content, format === 'csv' ? 'text/csv' : 'application/vnd.apache.parquet');
  const [record] = await db.insert('imports', {
    id: importId,
    workspace_id: body.workspaceId,
    requested_by: user.id,
    object_key: objectKey,
    format,
    interval: body.interval ?? '1D',
    adjustment_mode: body.adjustmentMode ?? 'raw',
    instrument_spec: body.instrument,
    mapping: body.mapping ?? {},
    timezone: body.timezone ?? body.instrument?.timezone ?? 'UTC',
    status: 'queued',
    source_name: body.sourceName ?? 'user_import',
    raw_hash: sha256(content),
  });
  const job = await enqueueJob({
    type: 'ingest_import',
    workspaceId: body.workspaceId,
    userId: user.id,
    requestId,
    payload: { importId: record.id },
  });
  return { import: record, job };
}

async function createProviderIngest(user, body, requestId) {
  await requireWorkspace(user.id, body.workspaceId, 'editor');
  if (!body.instrumentId) throw httpError(400, 'instrumentId is required', 'instrument_required');
  const instruments = await db.query('instruments', { filters: { id: body.instrumentId }, limit: 1 });
  if (!instruments[0]) throw httpError(404, 'Instrument not found', 'instrument_not_found');
  const job = await enqueueJob({
    type: 'provider_ingest',
    workspaceId: body.workspaceId,
    userId: user.id,
    requestId,
    payload: {
      provider: 'alpha_vantage',
      instrumentId: body.instrumentId,
      interval: body.interval ?? '1D',
      outputSize: body.outputSize ?? 'compact',
      adjustmentMode: body.adjustmentMode ?? 'raw',
      accessScope: body.accessScope ?? 'workspace',
    },
  });
  return { job };
}

async function createBacktest(user, body, requestId) {
  await requireWorkspace(user.id, body.workspaceId, 'editor');
  const dataset = await accessibleDataset(user.id, { datasetId: body.datasetId, workspaceId: body.workspaceId });
  let strategy = body.strategy ?? null;
  let strategyVersion = null;
  if (body.strategyVersionId) {
    const rows = await db.query('strategy_versions', { filters: { id: body.strategyVersionId }, limit: 1 });
    strategyVersion = rows[0];
    if (!strategyVersion) throw httpError(404, 'Strategy version not found', 'strategy_version_not_found');
    strategy = strategyVersion.compiled_config ?? strategyVersion.source;
  }
  if (!strategy || typeof strategy !== 'object') throw httpError(400, 'A built-in strategy configuration is required', 'strategy_required');
  const manifest = {
    manifestVersion: 1,
    dataset: {
      id: dataset.id,
      hash: dataset.data_hash,
      provider: dataset.provider,
      sourceRevision: dataset.source_revision,
      interval: dataset.interval,
      adjustmentMode: dataset.adjustment_mode,
    },
    strategy,
    strategyVersionId: strategyVersion?.id ?? null,
    strategyHash: strategyVersion?.source_hash ?? sha256(strategy),
    initialCapital: Number(body.initialCapital ?? 10_000),
    execution: body.execution ?? {},
    annualizationPeriods: Number(body.annualizationPeriods ?? 252),
    riskFreeRatePercent: Number(body.riskFreeRatePercent ?? 0),
    runtimeVersion: 'apextrade-backtest-v1',
  };
  const manifestHash = sha256(manifest);
  const [run] = await db.insert('backtest_runs', {
    workspace_id: body.workspaceId,
    requested_by: user.id,
    dataset_id: dataset.id,
    strategy_version_id: strategyVersion?.id ?? null,
    manifest,
    manifest_hash: manifestHash,
    status: 'queued',
  });
  const job = await enqueueJob({
    type: 'backtest',
    workspaceId: body.workspaceId,
    userId: user.id,
    requestId,
    payload: { runId: run.id },
  });
  await db.update('backtest_runs', { id: run.id }, { job_id: job.id });
  return { run: { ...run, job_id: job.id }, job };
}

async function createStrategy(user, body) {
  await requireWorkspace(user.id, body.workspaceId, 'editor');
  const [strategy] = await db.insert('strategies', {
    workspace_id: body.workspaceId,
    owner_user_id: user.id,
    name: String(body.name ?? 'Untitled Strategy'),
    description: String(body.description ?? ''),
    visibility: body.visibility ?? 'private',
  });
  const source = body.source ?? body.config ?? { type: 'SMA_CROSSOVER', fastPeriod: 9, slowPeriod: 21 };
  const [version] = await db.insert('strategy_versions', {
    strategy_id: strategy.id,
    version_number: 1,
    language: body.language ?? 'builtin-json',
    source,
    source_hash: sha256(source),
    compiled_config: typeof source === 'object' ? source : null,
    created_by: user.id,
  });
  await db.update('strategies', { id: strategy.id }, { current_version_id: version.id });
  return { strategy: { ...strategy, current_version_id: version.id }, version };
}

async function handleRequest(req, res) {
  const requestId = req.headers['x-request-id']?.toString() || randomUUID();
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Access-Control-Allow-Origin', config.corsOrigin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      const checks = await Promise.allSettled([
        db.query('instruments', { select: 'id', limit: 1 }),
        redis.ping(),
      ]);
      const healthy = checks.every((result) => result.status === 'fulfilled');
      sendJson(res, healthy ? 200 : 503, {
        status: healthy ? 'ok' : 'degraded',
        service: 'apextrade-api',
        checks: { database: checks[0].status, redis: checks[1].status },
        requestId,
      });
      return;
    }
    if (req.method === 'GET' && url.pathname === '/openapi.json') {
      sendJson(res, 200, openApiDocument());
      return;
    }
    if (req.method === 'POST' && url.pathname === '/v1/auth/register') {
      const result = await register(await readJson(req), req);
      await audit({ userId: result.user.id, workspaceId: result.workspace.id, action: 'auth.register', entityType: 'user', entityId: result.user.id, requestId });
      sendJson(res, 201, result);
      return;
    }
    if (req.method === 'POST' && url.pathname === '/v1/auth/login') {
      const result = await login(await readJson(req), req);
      await audit({ userId: result.user.id, action: 'auth.login', entityType: 'session', entityId: result.session.sessionId, requestId });
      sendJson(res, 200, result);
      return;
    }

    const auth = await authenticate(req);
    if (req.method === 'POST' && url.pathname === '/v1/auth/logout') {
      await db.update('sessions', { id: auth.session.id }, { revoked_at: new Date().toISOString() });
      await audit({ userId: auth.user.id, action: 'auth.logout', entityType: 'session', entityId: auth.session.id, requestId });
      sendJson(res, 200, { success: true });
      return;
    }
    if (req.method === 'GET' && url.pathname === '/v1/me') {
      sendJson(res, 200, { user: publicUser(auth.user), workspaces: await listWorkspaces(auth.user.id) });
      return;
    }
    if (req.method === 'GET' && url.pathname === '/v1/workspaces') {
      sendJson(res, 200, { data: await listWorkspaces(auth.user.id) });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/v1/workspaces') {
      const body = await readJson(req);
      const [workspace] = await db.insert('workspaces', {
        owner_user_id: auth.user.id,
        name: String(body.name ?? 'New Workspace'),
        slug: `${String(body.name ?? 'workspace').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)}-${randomUUID().slice(0, 6)}`,
        settings: body.settings ?? { baseCurrency: 'USD', timezone: 'UTC' },
      });
      await db.insert('workspace_members', { workspace_id: workspace.id, user_id: auth.user.id, role: 'owner' });
      await audit({ userId: auth.user.id, workspaceId: workspace.id, action: 'workspace.create', entityType: 'workspace', entityId: workspace.id, requestId });
      sendJson(res, 201, { workspace });
      return;
    }
    if (req.method === 'GET' && url.pathname === '/v1/instruments') {
      sendJson(res, 200, { data: await listInstruments(url) });
      return;
    }
    if (req.method === 'GET' && url.pathname === '/v1/bars') {
      sendJson(res, 200, await readBars(auth.user.id, url));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/v1/providers/alpha-vantage/search') {
      const query = url.searchParams.get('query') ?? '';
      if (!query.trim()) throw httpError(400, 'query is required', 'query_required');
      sendJson(res, 200, { data: await alphaVantageSearch(query, config.alphaVantageApiKey) });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/v1/providers/alpha-vantage/ingest') {
      const result = await createProviderIngest(auth.user, await readJson(req), requestId);
      await audit({ userId: auth.user.id, workspaceId: result.job.workspace_id, action: 'ingestion.queue', entityType: 'job', entityId: result.job.id, requestId, metadata: { provider: 'alpha_vantage' } });
      sendJson(res, 202, result);
      return;
    }
    if (req.method === 'POST' && url.pathname === '/v1/imports') {
      const result = await createImport(auth.user, await readJson(req), requestId);
      await audit({ userId: auth.user.id, workspaceId: result.import.workspace_id, action: 'import.queue', entityType: 'import', entityId: result.import.id, requestId });
      sendJson(res, 202, result);
      return;
    }
    if (req.method === 'GET' && url.pathname === '/v1/imports') {
      const workspaceId = url.searchParams.get('workspaceId');
      await requireWorkspace(auth.user.id, workspaceId);
      sendJson(res, 200, { data: await db.query('imports', { filters: { workspace_id: workspaceId }, order: 'created_at.desc', limit: 200 }) });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/v1/backtests') {
      const result = await createBacktest(auth.user, await readJson(req), requestId);
      await audit({ userId: auth.user.id, workspaceId: result.run.workspace_id, action: 'backtest.queue', entityType: 'backtest_run', entityId: result.run.id, requestId });
      sendJson(res, 202, result);
      return;
    }
    if (req.method === 'GET' && url.pathname === '/v1/backtests') {
      const workspaceId = url.searchParams.get('workspaceId');
      await requireWorkspace(auth.user.id, workspaceId);
      sendJson(res, 200, { data: await db.query('backtest_runs', { filters: { workspace_id: workspaceId }, order: 'created_at.desc', limit: 200 }) });
      return;
    }
    let params = match(url.pathname, '/v1/backtests/:id');
    if (params && req.method === 'GET') {
      const rows = await db.query('backtest_runs', { filters: { id: params.id }, limit: 1 });
      if (!rows[0]) throw httpError(404, 'Backtest run not found', 'backtest_not_found');
      await requireWorkspace(auth.user.id, rows[0].workspace_id);
      sendJson(res, 200, { run: rows[0] });
      return;
    }
    params = match(url.pathname, '/v1/backtests/:id/cancel');
    if (params && req.method === 'POST') {
      const rows = await db.query('backtest_runs', { filters: { id: params.id }, limit: 1 });
      if (!rows[0]) throw httpError(404, 'Backtest run not found', 'backtest_not_found');
      await requireWorkspace(auth.user.id, rows[0].workspace_id, 'editor');
      await db.update('backtest_runs', { id: params.id }, { cancellation_requested_at: new Date().toISOString() });
      if (rows[0].job_id) await db.update('jobs', { id: rows[0].job_id }, { cancellation_requested_at: new Date().toISOString() });
      sendJson(res, 202, { success: true });
      return;
    }
    params = match(url.pathname, '/v1/jobs/:id');
    if (params && req.method === 'GET') {
      const rows = await db.query('jobs', { filters: { id: params.id }, limit: 1 });
      if (!rows[0]) throw httpError(404, 'Job not found', 'job_not_found');
      await requireWorkspace(auth.user.id, rows[0].workspace_id);
      sendJson(res, 200, { job: rows[0] });
      return;
    }
    if (req.method === 'GET' && url.pathname === '/v1/layouts') {
      const workspaceId = url.searchParams.get('workspaceId');
      await requireWorkspace(auth.user.id, workspaceId);
      sendJson(res, 200, { data: await db.query('layouts', { filters: { workspace_id: workspaceId }, order: 'updated_at.desc' }) });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/v1/layouts') {
      const body = await readJson(req);
      await requireWorkspace(auth.user.id, body.workspaceId, 'editor');
      const [layout] = await db.insert('layouts', {
        workspace_id: body.workspaceId,
        owner_user_id: auth.user.id,
        name: String(body.name ?? 'Untitled Layout'),
        layout_state: body.layoutState ?? {},
        version: 1,
      });
      sendJson(res, 201, { layout });
      return;
    }
    params = match(url.pathname, '/v1/layouts/:id');
    if (params && req.method === 'PATCH') {
      const rows = await db.query('layouts', { filters: { id: params.id }, limit: 1 });
      if (!rows[0]) throw httpError(404, 'Layout not found', 'layout_not_found');
      await requireWorkspace(auth.user.id, rows[0].workspace_id, 'editor');
      const body = await readJson(req);
      const [layout] = await db.update('layouts', { id: params.id }, {
        name: body.name ?? rows[0].name,
        layout_state: body.layoutState ?? rows[0].layout_state,
        version: Number(rows[0].version) + 1,
      });
      sendJson(res, 200, { layout });
      return;
    }
    if (req.method === 'GET' && url.pathname === '/v1/watchlists') {
      const workspaceId = url.searchParams.get('workspaceId');
      await requireWorkspace(auth.user.id, workspaceId);
      const lists = await db.query('watchlists', { filters: { workspace_id: workspaceId }, order: 'updated_at.desc' });
      const ids = lists.map((item) => item.id);
      const items = ids.length ? await db.query('watchlist_items', { filters: { watchlist_id: `in.(${ids.join(',')})` }, order: 'position.asc' }) : [];
      sendJson(res, 200, { data: lists.map((list) => ({ ...list, items: items.filter((item) => item.watchlist_id === list.id) })) });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/v1/watchlists') {
      const body = await readJson(req);
      await requireWorkspace(auth.user.id, body.workspaceId, 'editor');
      const [watchlist] = await db.insert('watchlists', { workspace_id: body.workspaceId, owner_user_id: auth.user.id, name: body.name ?? 'Watchlist' });
      if (Array.isArray(body.instrumentIds) && body.instrumentIds.length) {
        await db.insert('watchlist_items', body.instrumentIds.map((instrumentId, index) => ({ watchlist_id: watchlist.id, instrument_id: instrumentId, position: index })));
      }
      sendJson(res, 201, { watchlist });
      return;
    }
    if (req.method === 'GET' && url.pathname === '/v1/strategies') {
      const workspaceId = url.searchParams.get('workspaceId');
      await requireWorkspace(auth.user.id, workspaceId);
      sendJson(res, 200, { data: await db.query('strategies', { filters: { workspace_id: workspaceId }, order: 'updated_at.desc' }) });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/v1/strategies') {
      const result = await createStrategy(auth.user, await readJson(req));
      sendJson(res, 201, result);
      return;
    }
    if (req.method === 'GET' && url.pathname === '/v1/data-sets') {
      const workspaceId = url.searchParams.get('workspaceId');
      await requireWorkspace(auth.user.id, workspaceId);
      sendJson(res, 200, { data: await db.query('data_sets', { filters: { workspace_id: workspaceId }, order: 'created_at.desc', limit: 500 }) });
      return;
    }

    throw httpError(404, 'Route not found', 'not_found');
  } catch (error) {
    sendError(res, error, requestId);
  }
}

export function createApiServer() {
  return http.createServer(handleRequest);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const server = createApiServer();
  server.listen(config.port, '0.0.0.0', () => {
    console.log(`ApexTrade API listening on :${config.port}`);
  });
}

export { hashPassword, verifyPassword, config };
