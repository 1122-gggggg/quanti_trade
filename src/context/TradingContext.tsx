import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type {
  Asset,
  Candle,
  Order,
  Portfolio,
  IndicatorConfig,
  PriceAlert,
  ChartType,
  DrawingTool,
  DrawingElement,
  Timeframe,
} from '../types/trading';
import { INITIAL_ASSETS } from '../data/assets';
import { generateHistoricalCandles, generateNextTick } from '../data/sampleDataGenerator';
import confetti from 'canvas-confetti';

interface TradingContextType {
  assets: Asset[];
  activeAsset: Asset;
  setActiveAsset: (asset: Asset) => void;
  timeframe: Timeframe;
  setTimeframe: (tf: Timeframe) => void;
  candles: Candle[];
  setCandles: (candles: Candle[]) => void;
  watchlist: string[];
  toggleWatchlist: (symbol: string) => void;
  portfolio: Portfolio;
  orders: Order[];
  indicators: IndicatorConfig[];
  toggleIndicator: (id: string) => void;
  placeOrder: (
    symbol: string,
    side: 'buy' | 'sell',
    amount: number,
    price?: number,
    leverage?: number,
    takeProfit?: number,
    stopLoss?: number
  ) => boolean;
  closePosition: (positionId: string) => void;
  resetPortfolio: () => void;
  theme: 'dark' | 'light' | 'terminal';
  setTheme: (theme: 'dark' | 'light' | 'terminal') => void;
  volatility: number;
  setVolatility: (v: number) => void;
  priceAlerts: PriceAlert[];
  addPriceAlert: (symbol: string, targetPrice: number, condition: 'above' | 'below') => void;
  removePriceAlert: (id: string) => void;
  dataFeedMode: 'simulated' | 'binance_live';
  setDataFeedMode: (mode: 'simulated' | 'binance_live') => void;
  chartType: ChartType;
  setChartType: (ct: ChartType) => void;
  activeDrawingTool: DrawingTool;
  setActiveDrawingTool: (tool: DrawingTool) => void;
  drawings: DrawingElement[];
  clearDrawings: () => void;
}

const DEFAULT_INDICATORS: IndicatorConfig[] = [
  { id: 'sma20', type: 'SMA', enabled: true, period: 20, color: '#3b82f6' },
  { id: 'sma50', type: 'SMA', enabled: false, period: 50, color: '#f59e0b' },
  { id: 'ema9', type: 'EMA', enabled: true, period: 9, color: '#10b981' },
  { id: 'rsi14', type: 'RSI', enabled: true, period: 14, color: '#a855f7' },
  { id: 'vwap', type: 'VWAP', enabled: false, period: 0, color: '#ec4899' },
  { id: 'bb20', type: 'BB', enabled: false, period: 20, color: '#6366f1' },
];

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export const TradingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [assets, setAssets] = useState<Asset[]>(() => {
    const saved = localStorage.getItem('apex_assets');
    return saved ? JSON.parse(saved) : INITIAL_ASSETS;
  });

  const [activeAsset, setActiveAsset] = useState<Asset>(assets[0]);
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>(['BTC/USD', 'NVDA', '2330.TW', 'XAU/USD']);
  const [indicators, setIndicators] = useState<IndicatorConfig[]>(DEFAULT_INDICATORS);
  const [theme, setTheme] = useState<'dark' | 'light' | 'terminal'>('dark');
  const [volatility, setVolatility] = useState<number>(1.0);
  const [dataFeedMode, setDataFeedMode] = useState<'simulated' | 'binance_live'>('simulated');
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [activeDrawingTool, setActiveDrawingTool] = useState<DrawingTool>('cursor');
  const [drawings, setDrawings] = useState<DrawingElement[]>([]);

  const [portfolio, setPortfolio] = useState<Portfolio>(() => {
    const saved = localStorage.getItem('apex_portfolio');
    if (saved) return JSON.parse(saved);
    return {
      cashBalance: 100000.0,
      initialBalance: 100000.0,
      realizedPnL: 0,
      positions: [],
      history: [{ timestamp: Date.now(), equity: 100000.0 }],
    };
  });

  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    localStorage.setItem('apex_assets', JSON.stringify(assets));
  }, [assets]);

  useEffect(() => {
    localStorage.setItem('apex_portfolio', JSON.stringify(portfolio));
  }, [portfolio]);

  useEffect(() => {
    const latest = assets.find(asset => asset.symbol === activeAsset.symbol);
    if (!latest) return;

    setActiveAsset(current => {
      if (
        current.price === latest.price &&
        current.change24h === latest.change24h &&
        current.high24h === latest.high24h &&
        current.low24h === latest.low24h
      ) {
        return current;
      }
      return latest;
    });
  }, [assets, activeAsset.symbol]);

  useEffect(() => {
    const newCandles = generateHistoricalCandles(activeAsset.price, 500, timeframe);
    setCandles(newCandles);
  }, [activeAsset.symbol, timeframe]);

  useEffect(() => {
    if (dataFeedMode !== 'binance_live') return;

    let socket: WebSocket | null = null;
    let retryTimer: number | undefined;
    let retryAttempt = 0;
    let disposed = false;

    const connect = () => {
      socket = new WebSocket(
        'wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/ethusdt@ticker/solusdt@ticker'
      );

      socket.onopen = () => {
        retryAttempt = 0;
      };

      socket.onmessage = event => {
        try {
          const parsed = JSON.parse(event.data);
          const data = parsed.data ?? parsed;
          if (!data?.s || !data?.c) return;

          const symbolMap: Record<string, string> = {
            BTCUSDT: 'BTC/USD',
            ETHUSDT: 'ETH/USD',
            SOLUSDT: 'SOL/USD',
          };
          const mappedSymbol = symbolMap[data.s];
          if (!mappedSymbol) return;

          const livePrice = Number.parseFloat(data.c);
          const liveChange = Number.parseFloat(data.P);
          const liveHigh = Number.parseFloat(data.h);
          const liveLow = Number.parseFloat(data.l);
          const liveVolume = Number.parseFloat(data.q ?? data.v ?? '0');

          if (![livePrice, liveChange, liveHigh, liveLow].every(Number.isFinite)) return;

          setAssets(previous => previous.map(asset =>
            asset.symbol === mappedSymbol
              ? {
                  ...asset,
                  price: livePrice,
                  change24h: liveChange,
                  high24h: liveHigh,
                  low24h: liveLow,
                  volume24h: Number.isFinite(liveVolume) ? liveVolume : asset.volume24h,
                }
              : asset
          ));
        } catch {
          // Ignore malformed provider frames and wait for the next message.
        }
      };

      socket.onerror = () => {
        socket?.close();
      };

      socket.onclose = () => {
        if (disposed) return;
        const delay = Math.min(30_000, 1_000 * 2 ** retryAttempt);
        retryAttempt += 1;
        retryTimer = window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      socket?.close();
    };
  }, [dataFeedMode]);

  useEffect(() => {
    if (dataFeedMode !== 'simulated') return;

    const interval = window.setInterval(() => {
      setAssets(previousAssets => previousAssets.map(asset => {
        const changePct = (Math.random() - 0.495) * 0.003 * volatility;
        const decimals = asset.category === 'forex' ? 5 : 2;
        const newPrice = Number((asset.price * (1 + changePct)).toFixed(decimals));
        const change24h = Number((asset.change24h + changePct * 10).toFixed(2));

        return {
          ...asset,
          price: newPrice,
          change24h,
          high24h: Math.max(asset.high24h, newPrice),
          low24h: Math.min(asset.low24h, newPrice),
        };
      }));

      setCandles(previousCandles => {
        if (previousCandles.length === 0) return previousCandles;
        const last = previousCandles[previousCandles.length - 1];
        const nextTick = generateNextTick(last, timeframe);

        if (nextTick.time > last.time) {
          return [...previousCandles, nextTick].slice(-2_000);
        }
        return [...previousCandles.slice(0, -1), nextTick];
      });
    }, 1_500);

    return () => window.clearInterval(interval);
  }, [volatility, dataFeedMode, timeframe]);

  useEffect(() => {
    setPortfolio(previous => {
      if (previous.positions.length === 0) return previous;

      let closedPositionsPnL = 0;
      let returnedCash = 0;

      const updatedPositions = previous.positions.filter(position => {
        const currentAsset = assets.find(asset => asset.symbol === position.symbol);
        const currentPrice = currentAsset ? currentAsset.price : position.currentPrice;
        const triggerStopLoss = Boolean(
          position.stopLoss &&
          (position.side === 'buy' ? currentPrice <= position.stopLoss : currentPrice >= position.stopLoss)
        );
        const triggerTakeProfit = Boolean(
          position.takeProfit &&
          (position.side === 'buy' ? currentPrice >= position.takeProfit : currentPrice <= position.takeProfit)
        );
        const pnl = position.side === 'buy'
          ? (currentPrice - position.entryPrice) * position.amount
          : (position.entryPrice - currentPrice) * position.amount;
        const initialMargin = (position.amount * position.entryPrice) / position.leverage;

        if (triggerStopLoss || triggerTakeProfit) {
          closedPositionsPnL += pnl;
          returnedCash += initialMargin + pnl;
          return false;
        }

        position.currentPrice = currentPrice;
        position.unrealizedPnL = Number(pnl.toFixed(2));
        position.unrealizedPnLPercent = initialMargin > 0
          ? Number(((pnl / initialMargin) * 100).toFixed(2))
          : 0;
        return true;
      });

      return {
        ...previous,
        cashBalance: Number((previous.cashBalance + returnedCash).toFixed(2)),
        realizedPnL: Number((previous.realizedPnL + closedPositionsPnL).toFixed(2)),
        positions: updatedPositions,
      };
    });
  }, [assets]);

  useEffect(() => {
    setPriceAlerts(previous => previous.map(alertItem => {
      if (alertItem.triggered) return alertItem;
      const asset = assets.find(item => item.symbol === alertItem.symbol);
      if (!asset) return alertItem;
      const triggered = alertItem.condition === 'above'
        ? asset.price >= alertItem.targetPrice
        : asset.price <= alertItem.targetPrice;
      return triggered ? { ...alertItem, triggered: true } : alertItem;
    }));
  }, [assets]);

  const toggleWatchlist = (symbol: string) => {
    setWatchlist(previous =>
      previous.includes(symbol) ? previous.filter(item => item !== symbol) : [...previous, symbol]
    );
  };

  const toggleIndicator = (id: string) => {
    setIndicators(previous =>
      previous.map(indicator => indicator.id === id ? { ...indicator, enabled: !indicator.enabled } : indicator)
    );
  };

  const placeOrder = (
    symbol: string,
    side: 'buy' | 'sell',
    amount: number,
    price?: number,
    leverage: number = 1,
    takeProfit?: number,
    stopLoss?: number
  ): boolean => {
    const targetAsset = assets.find(asset => asset.symbol === symbol) || activeAsset;
    const executionPrice = price || targetAsset.price;
    const safeLeverage = Math.max(1, leverage);
    const initialMargin = (amount * executionPrice) / safeLeverage;

    if (!Number.isFinite(amount) || amount <= 0 || portfolio.cashBalance < initialMargin) {
      alert('Invalid quantity or insufficient margin.');
      return false;
    }

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      symbol,
      side,
      type: 'market',
      amount,
      price: executionPrice,
      total: initialMargin,
      status: 'executed',
      timestamp: Date.now(),
      leverage: safeLeverage,
      takeProfit,
      stopLoss,
    };

    setOrders(previous => [newOrder, ...previous]);
    setPortfolio(previous => ({
      ...previous,
      cashBalance: Number((previous.cashBalance - initialMargin).toFixed(2)),
      positions: [
        ...previous.positions,
        {
          id: `pos-${Date.now()}`,
          symbol,
          side,
          amount,
          entryPrice: executionPrice,
          currentPrice: executionPrice,
          liquidationPrice: side === 'buy'
            ? executionPrice * (1 - 1 / safeLeverage)
            : executionPrice * (1 + 1 / safeLeverage),
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0,
          leverage: safeLeverage,
          openedAt: Date.now(),
          takeProfit,
          stopLoss,
        },
      ],
    }));

    confetti({ particleCount: 50, spread: 70, origin: { y: 0.8 } });
    return true;
  };

  const closePosition = (positionId: string) => {
    setPortfolio(previous => {
      const position = previous.positions.find(item => item.id === positionId);
      if (!position) return previous;

      const currentAsset = assets.find(asset => asset.symbol === position.symbol);
      const closePrice = currentAsset ? currentAsset.price : position.currentPrice;
      const initialMargin = (position.amount * position.entryPrice) / position.leverage;
      const pnl = position.side === 'buy'
        ? (closePrice - position.entryPrice) * position.amount
        : (position.entryPrice - closePrice) * position.amount;

      if (pnl > 0) {
        confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
      }

      return {
        ...previous,
        cashBalance: Number((previous.cashBalance + initialMargin + pnl).toFixed(2)),
        realizedPnL: Number((previous.realizedPnL + pnl).toFixed(2)),
        positions: previous.positions.filter(item => item.id !== positionId),
      };
    });
  };

  const addPriceAlert = (symbol: string, targetPrice: number, condition: 'above' | 'below') => {
    const alertItem: PriceAlert = {
      id: `alert-${Date.now()}`,
      symbol,
      targetPrice,
      condition,
      triggered: false,
      createdAt: Date.now(),
    };
    setPriceAlerts(previous => [...previous, alertItem]);
  };

  const removePriceAlert = (id: string) => {
    setPriceAlerts(previous => previous.filter(alertItem => alertItem.id !== id));
  };

  const clearDrawings = () => {
    setDrawings([]);
  };

  const resetPortfolio = () => {
    setPortfolio({
      cashBalance: 100000.0,
      initialBalance: 100000.0,
      realizedPnL: 0,
      positions: [],
      history: [{ timestamp: Date.now(), equity: 100000.0 }],
    });
    setOrders([]);
  };

  return (
    <TradingContext.Provider
      value={{
        assets,
        activeAsset,
        setActiveAsset,
        timeframe,
        setTimeframe,
        candles,
        setCandles,
        watchlist,
        toggleWatchlist,
        portfolio,
        orders,
        indicators,
        toggleIndicator,
        placeOrder,
        closePosition,
        resetPortfolio,
        theme,
        setTheme,
        volatility,
        setVolatility,
        priceAlerts,
        addPriceAlert,
        removePriceAlert,
        dataFeedMode,
        setDataFeedMode,
        chartType,
        setChartType,
        activeDrawingTool,
        setActiveDrawingTool,
        drawings,
        clearDrawings,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = () => {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTrading must be used within a TradingProvider');
  }
  return context;
};
