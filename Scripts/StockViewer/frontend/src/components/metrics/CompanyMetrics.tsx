import type { StockMetrics } from '../../types/stock';
import { MetricCard } from './MetricCard';
import { formatMarketCap } from '../charts/chartUtils';

interface CompanyMetricsProps {
  metrics: StockMetrics | null;
}

export function CompanyMetrics({ metrics }: CompanyMetricsProps) {
  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-32 text-[#64748b] text-xs">
        Loading metrics...
      </div>
    );
  }

  const divYield = metrics.div_yield != null
    ? `${(metrics.div_yield * 100).toFixed(2)}%`
    : '—';

  return (
    <div className="flex flex-col">
      <div className="px-3 py-2 border-b border-[#1e1e1e]">
        <span className="text-[#64748b] text-[10px] uppercase tracking-wider">Company Info</span>
      </div>
      <MetricCard label="Sector" value={metrics.sector ?? '—'} />
      <MetricCard label="Industry" value={metrics.industry ?? '—'} />
      <MetricCard label="Exchange" value={metrics.exchange ?? '—'} />
      <MetricCard label="Currency" value={metrics.currency ?? '—'} />
      <div className="mt-2 px-3 py-2 border-b border-[#1e1e1e]">
        <span className="text-[#64748b] text-[10px] uppercase tracking-wider">Fundamentals</span>
      </div>
      <MetricCard label="Market Cap" value={formatMarketCap(metrics.market_cap)} />
      <MetricCard label="P/E Ratio" value={metrics.pe_ratio != null ? metrics.pe_ratio.toFixed(2) : '—'} />
      <MetricCard label="Dividend Yield" value={divYield} />
    </div>
  );
}
