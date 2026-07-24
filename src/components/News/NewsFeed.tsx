import React, { useState } from 'react';
import { INITIAL_NEWS } from '../../data/mockNews';
import { useTrading } from '../../context/TradingContext';
import { Newspaper, TrendingUp, TrendingDown, Minus, ExternalLink, Search } from 'lucide-react';

export const NewsFeed: React.FC = () => {
  const { assets, setActiveAsset } = useTrading();
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'bullish' | 'bearish' | 'neutral'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNews = INITIAL_NEWS.filter(item => {
    const matchesSentiment = sentimentFilter === 'all' || item.sentiment === sentimentFilter;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSentiment && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* News Header & Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Newspaper className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Global Financial News Feed</h2>
            <p className="text-xs text-slate-400">Real-time market intel with sentiment sentiment analysis</p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search market news..."
              className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-48 font-mono"
            />
          </div>

          {/* Sentiment Filter Tabs */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            {(['all', 'bullish', 'bearish', 'neutral'] as const).map(sent => (
              <button
                key={sent}
                onClick={() => setSentimentFilter(sent)}
                className={`px-3 py-1 rounded capitalize font-medium transition-colors ${
                  sentimentFilter === sent
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {sent}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* News Items Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredNews.map(item => {
          const isBullish = item.sentiment === 'bullish';
          const isBearish = item.sentiment === 'bearish';

          return (
            <div
              key={item.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 shadow-xl flex flex-col justify-between transition-all"
            >
              <div>
                {/* News Source & Timestamp & Sentiment Badge */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
                    <span className="font-semibold text-slate-300">{item.source}</span>
                    <span>•</span>
                    <span>{item.timestamp}</span>
                  </div>

                  <span
                    className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isBullish
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : isBearish
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {isBullish ? <TrendingUp className="w-3 h-3" /> : isBearish ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    <span>{item.sentiment.toUpperCase()}</span>
                  </span>
                </div>

                <h3 className="font-bold text-white text-sm leading-snug mb-2 hover:text-cyan-400 transition-colors">
                  {item.title}
                </h3>

                <p className="text-xs text-slate-400 leading-relaxed font-sans mb-4">
                  {item.summary}
                </p>
              </div>

              {/* Related Symbol Tags */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div className="flex flex-wrap gap-1.5">
                  {item.relatedSymbols.map(sym => (
                    <button
                      key={sym}
                      onClick={() => {
                        const matched = assets.find(a => a.symbol === sym);
                        if (matched) setActiveAsset(matched);
                      }}
                      className="px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] text-cyan-400 hover:text-cyan-300 font-mono transition-colors"
                    >
                      ${sym}
                    </button>
                  ))}
                </div>

                <a
                  href="#"
                  onClick={e => e.preventDefault()}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                  title="Read Source Article"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
