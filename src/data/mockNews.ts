import type { NewsItem } from '../types/trading';

export const INITIAL_NEWS: NewsItem[] = [
  {
    id: 'news-1',
    title: 'Federal Reserve Signals Interest Rate Cut Strategy Amid Stable Inflation',
    source: 'Bloomberg Terminal',
    url: '#',
    timestamp: '10 mins ago',
    relatedSymbols: ['BTC/USD', 'AAPL', 'MSFT', 'EUR/USD'],
    sentiment: 'bullish',
    summary: 'FED policymakers hinted at further rate cuts in upcoming quarters as core PCE inflation aligns with 2% targets. Global risk assets rally.'
  },
  {
    id: 'news-2',
    title: 'NVIDIA Unveils Next-Gen AI Microarchitecture, Raising Revenue Guidance by 25%',
    source: 'Financial Times',
    url: '#',
    timestamp: '35 mins ago',
    relatedSymbols: ['NVDA', 'TSLA', '2330.TW'],
    sentiment: 'bullish',
    summary: 'NVIDIA announced breakthrough inference chips alongside expanded semiconductor foundry partnerships with TSMC.'
  },
  {
    id: 'news-3',
    title: 'Bitcoin Surges Past $94,000 as Institutional ETF Inflows Hit Record $1.2B Single-Day High',
    source: 'CoinDesk',
    url: '#',
    timestamp: '1 hour ago',
    relatedSymbols: ['BTC/USD', 'ETH/USD', 'SOL/USD'],
    sentiment: 'bullish',
    summary: 'Spot Bitcoin ETFs recorded massive net inflows led by BlackRock and Fidelity as sovereign wealth funds report allocation strategies.'
  },
  {
    id: 'news-4',
    title: 'Crude Oil Drops Below $72 as OPEC+ Considers Supply Increase for Q4',
    source: 'Reuters',
    url: '#',
    timestamp: '2 hours ago',
    relatedSymbols: ['WTI/USD', 'XAU/USD'],
    sentiment: 'bearish',
    summary: 'Oil prices faced downside pressure after reports indicated OPEC+ members may unwind voluntary production cuts sooner than expected.'
  },
  {
    id: 'news-5',
    title: 'TSMC Reports Record Q3 Net Profit Driven by High Performance Computing Demand',
    source: 'Nikkei Asia',
    url: '#',
    timestamp: '3 hours ago',
    relatedSymbols: ['2330.TW', 'NVDA', 'AAPL'],
    sentiment: 'bullish',
    summary: 'Taiwan Semiconductor Manufacturing Co. posted 36% year-on-year net profit growth, boosting global tech sentiment.'
  },
  {
    id: 'news-6',
    title: 'ECB Monitors Euro Volatility as German Manufacturing Index Shows Mixed Signals',
    source: 'Wall Street Journal',
    url: '#',
    timestamp: '4 hours ago',
    relatedSymbols: ['EUR/USD', 'USD/JPY'],
    sentiment: 'neutral',
    summary: 'European Central Bank officials maintain a cautious stance while analyzing economic recovery metrics across the eurozone.'
  }
];
