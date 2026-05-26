import { useEffect, useRef } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
} from 'lightweight-charts';
import type { OHLCVBar } from '../../types/stock';

interface MainChartProps {
  bars: OHLCVBar[];
  loading: boolean;
}

const CHART_OPTS = {
  layout: { background: { color: '#0d0d0d' }, textColor: '#94a3b8' },
  grid: { vertLines: { color: '#1e1e1e' }, horzLines: { color: '#1e1e1e' } },
  crosshair: { mode: 1 },
  rightPriceScale: { borderColor: '#1e1e1e' },
  timeScale: { borderColor: '#1e1e1e', timeVisible: true },
} as const;

export function MainChart({ bars, loading }: MainChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  // Create chart once
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      ...CHART_OPTS,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    const candle = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e', downColor: '#ef4444',
      borderUpColor: '#22c55e', borderDownColor: '#ef4444',
      wickUpColor: '#22c55e', wickDownColor: '#ef4444',
    });

    const vol = chart.addSeries(HistogramSeries, {
      color: '#1e293b', priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    chartRef.current = chart;
    candleRef.current = candle;
    volRef.current = vol;

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // Update data when bars change
  useEffect(() => {
    if (!candleRef.current || !volRef.current || !bars.length) return;

    const candleData: CandlestickData[] = bars.map((b) => ({
      time: b.time as any,
      open: b.open, high: b.high, low: b.low, close: b.close,
    }));

    const volData: HistogramData[] = bars.map((b) => ({
      time: b.time as any,
      value: b.volume,
      color: b.close >= b.open ? '#22c55e33' : '#ef444433',
    }));

    candleRef.current.setData(candleData);
    volRef.current.setData(volData);
    chartRef.current?.timeScale().fitContent();
  }, [bars]);

  return (
    <div className="relative w-full h-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#0d0d0d]/60">
          <span className="text-[#64748b] text-xs">Loading...</span>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
