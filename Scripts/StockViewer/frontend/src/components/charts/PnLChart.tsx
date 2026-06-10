import { useEffect, useRef } from 'react';
import { createChart, AreaSeries, type IChartApi, type ISeriesApi } from 'lightweight-charts';
import type { PnLPoint } from '../../types/portfolio';

interface PnLChartProps {
  series: PnLPoint[];
  positive: boolean;
}

export function PnLChart({ series, positive }: PnLChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const areaRef = useRef<ISeriesApi<'Area'> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { color: '#0d0d0d' }, textColor: '#94a3b8' },
      grid: { vertLines: { color: '#1e1e1e' }, horzLines: { color: '#1e1e1e' } },
      rightPriceScale: { borderColor: '#1e1e1e' },
      timeScale: { borderColor: '#1e1e1e' },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });
    const area = chart.addSeries(AreaSeries, { lineWidth: 2 });
    chartRef.current = chart;
    areaRef.current = area;

    const ro = new ResizeObserver(() => {
      if (containerRef.current)
        chart.applyOptions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
    });
    ro.observe(containerRef.current);
    return () => { ro.disconnect(); chart.remove(); chartRef.current = null; areaRef.current = null; };
  }, []);

  useEffect(() => {
    if (!areaRef.current) return;
    const color = positive ? '#22c55e' : '#ef4444';
    areaRef.current.applyOptions({
      lineColor: color,
      topColor: `${color}33`,
      bottomColor: `${color}05`,
    });
    areaRef.current.setData(series.map((p) => ({ time: p.date as any, value: p.value })));
    chartRef.current?.timeScale().fitContent();
  }, [series, positive]);

  if (!series.length) {
    return (
      <div className="flex items-center justify-center h-full text-[#64748b] text-xs">
        Add holdings to see portfolio performance
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full" />;
}
