import { useEffect, useState } from 'react';
import { getOHLCV } from '../api/stocks';
import type { OHLCVBar } from '../types/stock';

export function useOHLCV(ticker: string, period: string) {
  const [bars, setBars] = useState<OHLCVBar[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticker) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getOHLCV(ticker, period)
      .then((res) => { if (!cancelled) setBars(res.bars); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [ticker, period]);

  return { bars, loading, error };
}
