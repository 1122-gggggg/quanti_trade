import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  canonicalJson,
  csvToBars,
  normalizeBars,
  runDeterministicBacktest,
  sha256,
  INTERVAL_SECONDS,
} from '../../../packages/platform/src/core.mjs';
import { PostgrestClient } from '../../../packages/platform/src/postgrest.mjs';
import { RedisClient } from '../../../packages/platform/src/redis.mjs';
import { S3Client } from '../../../packages/platform/src/s3.mjs';
import { alphaVantageDaily } from '../../../packages/platform/src/providers.mjs';

const config = Object.freeze({
  postgrestUrl: process.env.POSTGREST_URL ?? 'http://127.0.0.1:3000',
  redisHost: process.env.REDIS_HOST ?? '127.0.0.1',
  redisPort: Number(process.env.REDIS_PORT ?? 6379),
  redisPassword: process.env.REDIS_PASSWORD ?? '',
  redisDatabase: Number(process.env.REDIS_DATABASE ?? 0),
  queueName: process.env.JOB_QUEUE_NAME ?? 'apextrade:jobs',
  workerId: process.env.WORKER_ID ?? `worker-${randomUUID().slice(0, 8)}`,
  alphaVantageApiKey: process.env.ALPHA_VANTAGE_API_KEY ?? '',
  s3Endpoint: process.env.S3_ENDPOINT ?? 'http://127.0.0.1:9000',
  s3AccessKey: process.env.S3_ACCESS_KEY ?? 'apextrade',
  s3SecretKey: process.env.S3_SECRET_KEY ?? 'change-me-in-production',
  s3Bucket: process.env.S3_BUCKET ?? 'apextrade-data',
  s3Region: process.env.S3_REGION ?? 'us-east-1',
  heartbeatSeconds: Number(process.env.WORKER_HEARTBEAT_SECONDS ?? 10),
});

const db = new PostgrestClient({ baseUrl: config.postgrestUrl, timeoutMs: 30_000 });
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

let stopping = false;
process.on('SIGTERM', () => { stopping = true; });
process.on('SIGINT', () => { stopping = true; });

async function audit(job, action, metadata = {}) {
  await db.insert('audit_log', {
    actor_user_id: job.requested_by,
    workspace_id: job.workspace_id,
    action,
    entity_type: 'job',
    entity_id: job.id,
    correlation_id: job.correlation_id,
    metadata: { workerId: config.workerId, ...metadata },
  }).catch((error) => console.error('Audit write failed', error));
}

async function checkCancelled(jobId) {
  const rows = await db.query('jobs', { filters: { id: jobId }, select: 'cancellation_requested_at', limit: 1 });
  return Boolean(rows[0]?.cancellation_requested_at);
}

async function runParquetConverter(buffer, mapping) {
  const directory = await mkdtemp(join(tmpdir(), 'apextrade-parquet-'));
  const file = join(directory, 'input.parquet');
  await writeFile(file, buffer);
  try {
    return await new Promise((resolve, reject) => {
      const child = spawn('python3', [
        new URL('./parquet_to_json.py', import.meta.url).pathname,
        file,
        JSON.stringify(mapping ?? {}),
      ]);
      let stdout = '';
      let stderr = '';
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk) => { stdout += chunk; });
      child.stderr.on('data', (chunk) => { stderr += chunk; });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code !== 0) reject(new Error(`Parquet conversion failed: ${stderr || `exit ${code}`}`));
        else {
          const rows = stdout.split('\n').filter(Boolean).map((line) => JSON.parse(line));
          resolve(rows);
        }
      });
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function resolveInstrument(spec) {
  if (!spec || !spec.canonicalSymbol) throw new Error('Import instrument.canonicalSymbol is required');
  const provider = spec.provider ?? 'user_import';
  const venue = spec.venue ?? 'USER';
  const existing = await db.query('instruments', {
    filters: {
      canonical_symbol: spec.canonicalSymbol,
      provider,
      venue,
    },
    limit: 1,
  });
  if (existing[0]) return existing[0];
  const [instrument] = await db.insert('instruments', {
    canonical_symbol: spec.canonicalSymbol,
    provider,
    provider_symbol: spec.providerSymbol ?? spec.canonicalSymbol,
    asset_class: spec.assetClass ?? 'stock',
    venue,
    name: spec.name ?? spec.canonicalSymbol,
    currency: spec.currency ?? 'USD',
    timezone: spec.timezone ?? 'UTC',
    session_id: spec.sessionId ?? null,
    tick_size: spec.tickSize ?? null,
    price_precision: spec.pricePrecision ?? null,
    contract_multiplier: spec.contractMultiplier ?? 1,
    metadata: spec.metadata ?? {},
  });
  return instrument;
}

async function sessionForInstrument(instrument) {
  if (!instrument.session_id) return null;
  const rows = await db.query('trading_sessions', { filters: { id: instrument.session_id }, limit: 1 });
  const row = rows[0];
  return row ? {
    timezone: row.timezone,
    weeklySchedule: row.weekly_schedule,
    holidays: row.holidays,
  } : null;
}

async function persistDataset({
  job,
  instrument,
  interval,
  adjustmentMode,
  provider,
  sourceRevision,
  delaySeconds,
  rawObjectKey,
  rawBars,
  accessScope = 'workspace',
  timezone,
  metadata = {},
}) {
  const session = await sessionForInstrument(instrument);
  const normalized = normalizeBars(rawBars, {
    interval,
    intervalSeconds: INTERVAL_SECONDS[interval],
    session,
  });
  if (!normalized.bars.length) throw new Error('No valid bars remained after data-quality validation');
  const existing = await db.query('data_sets', {
    filters: {
      instrument_id: instrument.id,
      interval,
      adjustment_mode: adjustmentMode,
      data_hash: normalized.dataHash,
    },
    limit: 1,
  });
  if (existing[0]) return { dataset: existing[0], normalized, reused: true };
  const [dataset] = await db.insert('data_sets', {
    workspace_id: accessScope === 'workspace' ? job.workspace_id : null,
    instrument_id: instrument.id,
    provider,
    source_revision: sourceRevision ?? normalized.dataHash,
    interval,
    adjustment_mode: adjustmentMode,
    timezone: timezone ?? instrument.timezone ?? 'UTC',
    from_ts: new Date(normalized.bars[0].time * 1000).toISOString(),
    to_ts: new Date(normalized.bars.at(-1).time * 1000).toISOString(),
    data_hash: normalized.dataHash,
    row_count: normalized.bars.length,
    quality_report: normalized.quality,
    raw_object_key: rawObjectKey,
    delay_seconds: delaySeconds ?? 0,
    access_scope: accessScope,
    immutable: true,
    metadata,
  });
  const rows = normalized.bars.map((bar) => ({
    dataset_id: dataset.id,
    instrument_id: instrument.id,
    interval,
    ts: new Date(bar.time * 1000).toISOString(),
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
    vwap: bar.vwap,
    trade_count: bar.tradeCount,
    source_revision: sourceRevision ?? normalized.dataHash,
  }));
  await db.insertChunks('bars', rows, 750);
  return { dataset, normalized };
}

async function processImport(job) {
  const importId = job.payload.importId;
  const records = await db.query('imports', { filters: { id: importId }, limit: 1 });
  const record = records[0];
  if (!record) throw new Error(`Import not found: ${importId}`);
  await db.update('imports', { id: importId }, { status: 'running', started_at: new Date().toISOString() });
  const input = await objectStorage.getObject(record.object_key);
  let bars;
  if (record.format === 'csv') bars = csvToBars(input.toString('utf8'), record.mapping, record.timezone);
  else if (record.format === 'parquet') bars = await runParquetConverter(input, record.mapping);
  else throw new Error(`Unsupported import format: ${record.format}`);
  const instrument = await resolveInstrument(record.instrument_spec);
  const result = await persistDataset({
    job,
    instrument,
    interval: record.interval,
    adjustmentMode: record.adjustment_mode,
    provider: record.source_name ?? 'user_import',
    sourceRevision: record.raw_hash,
    delaySeconds: 0,
    rawObjectKey: record.object_key,
    rawBars: bars,
    accessScope: 'workspace',
    timezone: record.timezone,
    metadata: { importId: record.id, format: record.format },
  });
  await db.update('imports', { id: importId }, {
    status: 'completed',
    dataset_id: result.dataset.id,
    quality_report: result.normalized.quality,
    completed_at: new Date().toISOString(),
  });
  return { datasetId: result.dataset.id, quality: result.normalized.quality };
}

async function processProviderIngest(job) {
  if (job.payload.provider !== 'alpha_vantage') throw new Error(`Unknown provider: ${job.payload.provider}`);
  const instruments = await db.query('instruments', { filters: { id: job.payload.instrumentId }, limit: 1 });
  const instrument = instruments[0];
  if (!instrument) throw new Error('Provider-ingest instrument not found');
  const response = await alphaVantageDaily(instrument, {
    apiKey: config.alphaVantageApiKey,
    outputSize: job.payload.outputSize,
    adjusted: job.payload.adjustmentMode !== 'raw',
    interval: job.payload.interval,
  });
  const raw = Buffer.from(canonicalJson(response.raw));
  const objectKey = `providers/alpha_vantage/${instrument.id}/${Date.now()}.json`;
  await objectStorage.putObject(objectKey, raw, 'application/json');
  const result = await persistDataset({
    job,
    instrument,
    interval: job.payload.interval,
    adjustmentMode: job.payload.adjustmentMode,
    provider: 'alpha_vantage',
    sourceRevision: sha256(response.raw),
    delaySeconds: response.delaySeconds,
    rawObjectKey: objectKey,
    rawBars: response.bars,
    accessScope: job.payload.accessScope ?? 'workspace',
    timezone: instrument.timezone,
    metadata: response.metadata,
  });
  return { datasetId: result.dataset.id, quality: result.normalized.quality };
}

async function processBacktest(job) {
  const runId = job.payload.runId;
  const runs = await db.query('backtest_runs', { filters: { id: runId }, limit: 1 });
  const run = runs[0];
  if (!run) throw new Error(`Backtest run not found: ${runId}`);
  if (run.cancellation_requested_at || await checkCancelled(job.id)) {
    await db.update('backtest_runs', { id: run.id }, { status: 'cancelled', completed_at: new Date().toISOString() });
    return { cancelled: true };
  }
  await db.update('backtest_runs', { id: run.id }, { status: 'running', started_at: new Date().toISOString() });
  const datasets = await db.query('data_sets', { filters: { id: run.dataset_id }, limit: 1 });
  const dataset = datasets[0];
  if (!dataset) throw new Error('Backtest dataset no longer exists');
  if (dataset.data_hash !== run.manifest.dataset.hash) throw new Error('Dataset hash no longer matches immutable run manifest');
  const rows = await db.query('bars', {
    filters: { dataset_id: dataset.id },
    order: 'ts.asc',
    limit: 500_000,
  });
  const bars = rows.map((row) => ({
    time: Math.floor(Date.parse(row.ts) / 1000),
    open: Number(row.open),
    high: Number(row.high),
    low: Number(row.low),
    close: Number(row.close),
    volume: Number(row.volume),
    vwap: row.vwap == null ? null : Number(row.vwap),
    tradeCount: row.trade_count == null ? null : Number(row.trade_count),
  }));
  if (await checkCancelled(job.id)) {
    await db.update('backtest_runs', { id: run.id }, { status: 'cancelled', completed_at: new Date().toISOString() });
    return { cancelled: true };
  }
  const { result, resultHash } = runDeterministicBacktest(bars, run.manifest);
  await db.update('backtest_runs', { id: run.id }, {
    status: 'completed',
    result,
    result_hash: resultHash,
    completed_at: new Date().toISOString(),
  });
  return { runId: run.id, resultHash, totalTrades: result.totalTrades };
}

async function processJob(job) {
  if (job.type === 'ingest_import') return processImport(job);
  if (job.type === 'provider_ingest') return processProviderIngest(job);
  if (job.type === 'backtest') return processBacktest(job);
  throw new Error(`Unsupported job type: ${job.type}`);
}

async function handleQueueMessage(message) {
  const parsed = JSON.parse(message);
  const rows = await db.query('jobs', { filters: { id: parsed.jobId }, limit: 1 });
  const job = rows[0];
  if (!job || !['queued', 'retrying'].includes(job.status)) return;
  if (job.cancellation_requested_at) {
    await db.update('jobs', { id: job.id }, { status: 'cancelled', completed_at: new Date().toISOString() });
    return;
  }
  await db.update('jobs', { id: job.id }, {
    status: 'running',
    worker_id: config.workerId,
    started_at: new Date().toISOString(),
    heartbeat_at: new Date().toISOString(),
    attempts: Number(job.attempts ?? 0) + 1,
  });
  await audit(job, 'job.start', { type: job.type });
  const heartbeat = setInterval(() => {
    db.update('jobs', { id: job.id }, { heartbeat_at: new Date().toISOString() }).catch(console.error);
  }, config.heartbeatSeconds * 1000);
  try {
    const result = await processJob(job);
    const status = result?.cancelled ? 'cancelled' : 'completed';
    await db.update('jobs', { id: job.id }, {
      status,
      progress: 100,
      result,
      completed_at: new Date().toISOString(),
      heartbeat_at: new Date().toISOString(),
    });
    await audit(job, `job.${status}`, result ?? {});
  } catch (error) {
    console.error(`Job ${job.id} failed`, error);
    await db.update('jobs', { id: job.id }, {
      status: 'failed',
      error: { message: error.message, stack: error.stack },
      completed_at: new Date().toISOString(),
      heartbeat_at: new Date().toISOString(),
    });
    if (job.type === 'ingest_import' && job.payload?.importId) {
      await db.update('imports', { id: job.payload.importId }, {
        status: 'failed',
        error: { message: error.message },
        completed_at: new Date().toISOString(),
      }).catch(console.error);
    }
    if (job.type === 'backtest' && job.payload?.runId) {
      await db.update('backtest_runs', { id: job.payload.runId }, {
        status: 'failed',
        error: { message: error.message },
        completed_at: new Date().toISOString(),
      }).catch(console.error);
    }
    await audit(job, 'job.failed', { message: error.message });
  } finally {
    clearInterval(heartbeat);
  }
}

export async function runWorker() {
  console.log(`ApexTrade worker ${config.workerId} started`);
  while (!stopping) {
    try {
      const message = await redis.blockingPop(config.queueName, 5);
      if (message) await handleQueueMessage(message);
    } catch (error) {
      console.error('Worker loop error', error);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  console.log('ApexTrade worker stopped');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  runWorker().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export { processJob, persistDataset, config };
