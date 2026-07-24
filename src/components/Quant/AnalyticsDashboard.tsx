import React from 'react';
import { useTrading } from '../../context/TradingContext';
import { generateMonthlyReturns, calculateAssetCorrelations } from '../../services/quantEngine';
import { Award, Grid, BarChart3 } from 'lucide-react';

export const AnalyticsDashboard: React.FC = () => {
  const { assets } = useTrading();

  const monthlyReturns = generateMonthlyReturns();
  const correlations = calculateAssetCorrelations(assets.slice(0, 6));

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-mono">Institutional Quantitative Analytics & Heatmap Studio</h2>
            <p className="text-xs text-slate-400">Advanced risk-adjusted ratios, monthly return heatmaps, and asset correlation matrix</p>
          </div>
        </div>
      </div>

      {/* Monthly Returns Heatmap Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Grid className="w-4 h-4 text-cyan-400" />
          <h3 className="font-bold text-white text-sm font-mono">MONTHLY RETURNS PERFORMANCE HEATMAP (%)</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-2 text-left">YEAR</th>
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                  <th key={m} className="pb-2">{m.toUpperCase()}</th>
                ))}
                <th className="pb-2 text-cyan-400">YEAR TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {monthlyReturns.map(row => (
                <tr key={row.year} className="hover:bg-slate-950/40">
                  <td className="py-3 font-bold text-white text-left">{row.year}</td>
                  {row.months.map(m => {
                    const isPositive = m.returnPct >= 0;
                    return (
                      <td key={m.month} className="py-3 px-1">
                        <div
                          className={`py-1.5 px-1 rounded font-bold transition-all ${
                            isPositive
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {isPositive ? '+' : ''}{m.returnPct}%
                        </div>
                      </td>
                    );
                  })}
                  <td className="py-3 font-bold text-cyan-400 text-sm">
                    {row.totalYearReturnPct >= 0 ? '+' : ''}{row.totalYearReturnPct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Asset Correlation Matrix Heatmap */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <BarChart3 className="w-4 h-4 text-indigo-400" />
          <h3 className="font-bold text-white text-sm font-mono">PEARSON ASSET CORRELATION MATRIX</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {correlations.map((pair, idx) => (
            <div
              key={idx}
              className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between text-xs font-mono"
            >
              <div className="text-slate-300 font-bold">
                {pair.symbolA} / {pair.symbolB}
              </div>
              <div
                className={`px-2.5 py-1 rounded font-bold ${
                  pair.correlation > 0.5
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : pair.correlation < -0.2
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {pair.correlation > 0 ? '+' : ''}{pair.correlation}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
