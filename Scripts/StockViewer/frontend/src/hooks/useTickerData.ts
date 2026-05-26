import { useEffect, useState } from 'react';
import { getQuote, getMetrics } from '../api/stocks';
import type { StockQuote, StockMetrics } from '../types/stock';

export function useTickerData(ticker: string) {
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [metrics, setMetrics] = useState<StockMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ticker) return;
    let cancelled = false;
    setLoading(true);

    Promise.allSettled([getQuote(ticker), getMetrics(ticker)]).then(([q, m]) => {
      if (cancelled) return;
      if (q.status === 'fulfilled') setQuote(q.value);
      if (m.status === 'fulfilled') setMetrics(m.value);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [ticker]);

  return { quote, metrics, loading };
}
