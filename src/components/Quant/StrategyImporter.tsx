import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { fetchBinanceKlines, fetchYahooFinanceHistory, parseCSVToCandles } from '../../services/dataFetcher';
import { Upload, Globe, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export const StrategyImporter: React.FC = () => {
  const { setCandles, timeframe } = useTrading();

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Taiwan & Global pre-configured tickers
  const presetTickers = [
    { symbol: '2330.TW', name: '台積電 (TSMC)', type: 'TW Stock' },
    { symbol: '0050.TW', name: '元大台灣50 ETF', type: 'TW ETF' },
    { symbol: '2317.TW', name: '鴻海 (Hon Hai)', type: 'TW Stock' },
    { symbol: '2454.TW', name: '聯發科 (MediaTek)', type: 'TW Stock' },
    { symbol: 'BTCUSDT', name: 'Bitcoin (Binance)', type: 'Crypto' },
    { symbol: 'ETHUSDT', name: 'Ethereum (Binance)', type: 'Crypto' },
    { symbol: 'NVDA', name: 'NVIDIA (US)', type: 'US Stock' },
    { symbol: 'AAPL', name: 'Apple Inc. (US)', type: 'US Stock' },
  ];

  const [selectedTicker, setSelectedTicker] = useState('2330.TW');

  const handleFetchFreeData = async () => {
    setLoading(true);
    setStatusMsg(null);
    setErrorMsg(null);

    try {
      if (selectedTicker.endsWith('USDT')) {
        // Fetch Binance Free Klines API
        const fetchedCandles = await fetchBinanceKlines(selectedTicker, timeframe, 300);
        setCandles(fetchedCandles);
        setStatusMsg(`Successfully loaded ${fetchedCandles.length} real historical candles from Binance for ${selectedTicker}!`);
      } else {
        // Fetch Yahoo Finance Public Proxy for TW/US Stocks
        const fetchedCandles = await fetchYahooFinanceHistory(selectedTicker, '1d', '6m');
        setCandles(fetchedCandles);
        setStatusMsg(`Successfully loaded ${fetchedCandles.length} real historical candles for ${selectedTicker}!`);
      }
    } catch (err: any) {
      setErrorMsg(`Failed to fetch live API data for ${selectedTicker}. Using simulated high-precision dataset.`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        const parsed = parseCSVToCandles(text);
        if (parsed.length > 0) {
          setCandles(parsed);
          setStatusMsg(`Successfully imported ${parsed.length} candles from custom CSV file: ${file.name}`);
          setErrorMsg(null);
        } else {
          setErrorMsg('Failed to parse CSV file. Ensure header contains Date, Open, High, Low, Close.');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
      {/* Panel 1: Free Historical Market Data Downloader */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm font-mono">Free Public Historical Data Importer</h3>
            <p className="text-xs text-slate-400">Fetch real historical market data for Taiwan stocks & Global markets</p>
          </div>
        </div>

        <div className="space-y-3 font-mono text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Select Market Instrument (Taiwan / Global):</label>
            <select
              value={selectedTicker}
              onChange={e => setSelectedTicker(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {presetTickers.map(t => (
                <option key={t.symbol} value={t.symbol}>
                  [{t.type}] {t.symbol} - {t.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleFetchFreeData}
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold font-mono text-xs rounded-lg flex items-center justify-center space-x-2 shadow-lg hover:from-emerald-400 hover:to-teal-400 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'DOWNLOADING HISTORICAL DATA...' : `FETCH HISTORICAL DATA FOR ${selectedTicker}`}</span>
          </button>
        </div>

        {statusMsg && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Panel 2: Custom Local CSV Dataset Importer */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm font-mono">Custom CSV Dataset Importer</h3>
            <p className="text-xs text-slate-400">Upload custom CSV files (Taiwan Futures 台指期, Forex, Commodity, Stocks)</p>
          </div>
        </div>

        <div className="space-y-3 font-mono text-xs">
          <p className="text-slate-300 leading-relaxed font-sans">
            Upload any custom <strong>.csv</strong> file to run backtests on proprietary or international market datasets. Supports standard OHLC headers (Date, Open, High, Low, Close, Volume).
          </p>

          <label className="w-full py-3 px-4 bg-slate-950 hover:bg-slate-800 border border-dashed border-slate-700 hover:border-cyan-500 rounded-xl flex items-center justify-center space-x-2 text-cyan-400 cursor-pointer transition-all">
            <Upload className="w-4 h-4" />
            <span className="font-bold">UPLOAD CUSTOM CSV FILE</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
