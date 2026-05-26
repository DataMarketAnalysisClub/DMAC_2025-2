import { useEffect, useRef } from 'react';
import { createChart, LineSeries, type IChartApi } from 'lightweight-charts';
import { normalizeBase100 } from './chartUtils';
import type { OHLCVBar } from '../../types/stock';

const LINE_COLORS = ['#22d3ee', '#f59e0b', '#a78bfa', '#fb7185', '#34d399'];

interface ComparisonChartProps {
  datasets: { ticker: string; bars: OHLCVBar[] }[];
}

export function ComparisonChart({ datasets }: ComparisonChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { color: '#0d0d0d' }, textColor: '#94a3b8' },
      grid: { vertLines: { color: '#1e1e1e' }, horzLines: { color: '#1e1e1e' } },
      rightPriceScale: { borderColor: '#1e1e1e' },
      timeScale: { borderColor: '#1e1e1e', timeVisible: true },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });
    chartRef.current = chart;

    const ro = new ResizeObserver(() => {
      if (containerRef.current)
        chart.applyOptions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
    });
    ro.observe(containerRef.current);
    return () => { ro.disconnect(); chart.remove(); chartRef.current = null; };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // Remove all existing series by removing and recreating (simplest approach)
    chart.applyOptions({});
    // lightweight-charts v5 doesn't expose removeSeries directly on chart,
    // so we recreate the chart's series list by removing children via the series ref
    const refs: ReturnType<typeof chart.addSeries>[] = [];

    datasets.forEach(({ ticker, bars }, i) => {
      const normalized = normalizeBase100(bars);
      if (!normalized.length) return;
      const series = chart.addSeries(LineSeries, {
        color: LINE_COLORS[i % LINE_COLORS.length],
        lineWidth: 2,
        title: ticker,
      });
      series.setData(normalized.map((p) => ({ time: p.time as any, value: p.value })));
      refs.push(series);
    });

    chart.timeScale().fitContent();
    return () => { refs.forEach((s) => chart.removeSeries(s)); };
  }, [datasets]);

  if (!datasets.length) {
    return (
      <div className="flex items-center justify-center h-full text-[#64748b] text-xs">
        Add tickers to compare
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full" />;
}
