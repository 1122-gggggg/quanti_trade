# 🚀 ApexTrade Studio (ApexTrade OS) — Institutional Quantitative Trading Terminal

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-cyan.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-purple.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4.0-06b6d4.svg)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ed.svg)](https://www.docker.com/)

> **ApexTrade Studio** is a complete, modern, free & open-source Web-based **Quantitative Trading & Algorithmic Strategy Terminal**. Designed for traders, quantitative researchers, and software engineers looking for a self-hostable, high-performance financial workstation.

---

## ✨ Features at a Glance

### 1. 📈 Professional HTML5 Canvas Charting Engine
* Powered by TradingView's Lightweight Charts v4 with interactive crosshairs, timeframe selector (`1m`, `5m`, `15m`, `1h`, `4h`, `1D`), and volume histograms.
* Real-Time Technical Indicator Overlays: Simple Moving Average (SMA), Exponential Moving Average (EMA), Relative Strength Index (RSI), Volume Weighted Average Price (VWAP), and Bollinger Bands (BB).

### 2. 💻 Browser Algorithmic Code IDE & Strategy Sandbox
* **In-Browser Code IDE**: Write and edit custom Quantitative Trading algorithms directly in JavaScript syntax (`onTick(candles, index)`).
* **Pre-built Algorithm Templates**: Dual Moving Average Crossover (Golden/Death Cross), RSI Mean Reversion, Quantitative Grid Trading Bot.
* **Instant Backtest Sandbox**: Evaluate custom algorithms live against historical candle datasets.

### 3. 🤖 Automated Quantitative Trading Bots Manager
* Deploy background algorithmic bots that monitor ticks and automatically execute paper trade orders.
* Individual bot status controls (Start / Pause), live allocation monitoring, win rate calculations, and real-time execution event stream.

### 4. 📊 Institutional Risk & Performance Analytics
* Comprehensive Metrics: **Sortino Ratio, Calmar Ratio, Sharpe Ratio, Max Drawdown %, CAGR, Win Rate %, Profit Factor**.
* **Monthly Return Heatmap Matrix**: Yearly and monthly returns grid colored dynamically by performance.
* **Pearson Asset Correlation Matrix**: Calculate pair-wise correlation coefficients between cryptocurrencies, stocks, forex, and commodities.

### 5. 💼 Leveraged Paper Trading & Execution Terminal
* Multi-leveraged execution (1x, 2x, 5x, 10x, 20x) with $100,000 USD virtual balance.
* Automated Take Profit (TP) & Stop Loss (SL) monitoring engine.
* Export trade history to standard CSV spreadsheets.

### 6. 📡 Dual Data Feed Engine
* **Binance Live WebSockets**: Stream real-time crypto ticker data live from Binance public WebSockets.
* **Simulated Stochastic Engine**: Geometric Brownian Motion tick generator with customizable market volatility (0.2x to 5.0x).

---

## ⚡ Quick Start Guide

### Prerequisites
- Node.js `v18.0.0` or higher
- npm `v9.0.0` or higher

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/apextrade-studio.git
   cd apextrade-studio
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. Open `http://localhost:5173` in your browser.

---

## 🐳 Self-Hosting with Docker

Deploy ApexTrade Studio in seconds using Docker Compose:

```bash
docker compose up -d
```

Access the application at `http://localhost:8080`.

---

## 📜 License

This project is licensed under the [MIT License](./LICENSE). Feel free to use, modify, and distribute it freely for personal or commercial projects.
