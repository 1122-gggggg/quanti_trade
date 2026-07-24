#!/usr/bin/env python3
import json
import sys
from pathlib import Path

import pyarrow.parquet as parquet


def main() -> int:
    if len(sys.argv) < 2:
        print('usage: parquet_to_json.py <file> [mapping-json]', file=sys.stderr)
        return 2
    path = Path(sys.argv[1])
    mapping = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    table = parquet.read_table(path)
    columns = table.column_names
    resolved = {
        'time': mapping.get('time', 'timestamp'),
        'open': mapping.get('open', 'open'),
        'high': mapping.get('high', 'high'),
        'low': mapping.get('low', 'low'),
        'close': mapping.get('close', 'close'),
        'volume': mapping.get('volume', 'volume'),
        'vwap': mapping.get('vwap'),
        'tradeCount': mapping.get('tradeCount'),
    }
    if resolved['time'] not in columns and 'date' in columns:
        resolved['time'] = 'date'
    missing = [resolved[name] for name in ('time', 'open', 'high', 'low', 'close') if resolved[name] not in columns]
    if missing:
        raise ValueError(f'Missing Parquet columns: {missing}')
    for batch in table.to_batches(max_chunksize=10000):
        for row in batch.to_pylist():
            output = {
                'time': row.get(resolved['time']),
                'open': row.get(resolved['open']),
                'high': row.get(resolved['high']),
                'low': row.get(resolved['low']),
                'close': row.get(resolved['close']),
                'volume': row.get(resolved['volume'], 0) if resolved['volume'] else 0,
                'vwap': row.get(resolved['vwap']) if resolved['vwap'] else None,
                'tradeCount': row.get(resolved['tradeCount']) if resolved['tradeCount'] else None,
            }
            for key, value in list(output.items()):
                if hasattr(value, 'isoformat'):
                    output[key] = value.isoformat()
            print(json.dumps(output, separators=(',', ':')))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
