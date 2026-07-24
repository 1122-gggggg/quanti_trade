import assert from 'node:assert/strict';

const baseUrl = process.env.PLATFORM_API_URL ?? 'http://localhost:8787';
let token = '';

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`${response.status} ${path}: ${JSON.stringify(payload)}`);
  return payload;
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const health = await request('/health');
      if (health.status === 'ok') return;
    } catch {
      // Services may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error('Platform API did not become healthy');
}

async function waitForJob(jobId, expected = 'completed') {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const { job } = await request(`/v1/jobs/${jobId}`);
    if (job.status === expected) return job;
    if (['failed', 'cancelled'].includes(job.status)) throw new Error(`Job ${jobId} ended as ${job.status}: ${JSON.stringify(job.error)}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Job ${jobId} timed out`);
}

await waitForHealth();
const unique = Date.now();
const registration = await request('/v1/auth/register', {
  method: 'POST',
  body: JSON.stringify({
    email: `ci-${unique}@example.com`,
    password: 'correct horse battery staple',
    displayName: 'CI User',
  }),
});
token = registration.session.token;
const workspaceId = registration.workspace.id;
assert.ok(workspaceId);

const csvRows = ['timestamp,open,high,low,close,volume'];
for (let index = 0; index < 120; index += 1) {
  const date = new Date(Date.UTC(2025, 0, 1 + index)).toISOString();
  const price = index < 40 ? 120 - index : 80 + ((index - 40) * 1.5);
  csvRows.push(`${date},${price},${price + 2},${price - 2},${price + 1},${1000 + index}`);
}
const importResponse = await request('/v1/imports', {
  method: 'POST',
  body: JSON.stringify({
    workspaceId,
    format: 'csv',
    interval: '1D',
    csv: csvRows.join('\n'),
    instrument: {
      canonicalSymbol: 'CI.TEST',
      provider: 'user_import',
      providerSymbol: 'CI.TEST',
      assetClass: 'stock',
      venue: 'TEST',
      name: 'CI Test Instrument',
      currency: 'USD',
      timezone: 'UTC',
    },
  }),
});
const importJob = await waitForJob(importResponse.job.id);
assert.ok(importJob.result.datasetId);
const datasetId = importJob.result.datasetId;

const bars = await request(`/v1/bars?datasetId=${datasetId}&workspaceId=${workspaceId}`);
assert.equal(bars.data.length, 120);
assert.equal(bars.meta.provider, 'user_import');
assert.equal(bars.meta.immutable, true);

const strategyResponse = await request('/v1/strategies', {
  method: 'POST',
  body: JSON.stringify({
    workspaceId,
    name: 'CI SMA Strategy',
    config: { type: 'SMA_CROSSOVER', fastPeriod: 3, slowPeriod: 8 },
  }),
});
assert.ok(strategyResponse.version.id);

const backtestResponse = await request('/v1/backtests', {
  method: 'POST',
  body: JSON.stringify({
    workspaceId,
    datasetId,
    strategyVersionId: strategyResponse.version.id,
    initialCapital: 10000,
    execution: { commissionPercent: 0.1, slippagePercent: 0.05, positionSizePercent: 100 },
  }),
});
const backtestJob = await waitForJob(backtestResponse.job.id);
assert.ok(backtestJob.result.resultHash);
const run = await request(`/v1/backtests/${backtestResponse.run.id}`);
assert.equal(run.run.status, 'completed');
assert.ok(run.run.result.totalTrades >= 1);

const layout = await request('/v1/layouts', {
  method: 'POST',
  body: JSON.stringify({
    workspaceId,
    name: 'CI Layout',
    layoutState: { charts: [{ instrumentId: bars.meta.instrument.id, interval: '1D' }] },
  }),
});
assert.ok(layout.layout.id);

console.log(JSON.stringify({
  workspaceId,
  datasetId,
  runId: run.run.id,
  resultHash: run.run.result_hash,
}, null, 2));
