import React, { useState } from 'react';
import { TradingProvider, useTrading } from './context/TradingContext';
import { Navbar, type ActiveTab } from './components/Layout/Navbar';
import { TickerBar } from './components/Layout/TickerBar';
import { ChartHeader } from './components/Chart/ChartHeader';
import { IndicatorControls } from './components/Chart/IndicatorControls';
import { TradingChart } from './components/Chart/TradingChart';
import { DrawingToolbar } from './components/Chart/DrawingToolbar';
import { TradingViewSidebar } from './components/Chart/TradingViewSidebar';
import { SignalRadar } from './components/Signal/SignalRadar';
import { BacktesterView } from './components/Quant/BacktesterView';
import { CopilotView } from './components/AI/CopilotView';
import { NewsFeed } from './components/News/NewsFeed';
import { MarketScreener } from './components/Screener/MarketScreener';
import { DeveloperSettings } from './components/Settings/DeveloperSettings';
import { Footer } from './components/Layout/Footer';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('chart');
  const { theme } = useTrading();

  const themeClasses = 
    theme === 'terminal' 
      ? 'bg-black text-green-500 font-mono' 
      : theme === 'light' 
      ? 'bg-slate-100 text-slate-900' 
      : 'bg-slate-950 text-slate-100';

  return (
    <div className={`min-h-screen flex flex-col ${themeClasses} transition-colors duration-300 font-sans selection:bg-cyan-500 selection:text-slate-950`}>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <TickerBar />

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Main Interactive Chart & Signal Detector Tab */}
        {activeTab === 'chart' && (
          <div className="space-y-6">
            {/* TradingView 3-Column Layout: Left Drawing Bar, Center Canvas Chart, Right Watchlist Sidebar */}
            <div className="flex flex-col lg:flex-row items-stretch gap-4">
              {/* Left Drawing Toolbar */}
              <div className="hidden md:flex">
                <DrawingToolbar />
              </div>

              {/* Center Main Canvas Chart */}
              <div className="flex-1 space-y-0 min-w-0">
                <ChartHeader />
                <IndicatorControls />
                <TradingChart />
              </div>

              {/* Right TradingView Sidebar (Watchlist, Alerts, Asset Stats) */}
              <div className="hidden xl:flex">
                <TradingViewSidebar />
              </div>
            </div>

            {/* Signal Radar Below Chart */}
            <SignalRadar />
          </div>
        )}

        {/* Dedicated Signal Radar Tab */}
        {activeTab === 'signals' && <SignalRadar />}

        {/* Quant Backtester Suite */}
        {activeTab === 'quant' && <BacktesterView />}

        {/* AI Signal Copilot Tab */}
        {activeTab === 'ai' && <CopilotView />}

        {/* Market News Tab */}
        {activeTab === 'news' && <NewsFeed />}

        {/* Market Screener Tab */}
        {activeTab === 'screener' && <MarketScreener />}

        {/* Developer Settings Tab */}
        {activeTab === 'settings' && <DeveloperSettings />}
      </main>

      <Footer />
    </div>
  );
};

export function App() {
  return (
    <TradingProvider>
      <AppContent />
    </TradingProvider>
  );
}

export default App;
