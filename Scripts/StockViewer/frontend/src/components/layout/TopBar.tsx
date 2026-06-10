import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { searchStocks } from '../../api/stocks';
import { useMarketStore } from '../../store/useMarketStore';
import { useChartStore } from '../../store/useChartStore';
import type { Market, SearchResult } from '../../types/stock';

const RECENTS_KEY = 'sv:recent-searches';
const MAX_RECENTS = 8;

function loadRecents(): SearchResult[] {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveRecent(entry: SearchResult) {
  const next = [entry, ...loadRecents().filter((r) => r.ticker !== entry.ticker)].slice(0, MAX_RECENTS);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
}

const TABS = [
  { to: '/', label: 'MARKET', end: true },
  { to: '/favorites', label: 'FAVORITES', end: false },
  { to: '/portfolio', label: 'PORTFOLIO', end: false },
];

export function TopBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [market, setMarket] = useState<Market | 'ALL'>('US');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setTicker } = useMarketStore();
  const { setMainTicker } = useChartStore();
  const navigate = useNavigate();

  // When the query is empty the dropdown shows recently viewed tickers instead.
  const items = query.trim() ? results : loadRecents();
  const showingRecents = !query.trim();

  useEffect(() => {
    if (!query.trim()) { setResults([]); setHighlight(-1); return; }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      searchStocks(query, market)
        .then((res) => { setResults(res.results); setOpen(true); setHighlight(-1); })
        .catch(() => setResults([]));
    }, 300);
  }, [query, market]);

  function select(r: SearchResult) {
    setTicker(r.ticker, r.market as Market);
    setMainTicker(r.ticker);
    saveRecent(r);
    setQuery('');
    setOpen(false);
    setHighlight(-1);
    navigate('/');
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !items.length) {
      if (e.key === 'ArrowDown') { setOpen(true); }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? items.length - 1 : h - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = items[highlight >= 0 ? highlight : 0];
      if (target) select(target);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setHighlight(-1);
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 h-10 border-b border-[#1e1e1e] bg-[#0d0d0d]">
      <span className="text-[#f59e0b] font-bold text-sm tracking-widest">STOCKVIEWER</span>

      <nav className="flex items-center gap-1 ml-2">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `px-2.5 py-1 text-[11px] font-semibold tracking-wider rounded transition-colors ${
                isActive
                  ? 'bg-[#f59e0b] text-black'
                  : 'text-[#64748b] hover:text-[#e2e8f0] hover:bg-[#1e1e1e]'
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <div className="relative ml-4 flex-1 max-w-sm">
        <div className="flex items-center bg-[#141414] border border-[#1e1e1e] rounded px-2 gap-2">
          <select
            value={market}
            onChange={(e) => setMarket(e.target.value as Market | 'ALL')}
            className="bg-transparent text-[#64748b] text-xs py-1 outline-none cursor-pointer"
          >
            <option value="US">US</option>
            <option value="CL">CL</option>
            <option value="ALL">ALL</option>
          </select>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => items.length && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={onKeyDown}
            placeholder="Search ticker or company..."
            className="bg-transparent text-[#e2e8f0] text-xs py-1 outline-none flex-1 placeholder-[#64748b]"
          />
        </div>
        {open && items.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#141414] border border-[#1e1e1e] rounded shadow-lg z-50 max-h-60 overflow-y-auto">
            {showingRecents && (
              <div className="px-3 py-1 text-[#64748b] text-[10px] uppercase tracking-wider border-b border-[#1e1e1e]">
                Recently viewed
              </div>
            )}
            {items.map((r, i) => (
              <button
                key={r.ticker}
                onMouseDown={() => select(r)}
                onMouseEnter={() => setHighlight(i)}
                className={`flex items-center gap-2 w-full px-3 py-1.5 text-left ${
                  i === highlight ? 'bg-[#1e1e1e]' : 'hover:bg-[#1e1e1e]'
                }`}
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
