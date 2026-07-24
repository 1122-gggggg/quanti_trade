# Testing Strategy

## Unit tests

- Candle normalization and duplicate handling
- Heikin-Ashi transformation
- Timeframe alignment and candle rollover
- Signal generation without future data
- Next-bar market fills
- Intrabar stop/target precedence
- Commission and slippage accounting
- Long/short margin and PnL
- Drawdown, Sharpe, Sortino, Calmar and profit factor

## Property tests

- Equity never becomes non-finite
- OHLC ranges remain valid after transforms
- Increasing commission cannot improve otherwise identical net return
- A no-trade strategy preserves initial capital
- Duplicate input timestamps do not produce duplicate chart timestamps

## Integration tests

- Data provider to normalized-bar API
- Saved strategy to worker execution to persisted run
- Alert creation to evaluation to delivery
- Paper order to position to close and account ledger
- Layout save, reload and synchronization

## Golden datasets

Maintain small, hand-verifiable datasets that cover gaps, splits, overnight sessions, short positions, stop gaps and simultaneous stop/target touches. Expected outputs must be reviewed and versioned.
