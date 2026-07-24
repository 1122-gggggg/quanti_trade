import { createHash } from 'node:crypto';

export const ASSET_CLASSES = Object.freeze([
  'stock', 'etf', 'crypto', 'forex', 'commodity', 'index', 'bond', 'future', 'option', 'fund', 'economic',
]);

export const INTERVAL_SECONDS = Object.freeze({
  '1s': 1,
  '5s': 5,
  '15s': 15,
  '30s': 30,
  '1m': 60,
  '3m': 180,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '45m': 2700,
  '1h': 3600,
  '2h': 7200,
  '3h': 10800,
  '4h': 14400,
  '6h': 21600,
  '8h': 28800,
  '12h': 43200,
  '1D': 86400,
  '1W': 604800,
});

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256(value) {
  const input = typeof value === 'string' || Buffer.isBuffer(value)
    ? value
    : canonicalJson(value);
  return createHash('sha256').update(input).digest('hex');
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''));
      if (row.some((item) => item.length > 0)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  row.push(field.replace(/\r$/, ''));
  if (row.some((item) => item.length > 0)) rows.push(row);
  return rows;
}

function parseTimestamp(value, timezone = 'UTC') {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 10_000_000_000 ? Math.floor(value / 1000) : Math.floor(value);
  }
  const raw = String(value ?? '').trim();
  if (!raw) return Number.NaN;
  if (/^\d+(\.\d+)?$/.test(raw)) {
    const numeric = Number(raw);
    return numeric > 10_000_000_000 ? Math.floor(numeric / 1000) : Math.floor(numeric);
  }
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw);
  const parsed = Date.parse(hasZone || timezone === 'UTC' ? raw : `${raw} ${timezone}`);
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : Number.NaN;
}

export function csvToBars(text, mapping = {}, timezone = 'UTC') {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const names = {
    time: String(mapping.time ?? 'timestamp').toLowerCase(),
    open: String(mapping.open ?? 'open').toLowerCase(),
    high: String(mapping.high ?? 'high').toLowerCase(),
    low: String(mapping.low ?? 'low').toLowerCase(),
    close: String(mapping.close ?? 'close').toLowerCase(),
    volume: String(mapping.volume ?? 'volume').toLowerCase(),
    vwap: mapping.vwap ? String(mapping.vwap).toLowerCase() : null,
    tradeCount: mapping.tradeCount ? String(mapping.tradeCount).toLowerCase() : null,
  };
  if (!headers.includes(names.time) && headers.includes('date')) names.time = 'date';
  const positions = Object.fromEntries(
    Object.entries(names).map(([key, name]) => [key, name ? headers.indexOf(name) : -1]),
  );

  for (const required of ['time', 'open', 'high', 'low', 'close']) {
    if (positions[required] < 0) throw new Error(`CSV column not found: ${names[required]}`);
  }

  return rows.slice(1).map((columns) => ({
    time: parseTimestamp(columns[positions.time], timezone),
    open: Number(columns[positions.open]),
    high: Number(columns[positions.high]),
    low: Number(columns[positions.low]),
    close: Number(columns[positions.close]),
    volume: positions.volume >= 0 ? Number(columns[positions.volume] || 0) : 0,
    vwap: positions.vwap >= 0 ? Number(columns[positions.vwap]) : null,
    tradeCount: positions.tradeCount >= 0 ? Number(columns[positions.tradeCount]) : null,
  }));
}

function dayKey(timestamp, timezone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(timestamp * 1000));
}

function minuteOfWeek(timestamp, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(timestamp * 1000));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return (weekdays[values.weekday] * 1440) + (Number(values.hour) * 60) + Number(values.minute);
}

export function isSessionOpen(timestamp, session) {
  if (!session) return true;
  const timezone = session.timezone || 'UTC';
  if ((session.holidays || []).includes(dayKey(timestamp, timezone))) return false;
  const value = minuteOfWeek(timestamp, timezone);
  return (session.weeklySchedule || []).some(({ start, end }) => {
    if (start <= end) return value >= start && value < end;
    return value >= start || value < end;
  });
}

export function normalizeBars(rawBars, options = {}) {
  const intervalSeconds = options.intervalSeconds ?? INTERVAL_SECONDS[options.interval];
  const session = options.session ?? null;
  const warnings = [];
  let malformedRows = 0;
  let duplicateRows = 0;
  let negativeVolumeRows = 0;

  const valid = rawBars
    .map((bar) => ({
      time: Math.floor(Number(bar.time)),
      open: Number(bar.open),
      high: Number(bar.high),
      low: Number(bar.low),
      close: Number(bar.close),
      volume: Number(bar.volume ?? 0),
      vwap: bar.vwap == null ? null : Number(bar.vwap),
      tradeCount: bar.tradeCount == null ? null : Number(bar.tradeCount),
    }))
    .filter((bar) => {
      const finite = [bar.time, bar.open, bar.high, bar.low, bar.close, bar.volume]
        .every(Number.isFinite);
      const ohlcValid = bar.time > 0
        && bar.open > 0
        && bar.high > 0
        && bar.low > 0
        && bar.close > 0
        && bar.high >= Math.max(bar.open, bar.close)
        && bar.low <= Math.min(bar.open, bar.close);
      if (bar.volume < 0) negativeVolumeRows += 1;
      if (!finite || !ohlcValid || bar.volume < 0) malformedRows += 1;
      return finite && ohlcValid && bar.volume >= 0;
    })
    .sort((left, right) => left.time - right.time);

  const deduplicated = [];
  for (const bar of valid) {
    const previous = deduplicated.at(-1);
    if (previous?.time === bar.time) {
      duplicateRows += 1;
      deduplicated[deduplicated.length - 1] = bar;
    } else {
      deduplicated.push(bar);
    }
  }

  let missingIntervals = 0;
  let expectedClosedIntervals = 0;
  if (intervalSeconds && intervalSeconds > 0) {
    for (let index = 1; index < deduplicated.length; index += 1) {
      const previous = deduplicated[index - 1];
      const current = deduplicated[index];
      for (let expected = previous.time + intervalSeconds; expected < current.time; expected += intervalSeconds) {
        if (session && !isSessionOpen(expected, session)) expectedClosedIntervals += 1;
        else missingIntervals += 1;
      }
    }
  }

  if (malformedRows) warnings.push(`${malformedRows} malformed rows rejected`);
  if (duplicateRows) warnings.push(`${duplicateRows} duplicate timestamps replaced by the last row`);
  if (missingIntervals) warnings.push(`${missingIntervals} in-session intervals are missing`);
  if (negativeVolumeRows) warnings.push(`${negativeVolumeRows} rows had negative volume`);

  const hashPayload = deduplicated.map((bar) => [
    bar.time, bar.open, bar.high, bar.low, bar.close, bar.volume, bar.vwap, bar.tradeCount,
  ]);

  return {
    bars: deduplicated,
    dataHash: sha256(hashPayload),
    quality: {
      receivedRows: rawBars.length,
      acceptedRows: deduplicated.length,
      rejectedRows: malformedRows,
      duplicateRows,
      negativeVolumeRows,
      missingIntervals,
      expectedClosedIntervals,
      firstTimestamp: deduplicated[0]?.time ?? null,
      lastTimestamp: deduplicated.at(-1)?.time ?? null,
      warnings,
    },
  };
}

export function adjustBars(rawBars, corporateActions, mode = 'raw') {
  if (mode === 'raw' || corporateActions.length === 0) return rawBars.map((bar) => ({ ...bar }));
  const bars = rawBars.map((bar) => ({ ...bar })).sort((a, b) => a.time - b.time);
  const actions = [...corporateActions].sort((a, b) => Number(b.exTimestamp) - Number(a.exTimestamp));
  let splitFactor = 1;
  let totalReturnFactor = 1;
  let actionIndex = 0;

  for (let index = bars.length - 1; index >= 0; index -= 1) {
    const bar = bars[index];
    while (actionIndex < actions.length && Number(actions[actionIndex].exTimestamp) > bar.time) {
      const action = actions[actionIndex];
      if (action.actionType === 'split') {
        const ratio = Number(action.ratio ?? 1);
        if (ratio > 0) splitFactor /= ratio;
      } else if (mode === 'total_return' && action.actionType === 'dividend') {
        const cash = Number(action.cashAmount ?? 0);
        const reference = bars[Math.min(index + 1, bars.length - 1)]?.close ?? bar.close;
        if (cash > 0 && reference > cash) totalReturnFactor *= (reference - cash) / reference;
      }
      actionIndex += 1;
    }
    const priceFactor = splitFactor * totalReturnFactor;
    bar.open *= priceFactor;
    bar.high *= priceFactor;
    bar.low *= priceFactor;
    bar.close *= priceFactor;
    if (bar.vwap != null) bar.vwap *= priceFactor;
    if (splitFactor !== 0) bar.volume /= splitFactor;
  }
  return bars;
}

function sma(values, period) {
  const output = Array(values.length).fill(null);
  let sum = 0;
  for (let index = 0; index < values.length; index += 1) {
    sum += values[index];
    if (index >= period) sum -= values[index - period];
    if (index >= period - 1) output[index] = sum / period;
  }
  return output;
}

function rsi(values, period = 14) {
  const output = Array(values.length).fill(null);
  if (values.length <= period) return output;
  let gains = 0;
  let losses = 0;
  for (let index = 1; index <= period; index += 1) {
    const delta = values[index] - values[index - 1];
    gains += Math.max(delta, 0);
    losses += Math.max(-delta, 0);
  }
  let averageGain = gains / period;
  let averageLoss = losses / period;
  output[period] = averageLoss === 0 ? 100 : 100 - (100 / (1 + averageGain / averageLoss));
  for (let index = period + 1; index < values.length; index += 1) {
    const delta = values[index] - values[index - 1];
    averageGain = ((averageGain * (period - 1)) + Math.max(delta, 0)) / period;
    averageLoss = ((averageLoss * (period - 1)) + Math.max(-delta, 0)) / period;
    output[index] = averageLoss === 0 ? 100 : 100 - (100 / (1 + averageGain / averageLoss));
  }
  return output;
}

function bollinger(values, period = 20, multiplier = 2) {
  const middle = sma(values, period);
  const upper = Array(values.length).fill(null);
  const lower = Array(values.length).fill(null);
  for (let index = period - 1; index < values.length; index += 1) {
    const sample = values.slice(index - period + 1, index + 1);
    const mean = middle[index];
    const variance = sample.reduce((total, value) => total + ((value - mean) ** 2), 0) / period;
    const deviation = Math.sqrt(variance);
    upper[index] = mean + (multiplier * deviation);
    lower[index] = mean - (multiplier * deviation);
  }
  return { middle, upper, lower };
}

function standardDeviation(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  const variance = values.reduce((total, value) => total + ((value - mean) ** 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function runDeterministicBacktest(rawBars, manifest) {
  const normalized = normalizeBars(rawBars, { interval: manifest.interval });
  const bars = normalized.bars;
  if (bars.length < 3) throw new Error('Backtest requires at least three valid bars');
  const parameters = {
    strategy: manifest.strategy?.type ?? 'SMA_CROSSOVER',
    fastPeriod: Math.max(1, Number(manifest.strategy?.fastPeriod ?? 9)),
    slowPeriod: Math.max(2, Number(manifest.strategy?.slowPeriod ?? 21)),
    rsiLow: Number(manifest.strategy?.rsiLow ?? 30),
    rsiHigh: Number(manifest.strategy?.rsiHigh ?? 70),
    stopLossPercent: Math.max(0, Number(manifest.execution?.stopLossPercent ?? 0)),
    takeProfitPercent: Math.max(0, Number(manifest.execution?.takeProfitPercent ?? 0)),
    commissionPercent: Math.max(0, Number(manifest.execution?.commissionPercent ?? 0.1)),
    slippagePercent: Math.max(0, Number(manifest.execution?.slippagePercent ?? 0.05)),
    positionSizePercent: Math.min(100, Math.max(0, Number(manifest.execution?.positionSizePercent ?? 100))),
    intrabarPolicy: manifest.execution?.intrabarPolicy === 'take_profit_first' ? 'take_profit_first' : 'stop_first',
    initialCapital: Math.max(0, Number(manifest.initialCapital ?? 10000)),
    annualizationPeriods: Math.max(1, Number(manifest.annualizationPeriods ?? 252)),
    riskFreeRatePercent: Number(manifest.riskFreeRatePercent ?? 0),
  };
  if (parameters.initialCapital <= 0) throw new Error('Initial capital must be positive');

  const closes = bars.map((bar) => bar.close);
  const fast = sma(closes, parameters.fastPeriod);
  const slow = sma(closes, parameters.slowPeriod);
  const rsiValues = rsi(closes, 14);
  const bands = bollinger(closes, 20, 2);
  const commissionRate = parameters.commissionPercent / 100;
  const slippageRate = parameters.slippagePercent / 100;
  const positionFraction = parameters.positionSizePercent / 100;
  let cash = parameters.initialCapital;
  let position = null;
  let pending = null;
  let maxEquity = cash;
  let maxDrawdown = 0;
  let totalFees = 0;
  let exposureBars = 0;
  let previousEquity = cash;
  const periodReturns = [];
  const trades = [];
  const equityCurve = [];

  const closePosition = (bar, rawPrice, reason, index) => {
    if (!position) return;
    const exitPrice = rawPrice * (1 - slippageRate);
    const proceeds = position.quantity * exitPrice;
    const exitFee = proceeds * commissionRate;
    const grossPnl = position.quantity * (exitPrice - position.entryPrice);
    const netPnl = grossPnl - position.entryFee - exitFee;
    cash += proceeds - exitFee;
    totalFees += exitFee;
    trades.push({
      id: `trade-${String(trades.length + 1).padStart(6, '0')}`,
      entryTime: position.entryTime,
      exitTime: bar.time,
      entryPrice: position.entryPrice,
      exitPrice,
      quantity: position.quantity,
      grossPnl,
      netPnl,
      fees: position.entryFee + exitFee,
      barsHeld: Math.max(1, index - position.entryIndex),
      reason,
    });
    position = null;
  };

  for (let index = 0; index < bars.length; index += 1) {
    const bar = bars[index];
    if (pending === 'sell' && position) closePosition(bar, bar.open, 'signal', index);
    if (pending === 'buy' && !position && cash > 0 && positionFraction > 0) {
      const entryPrice = bar.open * (1 + slippageRate);
      const budget = cash * positionFraction;
      const quantity = budget / (entryPrice * (1 + commissionRate));
      const notional = quantity * entryPrice;
      const entryFee = notional * commissionRate;
      if (quantity > 0 && notional + entryFee <= cash + 1e-8) {
        cash -= notional + entryFee;
        totalFees += entryFee;
        position = {
          entryPrice,
          entryTime: bar.time,
          entryIndex: index,
          quantity,
          entryFee,
          stopPrice: parameters.stopLossPercent > 0
            ? entryPrice * (1 - parameters.stopLossPercent / 100)
            : null,
          targetPrice: parameters.takeProfitPercent > 0
            ? entryPrice * (1 + parameters.takeProfitPercent / 100)
            : null,
        };
      }
    }
    pending = null;

    if (position) {
      exposureBars += 1;
      const stopHit = position.stopPrice != null && bar.low <= position.stopPrice;
      const targetHit = position.targetPrice != null && bar.high >= position.targetPrice;
      if (stopHit && targetHit) {
        if (parameters.intrabarPolicy === 'take_profit_first') {
          closePosition(bar, position.targetPrice, 'take_profit', index);
        } else closePosition(bar, position.stopPrice, 'stop_loss', index);
      } else if (stopHit) closePosition(bar, position.stopPrice, 'stop_loss', index);
      else if (targetHit) closePosition(bar, position.targetPrice, 'take_profit', index);
    }

    const equity = cash + (position ? position.quantity * bar.close : 0);
    maxEquity = Math.max(maxEquity, equity);
    maxDrawdown = Math.max(maxDrawdown, maxEquity > 0 ? (maxEquity - equity) / maxEquity : 0);
    equityCurve.push({ time: bar.time, equity });
    if (previousEquity > 0) periodReturns.push((equity / previousEquity) - 1);
    previousEquity = equity;

    if (index >= bars.length - 1) continue;
    let buy = false;
    let sell = false;
    if (parameters.strategy === 'SMA_CROSSOVER') {
      if (index > parameters.slowPeriod && fast[index - 1] != null && slow[index - 1] != null) {
        buy = fast[index - 1] <= slow[index - 1] && fast[index] > slow[index];
        sell = fast[index - 1] >= slow[index - 1] && fast[index] < slow[index];
      }
    } else if (parameters.strategy === 'RSI_REVERSAL') {
      buy = rsiValues[index] != null && rsiValues[index] < parameters.rsiLow;
      sell = rsiValues[index] != null && rsiValues[index] > parameters.rsiHigh;
    } else if (parameters.strategy === 'BOLLINGER_BREAKOUT') {
      buy = bands.lower[index] != null && bar.close <= bands.lower[index];
      sell = bands.upper[index] != null && bar.close >= bands.upper[index];
    } else {
      throw new Error(`Unsupported strategy type: ${parameters.strategy}`);
    }
    if (position && sell) pending = 'sell';
    else if (!position && buy) pending = 'buy';
  }

  if (position) {
    const lastIndex = bars.length - 1;
    closePosition(bars[lastIndex], bars[lastIndex].close, 'end_of_data', lastIndex);
    equityCurve[lastIndex] = { time: bars[lastIndex].time, equity: cash };
  }

  const finalEquity = cash;
  const winningTrades = trades.filter((trade) => trade.netPnl > 0);
  const losingTrades = trades.filter((trade) => trade.netPnl < 0);
  const grossProfit = winningTrades.reduce((total, trade) => total + trade.netPnl, 0);
  const grossLoss = Math.abs(losingTrades.reduce((total, trade) => total + trade.netPnl, 0));
  const riskFreePerPeriod = (parameters.riskFreeRatePercent / 100) / parameters.annualizationPeriods;
  const excessReturns = periodReturns.map((value) => value - riskFreePerPeriod);
  const downside = excessReturns.filter((value) => value < 0);
  const meanExcess = excessReturns.length
    ? excessReturns.reduce((total, value) => total + value, 0) / excessReturns.length
    : 0;
  const sharpe = standardDeviation(excessReturns) > 0
    ? (meanExcess / standardDeviation(excessReturns)) * Math.sqrt(parameters.annualizationPeriods)
    : 0;
  const sortino = standardDeviation(downside) > 0
    ? (meanExcess / standardDeviation(downside)) * Math.sqrt(parameters.annualizationPeriods)
    : 0;
  const years = Math.max(1 / parameters.annualizationPeriods, (bars.length - 1) / parameters.annualizationPeriods);
  const cagr = finalEquity > 0 ? ((finalEquity / parameters.initialCapital) ** (1 / years)) - 1 : -1;

  const result = {
    runVersion: 1,
    datasetHash: normalized.dataHash,
    manifestHash: sha256(manifest),
    initialCapital: parameters.initialCapital,
    finalEquity,
    totalReturnPercent: ((finalEquity / parameters.initialCapital) - 1) * 100,
    benchmarkReturnPercent: ((bars.at(-1).close / bars[0].open) - 1) * 100,
    maxDrawdownPercent: maxDrawdown * 100,
    sharpeRatio: sharpe,
    sortinoRatio: sortino,
    calmarRatio: maxDrawdown > 0 ? cagr / maxDrawdown : 0,
    winRatePercent: trades.length ? (winningTrades.length / trades.length) * 100 : 0,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? null : 0,
    exposurePercent: (exposureBars / bars.length) * 100,
    feesPaid: totalFees,
    totalTrades: trades.length,
    trades,
    equityCurve,
    assumptions: parameters,
    dataQuality: normalized.quality,
  };
  return { result, resultHash: sha256(result) };
}
