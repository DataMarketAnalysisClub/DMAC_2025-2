import type { OHLCVBar } from '../../types/stock';

export function normalizeBase100(bars: OHLCVBar[]): { time: number; value: number }[] {
  if (!bars.length) return [];
  const base = bars[0].close;
  return bars.map((b) => ({ time: b.time, value: parseFloat(((b.close / base) * 100).toFixed(4)) }));
}

export function formatVolume(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toFixed(0);
}

export function formatPrice(v: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v);
}

export function formatMarketCap(v: number | null): string {
  if (v == null) return '—';
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  return `$${v.toFixed(0)}`;
}
