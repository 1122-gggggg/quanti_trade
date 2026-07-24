import type { Timeframe } from '../types/trading';

export const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  '1s': 1,
  '5s': 5,
  '15s': 15,
  '30s': 30,
  '1m': 60,
  '3m': 180,
  '5m': 300,
  '15m': 900,
  '30m': 1_800,
  '45m': 2_700,
  '1h': 3_600,
  '2h': 7_200,
  '4h': 14_400,
  '1D': 86_400,
  '1W': 604_800,
  '1M': 2_592_000,
};

export const TIMEFRAME_GROUPS: ReadonlyArray<{
  label: string;
  values: readonly Timeframe[];
}> = [
  { label: 'Seconds', values: ['1s', '5s', '15s', '30s'] },
  { label: 'Minutes', values: ['1m', '3m', '5m', '15m', '30m', '45m'] },
  { label: 'Hours', values: ['1h', '2h', '4h'] },
  { label: 'Higher', values: ['1D', '1W', '1M'] },
];

export function timeframeToSeconds(timeframe: Timeframe): number {
  return TIMEFRAME_SECONDS[timeframe];
}

export function alignTimestampToTimeframe(timestampSeconds: number, timeframe: Timeframe): number {
  const interval = timeframeToSeconds(timeframe);
  return Math.floor(timestampSeconds / interval) * interval;
}
