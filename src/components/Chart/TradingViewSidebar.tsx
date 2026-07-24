import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { Star, Bell, TrendingUp, TrendingDown, ChevronRight, ChevronLeft, Plus, Trash2 } from 'lucide-react';

export const TradingViewSidebar: React.FC = () => {
  const { assets, activeAsset, setActiveAsset, watchlist, toggleWatchlist, priceAlerts, addPriceAlert, removePriceAlert } = useTrading();
  const [collapsed, setCollapsed] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'watchlist' | 'alerts' | 'info'>('watchlist');

  const [alertPrice, setAlertPrice] = useState<string>('');

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertPrice) return;
    const target = parseFloat(alertPrice);
    const condition = target >= activeAsset.price ? 'above' : 'below';
    addPriceAlert(activeAsset.symbol, target, condition);
    setAlertPrice('');
  };

  if (collapsed) {
    return (
      <div className="bg-slate-900 border-l border-slate-800 p-2 flex flex-col items-center space-y-4 rounded-r-xl font-mono text-xs">
        <button
          onClick={() => setCollapsed(false)}
          className="p-1.5 rounded bg-slate-950 text-slate-400 hover:text-cyan-400 border border-slate-800 transition-colors"
          title="Expand Right Sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <Star className="w-4 h-4 text-amber-400" />
        <Bell className="w-4 h-4 text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="w-80 bg-slate-900 border-l border-slate-800 rounded-r-xl flex flex-col justify-between h-full font-sans shadow-xl text-xs z-10">
      <div>
        {/* Top Sidebar Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2.5 bg-slate-950 rounded-tr-xl">
          <div className="flex items-center space-x-1 font-mono">
            <button
              onClick={() => setActiveSubTab('watchlist')}
              className={`px-2 py-1 rounded transition-colors font-bold ${
                activeSubTab === 'watchlist' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              Watchlist
            </button>
            <button
              onClick={() => setActiveSubTab('alerts')}
              className={`px-2 py-1 rounded transition-colors font-bold flex items-center space-x-1 ${
                activeSubTab === 'alerts' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bell className="w-3 h-3" />
              <span>Alerts ({priceAlerts.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('info')}
              className={`px-2 py-1 rounded transition-colors font-bold ${
                activeSubTab === 'info' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              Stats
            </button>
          </div>

          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded text-slate-400 hover:text-white transition-colors"
            title="Collapse Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Watchlist Tab View */}
        {activeSubTab === 'watchlist' && (
          <div className="divide-y divide-slate-800/60 max-h-[500px] overflow-y-auto">
            {assets.map(asset => {
              const isFav = watchlist.includes(asset.symbol);
              const isActive = asset.symbol === activeAsset.symbol;
              const isPositive = asset.change24h >= 0;

              return (
                <div
                  key={asset.symbol}
                  onClick={() => setActiveAsset(asset)}
                  className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                    isActive ? 'bg-cyan-500/10 border-l-2 border-cyan-400' : 'hover:bg-slate-950/50'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWatchlist(asset.symbol);
                      }}
                      className={`text-slate-600 hover:text-amber-400 ${isFav ? 'text-amber-400' : ''}`}
                    >
                      <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                    </button>
                    <div>
                      <div className="font-bold text-white font-mono">{asset.symbol}</div>
                      <div className="text-[10px] text-slate-400 truncate w-24">{asset.name}</div>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="font-bold text-white">
                      ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div className={`text-[11px] font-bold flex items-center justify-end ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPositive ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                      {isPositive ? '+' : ''}{asset.change24h.toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Alerts Tab View */}
        {activeSubTab === 'alerts' && (
          <div className="p-3 space-y-4 font-mono">
            <form onSubmit={handleCreateAlert} className="space-y-2">
              <label className="block text-[11px] text-slate-400 font-bold">SET PRICE ALERT ON {activeAsset.symbol}</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  step="any"
                  value={alertPrice}
                  onChange={e => setAlertPrice(e.target.value)}
                  placeholder={`Current: $${activeAsset.price}`}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-cyan-500 text-slate-950 font-bold rounded flex items-center space-x-1 hover:bg-cyan-400 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ADD</span>
                </button>
              </div>
            </form>

            <div className="space-y-2">
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Active Triggers ({priceAlerts.length})</span>
              {priceAlerts.length === 0 ? (
                <p className="text-slate-500 text-[11px] py-2">No active price alerts.</p>
              ) : (
                priceAlerts.map(alert => (
                  <div key={alert.id} className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white mr-1">{alert.symbol}</span>
                      <span className="text-cyan-400 font-bold">{alert.condition.toUpperCase()} ${alert.targetPrice}</span>
                    </div>
                    <button
                      onClick={() => removePriceAlert(alert.id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Stats Tab View */}
        {activeSubTab === 'info' && (
          <div className="p-4 space-y-3 font-mono">
            <div className="border-b border-slate-800 pb-2">
              <h4 className="font-bold text-white text-sm">{activeAsset.name}</h4>
              <span className="text-cyan-400 font-bold text-xs">{activeAsset.symbol}</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Current Price:</span>
                <span className="text-white font-bold">${activeAsset.price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>24h High:</span>
                <span className="text-emerald-400">${activeAsset.high24h.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>24h Low:</span>
                <span className="text-rose-400">${activeAsset.low24h.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>24h Volume:</span>
                <span className="text-slate-200">${(activeAsset.volume24h / 1e6).toFixed(1)}M</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-slate-800 text-[10px] text-slate-500 font-mono text-center">
        TradingView Pro Right Drawer
      </div>
    </div>
  );
};
