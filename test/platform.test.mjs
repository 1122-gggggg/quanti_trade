import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalJson,
  sha256,
  csvToBars,
  normalizeBars,
  adjustBars,
  runDeterministicBacktest,
} from '../packages/platform/src/core.mjs';
import { encodeRespCommand } from '../packages/platform/src/redis.mjs';
import { hashPassword, verifyPassword } from '../apps/api/src/server.mjs';

test('canonical JSON and hashes are stable across key order', () => {
  const left = { b: 2, a: { d: 4, c: 3 } };
  const right = { a: { c: 3, d: 4 }, b: 2 };
  assert.equal(canonicalJson(left), canonicalJson(right));
  assert.equal(sha256(left), sha256(right));
});

test('CSV import parses quoted fields and normalizes duplicates', () => {
  const csv = [
    'timestamp,open,high,low,close,volume',
    '2025-01-02T00:00:00Z,10,12,9,11,100',
    '2025-01-02T00:00:00Z,10,13,9,12,120',
    '2025-01-03T00:00:00Z,12,14,11,13,130',
  ].join('\n');
  const parsed = csvToBars(csv);
  const normalized = normalizeBars(parsed, { interval: '1D' });
  assert.equal(normalized.bars.length, 2);
  assert.equal(normalized.bars[0].close, 12);
  assert.equal(normalized.quality.duplicateRows, 1);
});

test('split adjustment changes pre-split prices and volume', () => {
  const bars = [
    { time: 100, open: 100, high: 110, low: 90, close: 100, volume: 10 },
    { time: 200, open: 50, high: 55, low: 45, close: 50, volume: 20 },
  ];
  const adjusted = adjustBars(bars, [{ actionType: 'split', exTimestamp: 200, ratio: 2 }], 'split');
  assert.equal(adjusted[0].close, 50);
  assert.equal(adjusted[0].volume, 20);
  assert.equal(adjusted[1].close, 50);
});

test('backtest fills signals on the next bar and is deterministic', () => {
  const bars = [];
  for (let index = 0; index < 60; index += 1) {
    const rising = index < 20 ? 100 - index : 80 + ((index - 20) * 2);
    bars.push({
      time: 1_700_000_000 + (index * 86400),
      open: rising,
      high: rising + 2,
      low: rising - 2,
      close: rising + 1,
      volume: 1000 + index,
    });
  }
  const manifest = {
    interval: '1D',
    initialCapital: 10_000,
    strategy: { type: 'SMA_CROSSOVER', fastPeriod: 3, slowPeriod: 8 },
    execution: { commissionPercent: 0.1, slippagePercent: 0.05, positionSizePercent: 100 },
  };
  const first = runDeterministicBacktest(bars, manifest);
  const second = runDeterministicBacktest(bars, manifest);
  assert.equal(first.resultHash, second.resultHash);
  assert.ok(first.result.totalTrades >= 1);
  assert.ok(first.result.trades[0].entryTime > bars[0].time);
  assert.ok(first.result.feesPaid > 0);
});

test('password hashing uses random salts and verifies safely', async () => {
  const first = await hashPassword('correct horse battery staple');
  const second = await hashPassword('correct horse battery staple');
  assert.notEqual(first, second);
  assert.equal(await verifyPassword('correct horse battery staple', first), true);
  assert.equal(await verifyPassword('wrong password', first), false);
});

test('RESP command encoding is binary-safe', () => {
  assert.equal(encodeRespCommand(['PING']).toString(), '*1\r\n$4\r\nPING\r\n');
  assert.equal(encodeRespCommand(['SET', 'a', 'hello']).toString(), '*3\r\n$3\r\nSET\r\n$1\r\na\r\n$5\r\nhello\r\n');
});
