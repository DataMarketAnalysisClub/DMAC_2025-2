import { useState, useEffect, useRef } from 'react';
import { searchStocks } from '../../api/stocks';
import { useMarketStore } from '../../store/useMarketStore';
import { useChartStore } from '../../store/useChartStore';
import type { Market } from '../../types/stock';

export function TopBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ ticker: string; name: string; market: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [market, setMarket] = useState<Market>('US');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setTicker } = useMarketStore();
  const { setMainTicker } = useChartStore();

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      searchStocks(query, market)
        .then((res) => { setResults(res.results); setOpen(true); })
        .catch(() => setResults([]));
    }, 300);
  }, [query, market]);

  function select(ticker: string, mkt: string) {
    setTicker(ticker, mkt as Market);
    setMainTicker(ticker);
    setQuery('');
    setOpen(false);
  }

  return (
    <div className="flex items-center gap-3 px-4 h-10 border-b border-[#1e1e1e] bg-[#0d0d0d]">
      <span className="text-[#f59e0b] font-bold text-sm tracking-widest">STOCKVIEWER</span>
      <div className="relative ml-4 flex-1 max-w-sm">
        <div className="flex items-center bg-[#141414] border border-[#1e1e1e] rounded px-2 gap-2">
          <select
            value={market}
            onChange={(e) => setMarket(e.target.value as Market)}
            className="bg-transparent text-[#64748b] text-xs py-1 outline-none cursor-pointer"
          >
            <option value="US">US</option>
            <option value="CL">CL</option>
            <option value="ALL">ALL</option>
          </select>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Search ticker or company..."
            className="bg-transparent text-[#e2e8f0] text-xs py-1 outline-none flex-1 placeholder-[#64748b]"
          />
        </div>
        {open && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#141414] border border-[#1e1e1e] rounded shadow-lg z-50 max-h-60 overflow-y-auto">
            {results.map((r) => (
              <button
                key={r.ticker}
                onMouseDown={() => select(r.ticker, r.market)}
                className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-[#1e1e1e] text-left"
              >
                <span className="text-[#f59e0b] text-xs font-mono w-24">{r.ticker}</span>
                <span className="text-[#94a3b8] text-xs truncate">{r.name}</span>
                <span className="ml-auto text-[#64748b] text-[10px]">{r.market}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="ml-auto flex items-center gap-3">
        <Clock />
      </div>
    </div>
  );
}

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="text-[#64748b] text-xs font-mono">
      {time.toLocaleTimeString('en-US', { hour12: false })}
    </span>
  );
}
