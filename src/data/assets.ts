import type { Asset } from '../types/trading';

export const INITIAL_ASSETS: Asset[] = [
  {
    symbol: 'BTC/USD',
    name: 'Bitcoin',
    category: 'crypto',
    price: 94850.00,
    change24h: 3.42,
    high24h: 96200.00,
    low24h: 91500.00,
    volume24h: 42800000000,
    marketCap: 1870000000000,
    historySparkline: [91500, 92100, 91800, 93400, 94100, 93800, 94850]
  },
  {
    symbol: 'ETH/USD',
    name: 'Ethereum',
    category: 'crypto',
    price: 3450.50,
    change24h: -1.15,
    high24h: 3580.00,
    low24h: 3390.00,
    volume24h: 21500000000,
    marketCap: 415000000000,
    historySparkline: [3520, 3500, 3480, 3420, 3440, 3460, 3450.5]
  },
  {
    symbol: 'SOL/USD',
    name: 'Solana',
    category: 'crypto',
    price: 194.20,
    change24h: 6.85,
    high24h: 198.50,
    low24h: 180.20,
    volume24h: 6800000000,
    marketCap: 91000000000,
    historySparkline: [180.2, 182.5, 186.0, 189.5, 191.0, 193.5, 194.2]
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    category: 'stocks',
    price: 142.80,
    change24h: 4.12,
    high24h: 144.50,
    low24h: 138.20,
    volume24h: 15400000000,
    marketCap: 3510000000000,
    historySparkline: [138.2, 139.5, 140.1, 141.8, 141.2, 143.0, 142.8]
  },
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    category: 'stocks',
    price: 235.60,
    change24h: 0.85,
    high24h: 237.10,
    low24h: 233.90,
    volume24h: 8900000000,
    marketCap: 3580000000000,
    historySparkline: [233.9, 234.5, 235.0, 234.8, 236.2, 235.9, 235.6]
  },
  {
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    category: 'stocks',
    price: 254.30,
    change24h: -2.45,
    high24h: 262.00,
    low24h: 251.50,
    volume24h: 12100000000,
    marketCap: 810000000000,
    historySparkline: [261.0, 260.2, 258.5, 257.0, 255.4, 253.8, 254.3]
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corp.',
    category: 'stocks',
    price: 432.10,
    change24h: 1.28,
    high24h: 434.50,
    low24h: 428.00,
    volume24h: 7500000000,
    marketCap: 3210000000000,
    historySparkline: [428.0, 429.2, 430.5, 431.0, 431.8, 432.5, 432.1]
  },
  {
    symbol: '2330.TW',
    name: 'TSMC (台積電)',
    category: 'stocks',
    price: 1085.00,
    change24h: 2.36,
    high24h: 1095.00,
    low24h: 1060.00,
    volume24h: 4800000000,
    marketCap: 890000000000,
    historySparkline: [1060, 1065, 1070, 1075, 1080, 1090, 1085]
  },
  {
    symbol: 'EUR/USD',
    name: 'Euro / US Dollar',
    category: 'forex',
    price: 1.0845,
    change24h: -0.12,
    high24h: 1.0875,
    low24h: 1.0820,
    volume24h: 95000000000,
    historySparkline: [1.0865, 1.0860, 1.0852, 1.0840, 1.0835, 1.0842, 1.0845]
  },
  {
    symbol: 'USD/JPY',
    name: 'US Dollar / Japanese Yen',
    category: 'forex',
    price: 154.25,
    change24h: 0.54,
    high24h: 154.80,
    low24h: 153.20,
    volume24h: 88000000000,
    historySparkline: [153.2, 153.6, 153.9, 154.1, 154.5, 154.0, 154.25]
  },
  {
    symbol: 'XAU/USD',
    name: 'Gold Spot / US Dollar',
    category: 'commodities',
    price: 2735.80,
    change24h: 1.15,
    high24h: 2748.00,
    low24h: 2710.50,
    volume24h: 32000000000,
    historySparkline: [2710.5, 2718.0, 2724.5, 2730.0, 2742.0, 2738.5, 2735.8]
  },
  {
    symbol: 'WTI/USD',
    name: 'Crude Oil WTI',
    category: 'commodities',
    price: 71.40,
    change24h: -1.82,
    high24h: 73.20,
    low24h: 70.80,
    volume24h: 18000000000,
    historySparkline: [73.2, 72.8, 72.4, 71.9, 71.1, 70.9, 71.4]
  }
];
