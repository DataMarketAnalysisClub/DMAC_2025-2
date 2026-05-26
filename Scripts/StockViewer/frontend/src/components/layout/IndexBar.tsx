import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { usePolling } from '../../hooks/usePolling';

interface IndexQuote {
  ticker: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  currency: string;
}

async function fetchIndices(): Promise<IndexQuote[]> {
  const res = await apiFetch<{ indices: IndexQuote[] }>('/market/indices');
  return res.indices;
}

function fmt(price: number, currency: string): string {
  if (currency === 'CLP') return price.toLocaleString('es-CL', { maximumFractionDigits: 1 });
  if (price >= 10_000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function IndexBar() {
  const [quotes, setQuotes] = useState<IndexQuote[]>([]);

  function load() {
    fetchIndices().then(setQuotes).catch(() => {});
  }

  useEffect(load, []);
  usePolling(load, 30_000);

  if (!quotes.length) {
    return (
      <div className="h-7 border-b border-[#1e1e1e] bg-[#0a0a0a] flex items-center px-4">
        <span className="text-[#2a2a2a] text-[10px] animate-pulse">Loading indices...</span>
      </div>
    );
  }

  return (
    <div className="h-7 border-b border-[#1e1e1e] bg-[#0a0a0a] flex items-center gap-0 overflow-x-auto no-scrollbar">
      {quotes.map((q, i) => {
        const up = q.change >= 0;
        const color = q.ticker === '^VIX'
          ? (up ? 'text-[#ef4444]' : 'text-[#22c55e]')  // VIX: rising is bad
          : (up ? 'text-[#22c55e]' : 'text-[#ef4444]');
        const arrow = up ? '▲' : '▼';

        return (
          <div
            key={q.ticker}
            className={`flex items-center gap-1.5 px-4 h-full shrink-0 ${
              i < quotes.length - 1 ? 'border-r border-[#1a1a1a]' : ''
            }`}
          >
            <span className="text-[#64748b] text-[10px] font-semibold tracking-wide uppercase">
              {q.name}
            </span>
            <span className="text-[#e2e8f0] text-[11px] font-mono">
              {fmt(q.price, q.currency)}
            </span>
            <span className={`text-[10px] font-mono ${color}`}>
              {arrow} {Math.abs(q.change_pct).toFixed(2)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
