import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import type { AssetCategory } from '../../types/trading';
import { Search, Star, TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react';

export const MarketScreener: React.FC = () => {
  const { assets, setActiveAsset, watchlist, toggleWatchlist } = useTrading();
  
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'change24h' | 'price' | 'volume24h'>('change24h');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const filteredAssets = assets
    .filter(a => {
      const categoryMatch = selectedCategory === 'all' || a.category === selectedCategory;
      const searchMatch = a.symbol.toLowerCase().includes(search.toLowerCase()) ||
                          a.name.toLowerCase().includes(search.toLowerCase());
      return categoryMatch && searchMatch;
    })
    .sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      return sortDirection === 'desc' ? valB - valA : valA - valB;
    });

  const handleSort = (field: 'change24h' | 'price' | 'volume24h') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">Global Asset Screener</h2>
          <p className="text-xs text-slate-400">Filter crypto, stocks, forex, and commodities by market performance</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search ticker or company..."
              className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-52 font-mono"
            />
          </div>

          {/* Category Pills */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            {(['all', 'crypto', 'stocks', 'forex', 'commodities'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded capitalize font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Asset Grid / Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 w-10">FAV</th>
                <th className="pb-3">ASSET</th>
                <th className="pb-3">CATEGORY</th>
                <th className="pb-3 cursor-pointer hover:text-white" onClick={() => handleSort('price')}>
                  <div className="flex items-center">
                    <span>PRICE</span>
                    <ArrowUpDown className="w-3 h-3 ml-1" />
                  </div>
                </th>
                <th className="pb-3 cursor-pointer hover:text-white" onClick={() => handleSort('change24h')}>
                  <div className="flex items-center">
                    <span>24H CHANGE</span>
                    <ArrowUpDown className="w-3 h-3 ml-1" />
                  </div>
                </th>
                <th className="pb-3 cursor-pointer hover:text-white" onClick={() => handleSort('volume24h')}>
                  <div className="flex items-center">
                    <span>24H VOLUME</span>
                    <ArrowUpDown className="w-3 h-3 ml-1" />
                  </div>
                </th>
                <th className="pb-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredAssets.map(asset => {
                const isFavorite = watchlist.includes(asset.symbol);
                const isPositive = asset.change24h >= 0;

                return (
                  <tr key={asset.symbol} className="hover:bg-slate-950/50 transition-colors">
                    <td className="py-3">
                      <button
                        onClick={() => toggleWatchlist(asset.symbol)}
                        className={`text-slate-500 hover:text-amber-400 transition-colors ${
                          isFavorite ? 'text-amber-400' : ''
                        }`}
                      >
                        <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                      </button>
                    </td>
                    <td className="py-3">
                      <div className="font-bold text-white text-sm">{asset.symbol}</div>
                      <div className="text-[11px] text-slate-400 font-sans">{asset.name}</div>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800 text-[10px] uppercase">
                        {asset.category}
                      </span>
                    </td>
                    <td className="py-3 font-bold text-white">
                      ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`py-3 font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      <div className="flex items-center">
                        {isPositive ? <TrendingUp className="w-3.5 h-3.5 mr-1" /> : <TrendingDown className="w-3.5 h-3.5 mr-1" />}
                        {isPositive ? '+' : ''}{asset.change24h.toFixed(2)}%
                      </div>
                    </td>
                    <td className="py-3 text-slate-300">
                      ${(asset.volume24h / 1e6).toFixed(1)}M
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => setActiveAsset(asset)}
                        className="px-3 py-1 rounded bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold hover:from-cyan-400 hover:to-blue-500 transition-all text-xs"
                      >
                        ANALYZE
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
