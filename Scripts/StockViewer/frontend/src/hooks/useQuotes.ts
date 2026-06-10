import { useEffect, useState } from 'react';
import { getBatchQuotes } from '../api/stocks';
import { usePolling } from './usePolling';
import type { StockQuote } from '../types/stock';

/** Batch-fetches quotes for a set of tickers and keeps them fresh via polling. */
export function useQuotes(tickers: string[], pollMs = 30_000) {
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const key = [...new Set(tickers)].sort().join(',');

  function load() {
    if (!key) return;
    getBatchQuotes(key.split(','))
      .then((res) => {
        setQuotes((prev) => {
          const next = { ...prev };
          res.quotes.forEach((q) => { next[q.ticker] = q; });
          return next;
        });
      })
      .catch(() => {});
  }

  useEffect(load, [key]);
  usePolling(load, pollMs, !!key);

  return quotes;
}
