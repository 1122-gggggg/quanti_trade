import React, { useEffect, useRef } from 'react';
import {
  createChart,
  ColorType,
  CandlestickSeries,
  BarSeries,
  LineSeries,
  AreaSeries,
  BaselineSeries,
  HistogramSeries,
  type IChartApi,
  type CandlestickData,
  type BarData,
  type LineData,
  type AreaData,
  type BaselineData,
  type HistogramData,
} from 'lightweight-charts';
import { useTrading } from '../../context/TradingContext';
import {
  calculateSMA,
  calculateEMA,
  calculateBollingerBands,
  calculateVWAP,
} from '../../services/technicalIndicators';
import { normalizeChartCandles, toHeikinAshi } from '../../services/chartTransforms';

export const TradingChart: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const { candles, indicators, activeAsset, theme, chartType } = useTrading();

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const isTerminal = theme === 'terminal';
    const isLight = theme === 'light';
    const backgroundColor = isTerminal ? '#000000' : isLight ? '#ffffff' : '#090d16';
    const textColor = isTerminal ? '#00ff00' : isLight ? '#334155' : '#94a3b8';
    const gridColor = isTerminal ? '#003300' : isLight ? '#f1f5f9' : '#1e293b';
    const upColor = isTerminal ? '#00ff00' : '#10b981';
    const downColor = isTerminal ? '#ff0000' : '#f43f5e';
    const normalizedCandles = normalizeChartCandles(candles);
    const displayCandles = chartType === 'heikinAshi'
      ? toHeikinAshi(normalizedCandles)
      : normalizedCandles;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 520,
      layout: {
        background: { type: ColorType.Solid, color: backgroundColor },
        textColor,
        fontSize: 12,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: gridColor },
      timeScale: {
        borderColor: gridColor,
        timeVisible: true,
        secondsVisible: true,
      },
    });

    chartRef.current = chart;

    if (chartType === 'line') {
      const series = chart.addSeries(LineSeries, {
        color: '#06b6d4',
        lineWidth: 2,
      });
      const data: LineData[] = displayCandles.map(candle => ({
        time: candle.time as never,
        value: candle.close,
      }));
      series.setData(data);
    } else if (chartType === 'area') {
      const series = chart.addSeries(AreaSeries, {
        topColor: 'rgba(6, 182, 212, 0.4)',
        bottomColor: 'rgba(6, 182, 212, 0.0)',
        lineColor: '#06b6d4',
        lineWidth: 2,
      });
      const data: AreaData[] = displayCandles.map(candle => ({
        time: candle.time as never,
        value: candle.close,
      }));
      series.setData(data);
    } else if (chartType === 'baseline') {
      const basePrice = displayCandles[0]?.close ?? 0;
      const series = chart.addSeries(BaselineSeries, {
        baseValue: { type: 'price', price: basePrice },
        topLineColor: upColor,
        topFillColor1: 'rgba(16, 185, 129, 0.35)',
        topFillColor2: 'rgba(16, 185, 129, 0.05)',
        bottomLineColor: downColor,
        bottomFillColor1: 'rgba(244, 63, 94, 0.05)',
        bottomFillColor2: 'rgba(244, 63, 94, 0.35)',
      });
      const data: BaselineData[] = displayCandles.map(candle => ({
        time: candle.time as never,
        value: candle.close,
      }));
      series.setData(data);
    } else if (chartType === 'bar') {
      const series = chart.addSeries(BarSeries, {
        upColor,
        downColor,
        openVisible: true,
        thinBars: false,
      });
      const data: BarData[] = displayCandles.map(candle => ({
        time: candle.time as never,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }));
      series.setData(data);
    } else {
      const isHollow = chartType === 'hollowCandles';
      const series = chart.addSeries(CandlestickSeries, {
        upColor: isHollow ? backgroundColor : upColor,
        downColor,
        borderVisible: isHollow,
        borderUpColor: upColor,
        borderDownColor: downColor,
        wickUpColor: upColor,
        wickDownColor: downColor,
      });
      const data: CandlestickData[] = displayCandles.map(candle => ({
        time: candle.time as never,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }));
      series.setData(data);
    }

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    const volumeData: HistogramData[] = normalizedCandles.map(candle => ({
      time: candle.time as never,
      value: candle.volume,
      color: candle.close >= candle.open
        ? (isTerminal ? 'rgba(0, 255, 0, 0.3)' : 'rgba(16, 185, 129, 0.3)')
        : (isTerminal ? 'rgba(255, 0, 0, 0.3)' : 'rgba(244, 63, 94, 0.3)'),
    }));
    volumeSeries.setData(volumeData);

    const closes = displayCandles.map(candle => candle.close);

    indicators.forEach(indicator => {
      if (!indicator.enabled) return;

      if (indicator.type === 'SMA') {
        const values = calculateSMA(closes, indicator.period);
        const series = chart.addSeries(LineSeries, {
          color: indicator.color,
          lineWidth: 2,
          title: `SMA ${indicator.period}`,
        });
        const data: LineData[] = displayCandles.flatMap((candle, index) => {
          const value = values[index];
          return value === null ? [] : [{ time: candle.time as never, value }];
        });
        series.setData(data);
      } else if (indicator.type === 'EMA') {
        const values = calculateEMA(closes, indicator.period);
        const series = chart.addSeries(LineSeries, {
          color: indicator.color,
          lineWidth: 2,
          title: `EMA ${indicator.period}`,
        });
        const data: LineData[] = displayCandles.flatMap((candle, index) => {
          const value = values[index];
          return value === null ? [] : [{ time: candle.time as never, value }];
        });
        series.setData(data);
      } else if (indicator.type === 'VWAP') {
        const values = calculateVWAP(displayCandles);
        const series = chart.addSeries(LineSeries, {
          color: indicator.color,
          lineWidth: 2,
          title: 'VWAP',
        });
        const data: LineData[] = displayCandles.flatMap((candle, index) => {
          const value = values[index];
          return value === null ? [] : [{ time: candle.time as never, value }];
        });
        series.setData(data);
      } else if (indicator.type === 'BB') {
        const bands = calculateBollingerBands(closes, indicator.period, 2);
        const upperSeries = chart.addSeries(LineSeries, {
          color: indicator.color,
          lineWidth: 1,
          title: 'BB Upper',
        });
        const lowerSeries = chart.addSeries(LineSeries, {
          color: indicator.color,
          lineWidth: 1,
          title: 'BB Lower',
        });
        const upperData: LineData[] = displayCandles.flatMap((candle, index) => {
          const value = bands.upper[index];
          return value === null ? [] : [{ time: candle.time as never, value }];
        });
        const lowerData: LineData[] = displayCandles.flatMap((candle, index) => {
          const value = bands.lower[index];
          return value === null ? [] : [{ time: candle.time as never, value }];
        });
        upperSeries.setData(upperData);
        lowerSeries.setData(lowerData);
      }
    });

    chart.timeScale().fitContent();

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
