import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Asset, Candle, Order, Portfolio, IndicatorConfig, PriceAlert, ChartType, DrawingTool, DrawingElement } from '../types/trading';
import { INITIAL_ASSETS } from '../data/assets';
import { generateHistoricalCandles, generateNextTick } from '../data/sampleDataGenerator';
import confetti from 'canvas-confetti';

interface TradingContextType {
  assets: Asset[];
  activeAsset: Asset;
  setActiveAsset: (asset: Asset) => void;
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1D';
  setTimeframe: (tf: '1m' | '5m' | '15m' | '1h' | '4h' | '1D') => void;
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
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m' | '1h' | '4h' | '1D'>('1h');
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
      cashBalance: 100000.00,
      initialBalance: 100000.00,
      realizedPnL: 0,
      positions: [],
      history: [{ timestamp: Date.now(), equity: 100000.00 }],
    };
  });

  const [orders, setOrders] = useState<Order[]>([]);

  // Load candles whenever active asset or timeframe changes
  useEffect(() => {
    const newCandles = generateHistoricalCandles(activeAsset.price, 150, timeframe);
    setCandles(newCandles);
  }, [activeAsset.symbol, timeframe]);

  // Real-time Binance WebSocket Integration for Crypto
  useEffect(() => {
    if (dataFeedMode !== 'binance_live') return;

    const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker/ethusdt@ticker/solusdt@ticker');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data && data.s && data.c) {
        const symbolMap: Record<string, string> = {
          'BTCUSDT': 'BTC/USD',
          'ETHUSDT': 'ETH/USD',
          'SOLUSDT': 'SOL/USD',
        };
        const mappedSymbol = symbolMap[data.s];
        if (mappedSymbol) {
          const livePrice = parseFloat(data.c);
          const liveChange = parseFloat(data.P);
          const liveHigh = parseFloat(data.h);
          const liveLow = parseFloat(data.l);

          setAssets(prev => prev.map(a => 
            a.symbol === mappedSymbol 
              ? { ...a, price: livePrice, change24h: liveChange, high24h: liveHigh, low24h: liveLow }
              : a
          ));
        }
      }
    };

    return () => ws.close();
  }, [dataFeedMode]);

  // Simulated tick generator if simulated mode
  useEffect(() => {
    if (dataFeedMode !== 'simulated') return;

    const interval = setInterval(() => {
      setAssets(prevAssets => {
        return prevAssets.map(asset => {
          const changePct = (Math.random() - 0.495) * 0.003 * volatility;
          const newPrice = Number((asset.price * (1 + changePct)).toFixed(asset.category === 'forex' ? 4 : 2));
          const change24h = Number((asset.change24h + (changePct * 10)).toFixed(2));
          
          return {
            ...asset,
            price: newPrice,
            change24h,
            high24h: Math.max(asset.high24h, newPrice),
            low24h: Math.min(asset.low24h, newPrice),
          };
        });
      });

      // Update active candles tick
      setCandles(prevCandles => {
        if (prevCandles.length === 0) return prevCandles;
        const last = prevCandles[prevCandles.length - 1];
        const nextTick = generateNextTick(last, 3600);
        return [...prevCandles.slice(0, -1), nextTick];
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [volatility, dataFeedMode]);

  // Position Stop Loss & Take Profit Auto Monitor
  useEffect(() => {
    setPortfolio(prev => {
      if (prev.positions.length === 0) return prev;
      let totalUnrealized = 0;
      let updatedPositions = [...prev.positions];
      let closedPositionsPnL = 0;
      let returnedCash = 0;

      updatedPositions = updatedPositions.filter(pos => {
        const currAsset = assets.find(a => a.symbol === pos.symbol);
        const currentPrice = currAsset ? currAsset.price : pos.currentPrice;

        // Auto trigger TP/SL
        let triggerSL = pos.stopLoss && (pos.side === 'buy' ? currentPrice <= pos.stopLoss : currentPrice >= pos.stopLoss);
        let triggerTP = pos.takeProfit && (pos.side === 'buy' ? currentPrice >= pos.takeProfit : currentPrice <= pos.takeProfit);

        if (triggerSL || triggerTP) {
          const pnl = pos.side === 'buy'
            ? (currentPrice - pos.entryPrice) * pos.amount * pos.leverage
            : (pos.entryPrice - currentPrice) * pos.amount * pos.leverage;
          
          closedPositionsPnL += pnl;
          returnedCash += (pos.amount * pos.entryPrice) + pnl;
          return false; // Close position
        }

        let pnl = pos.side === 'buy'
          ? (currentPrice - pos.entryPrice) * pos.amount * pos.leverage
          : (pos.entryPrice - currentPrice) * pos.amount * pos.leverage;

        const pnlPercent = (pnl / (pos.entryPrice * pos.amount)) * 100;
        totalUnrealized += pnl;

        pos.currentPrice = currentPrice;
        pos.unrealizedPnL = Number(pnl.toFixed(2));
        pos.unrealizedPnLPercent = Number(pnlPercent.toFixed(2));
        return true;
      });

      return {
        ...prev,
        cashBalance: Number((prev.cashBalance + returnedCash).toFixed(2)),
        realizedPnL: Number((prev.realizedPnL + closedPositionsPnL).toFixed(2)),
        positions: updatedPositions,
      };
    });
  }, [assets]);

  const toggleWatchlist = (symbol: string) => {
    setWatchlist(prev =>
      prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]
    );
  };

  const toggleIndicator = (id: string) => {
    setIndicators(prev =>
      prev.map(ind => ind.id === id ? { ...ind, enabled: !ind.enabled } : ind)
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
    const targetAsset = assets.find(a => a.symbol === symbol) || activeAsset;
    const executionPrice = price || targetAsset.price;
    const totalCost = (amount * executionPrice) / leverage;

    if (side === 'buy' && portfolio.cashBalance < totalCost) {
      alert('Insufficient Funds for leveraged order!');
      return false;
    }

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      symbol,
      side,
      type: 'market',
      amount,
      price: executionPrice,
      total: totalCost,
      status: 'executed',
      timestamp: Date.now(),
      leverage,
      takeProfit,
      stopLoss,
    };

    setOrders(prev => [newOrder, ...prev]);

    setPortfolio(prev => {
      let updatedPositions = [...prev.positions];
      let newCash = prev.cashBalance - totalCost;

      updatedPositions.push({
        id: `pos-${Date.now()}`,
        symbol,
        side,
        amount,
        entryPrice: executionPrice,
        currentPrice: executionPrice,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        leverage,
        openedAt: Date.now(),
        takeProfit,
        stopLoss,
      });

      return {
        ...prev,
        cashBalance: Number(newCash.toFixed(2)),
        positions: updatedPositions,
      };
    });

    confetti({ particleCount: 50, spread: 70, origin: { y: 0.8 } });
    return true;
  };

  const closePosition = (positionId: string) => {
    setPortfolio(prev => {
      const pos = prev.positions.find(p => p.id === positionId);
      if (!pos) return prev;

      const currAsset = assets.find(a => a.symbol === pos.symbol);
      const closePrice = currAsset ? currAsset.price : pos.currentPrice;
      const initialMargin = (pos.amount * pos.entryPrice) / pos.leverage;
      const pnl = pos.side === 'buy'
        ? (closePrice - pos.entryPrice) * pos.amount * pos.leverage
        : (pos.entryPrice - closePrice) * pos.amount * pos.leverage;

      if (pnl > 0) {
        confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
      }

      return {
        ...prev,
        cashBalance: Number((prev.cashBalance + initialMargin + pnl).toFixed(2)),
        realizedPnL: Number((prev.realizedPnL + pnl).toFixed(2)),
        positions: prev.positions.filter(p => p.id !== positionId),
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
    setPriceAlerts(prev => [...prev, alertItem]);
  };

  const removePriceAlert = (id: string) => {
    setPriceAlerts(prev => prev.filter(a => a.id !== id));
  };

  const clearDrawings = () => {
    setDrawings([]);
  };

  const resetPortfolio = () => {
    setPortfolio({
      cashBalance: 100000.00,
      initialBalance: 100000.00,
      realizedPnL: 0,
      positions: [],
      history: [{ timestamp: Date.now(), equity: 100000.00 }],
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
