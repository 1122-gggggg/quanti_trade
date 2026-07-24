import React, { useEffect, useRef } from 'react';
import { 
  createChart, 
  ColorType, 
  CandlestickSeries, 
  LineSeries, 
  AreaSeries,
  HistogramSeries,
  type IChartApi, 
  type CandlestickData, 
  type LineData, 
  type AreaData,
  type HistogramData 
} from 'lightweight-charts';
import { useTrading } from '../../context/TradingContext';
import { calculateSMA, calculateEMA, calculateBollingerBands, calculateVWAP } from '../../services/technicalIndicators';

export const TradingChart: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const { candles, indicators, activeAsset, theme, chartType } = useTrading();

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const isTerminal = theme === 'terminal';
    const isLight = theme === 'light';

    const bgColor = isTerminal ? '#000000' : isLight ? '#ffffff' : '#090d16';
    const textColor = isTerminal ? '#00ff00' : isLight ? '#334155' : '#94a3b8';
    const gridColor = isTerminal ? '#003300' : isLight ? '#f1f5f9' : '#1e293b';

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 520,
      layout: {
        background: { type: ColorType.Solid, color: bgColor },
        textColor: textColor,
        fontSize: 12,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: gridColor,
      },
      timeScale: {
        borderColor: gridColor,
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Series rendering based on chartType
    if (chartType === 'line') {
      const lineSeries = chart.addSeries(LineSeries, {
        color: '#06b6d4',
        lineWidth: 2,
      });
      const lineData: LineData[] = candles.map(c => ({
        time: c.time as any,
        value: c.close,
      }));
      lineSeries.setData(lineData);
    } else if (chartType === 'area') {
      const areaSeries = chart.addSeries(AreaSeries, {
        topColor: 'rgba(6, 182, 212, 0.4)',
        bottomColor: 'rgba(6, 182, 212, 0.0)',
        lineColor: '#06b6d4',
        lineWidth: 2,
      });
      const areaData: AreaData[] = candles.map(c => ({
        time: c.time as any,
        value: c.close,
      }));
      areaSeries.setData(areaData);
    } else {
      // Default: Candlesticks
      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: isTerminal ? '#00ff00' : '#10b981',
        downColor: isTerminal ? '#ff0000' : '#f43f5e',
        borderVisible: false,
        wickUpColor: isTerminal ? '#00ff00' : '#10b981',
        wickDownColor: isTerminal ? '#ff0000' : '#f43f5e',
      });

      const candleData: CandlestickData[] = candles.map(c => ({
        time: c.time as any,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));

      candlestickSeries.setData(candleData);
    }

    // Volume Histogram Series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    const volumeData: HistogramData[] = candles.map(c => ({
      time: c.time as any,
      value: c.volume,
      color: c.close >= c.open 
        ? (isTerminal ? 'rgba(0, 255, 0, 0.3)' : 'rgba(16, 185, 129, 0.3)')
        : (isTerminal ? 'rgba(255, 0, 0, 0.3)' : 'rgba(244, 63, 94, 0.3)'),
    }));

    volumeSeries.setData(volumeData);

    // Add Overlay Technical Indicators
    const closes = candles.map(c => c.close);

    indicators.forEach(ind => {
      if (!ind.enabled) return;

      if (ind.type === 'SMA') {
        const smaValues = calculateSMA(closes, ind.period);
        const lineSeries = chart.addSeries(LineSeries, {
          color: ind.color,
          lineWidth: 2,
          title: `SMA ${ind.period}`,
        });
        const lineData: LineData[] = candles
          .map((c, idx) => ({
            time: c.time as any,
            value: smaValues[idx] || 0,
          }))
          .filter(d => d.value > 0);
        lineSeries.setData(lineData);
      } else if (ind.type === 'EMA') {
        const emaValues = calculateEMA(closes, ind.period);
        const lineSeries = chart.addSeries(LineSeries, {
          color: ind.color,
          lineWidth: 2,
          title: `EMA ${ind.period}`,
        });
        const lineData: LineData[] = candles
          .map((c, idx) => ({
            time: c.time as any,
            value: emaValues[idx] || 0,
          }))
          .filter(d => d.value > 0);
        lineSeries.setData(lineData);
      } else if (ind.type === 'VWAP') {
        const vwapValues = calculateVWAP(candles);
        const lineSeries = chart.addSeries(LineSeries, {
          color: ind.color,
          lineWidth: 2,
          title: 'VWAP',
        });
        const lineData: LineData[] = candles
          .map((c, idx) => ({
            time: c.time as any,
            value: vwapValues[idx] || 0,
          }))
          .filter(d => d.value > 0);
        lineSeries.setData(lineData);
      } else if (ind.type === 'BB') {
        const bb = calculateBollingerBands(closes, ind.period, 2);
        const upperSeries = chart.addSeries(LineSeries, { color: ind.color, lineWidth: 1, title: 'BB Upper' });
        const lowerSeries = chart.addSeries(LineSeries, { color: ind.color, lineWidth: 1, title: 'BB Lower' });

        const upperData: LineData[] = candles
          .map((c, idx) => ({ time: c.time as any, value: bb.upper[idx] || 0 }))
          .filter(d => d.value > 0);
        const lowerData: LineData[] = candles
          .map((c, idx) => ({ time: c.time as any, value: bb.lower[idx] || 0 }))
          .filter(d => d.value > 0);

        upperSeries.setData(upperData);
        lowerSeries.setData(lowerData);
      }
    });

    chart.timeScale().fitContent();

    // Handle Window Resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [candles, indicators, activeAsset.symbol, theme, chartType]);

  return (
    <div className="relative w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-xl">
      <div ref={chartContainerRef} className="w-full h-[520px]" />
    </div>
  );
};
