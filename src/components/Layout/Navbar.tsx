import React from 'react';
import { 
  TrendingUp, 
  BarChart2, 
  Radar, 
  Cpu, 
  Newspaper, 
  Search, 
  Settings, 
  Sun, 
  Moon, 
  Terminal,
  Activity,
  Bell
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

export type ActiveTab = 'chart' | 'signals' | 'quant' | 'ai' | 'news' | 'screener' | 'settings';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { theme, setTheme, priceAlerts } = useTrading();

  return (
    <header className="navbar-container border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-4 py-2.5 flex items-center justify-between">
      {/* Brand & Logo */}
      <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('chart')}>
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/20">
          <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-cyan-400" />
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-lg tracking-tight text-white font-sans">ApexTrade</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono font-medium">SIGNAL LAB v2.4</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-semibold">OPEN SOURCE</span>
          </div>
          <p className="text-xs text-slate-400">Quantitative Trading Signal Detector & Analytics Workstation</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="hidden lg:flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800/80">
        <button
          onClick={() => setActiveTab('chart')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'chart' 
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Live Chart</span>
        </button>

        <button
          onClick={() => setActiveTab('signals')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'signals' 
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Radar className="w-3.5 h-3.5 text-cyan-400" />
          <span>Signal Radar</span>
        </button>

        <button
          onClick={() => setActiveTab('quant')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'quant' 
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Quant Backtest</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'ai' 
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>AI Copilot</span>
        </button>

        <button
          onClick={() => setActiveTab('news')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'news' 
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Newspaper className="w-3.5 h-3.5" />
          <span>Market News</span>
        </button>

        <button
          onClick={() => setActiveTab('screener')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'screener' 
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Screener</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'settings' 
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Dev & Settings</span>
        </button>
      </nav>

      {/* Right Stats & Tools */}
      <div className="flex items-center space-x-4">
        {/* Active Alerts Pill */}
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-slate-900/90 rounded-lg border border-slate-800 text-xs font-mono">
          <Bell className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400">ALERTS:</span>
          <span className="font-bold text-white">{priceAlerts.length} Active</span>
        </div>

        {/* Theme Switcher */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
          <button
            onClick={() => setTheme('dark')}
            className={`p-1.5 rounded ${theme === 'dark' ? 'bg-slate-800 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
            title="Dark Theme"
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTheme('terminal')}
            className={`p-1.5 rounded ${theme === 'terminal' ? 'bg-slate-800 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
            title="Bloomberg Terminal Theme"
          >
            <Terminal className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTheme('light')}
            className={`p-1.5 rounded ${theme === 'light' ? 'bg-slate-800 text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}
            title="Light Theme"
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* GitHub Badge Link */}
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium transition-colors"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          <span className="hidden sm:inline">Star on GitHub</span>
        </a>
      </div>
    </header>
  );
};
