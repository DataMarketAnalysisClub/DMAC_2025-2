import { useState } from 'react';
import { useMarketStore } from '../../store/useMarketStore';
import { useChartStore } from '../../store/useChartStore';
import { useQuotes } from '../../hooks/useQuotes';
import type { SectorNode } from '../../api/market';
import type { Market } from '../../types/stock';

interface SectorTreeProps {
  tree: SectorNode[];
  market: Market;
}

function fmtBadgePrice(price: number): string {
  if (price >= 10_000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return price.toFixed(2);
}

export function SectorTree({ tree, market }: SectorTreeProps) {
  const [openSectors, setOpenSectors] = useState<Set<string>>(new Set([tree[0]?.sector]));
  const [openIndustries, setOpenIndustries] = useState<Set<string>>(new Set());
  const { selectedTicker, setTicker } = useMarketStore();
  const { setMainTicker, addComparisonTicker } = useChartStore();

  // Only poll quotes for tickers currently visible (open sector AND open industry)
  const visibleTickers = tree.flatMap((s) =>
    openSectors.has(s.sector)
      ? s.industries.flatMap((i) => (openIndustries.has(i.industry) ? i.tickers : []))
      : [],
  );
  const quotes = useQuotes(visibleTickers);

  function toggleSector(s: string) {
    setOpenSectors((prev) => {
      const n = new Set(prev);
      n.has(s) ? n.delete(s) : n.add(s);
      return n;
    });
  }

  function toggleIndustry(i: string) {
    setOpenIndustries((prev) => {
      const n = new Set(prev);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });
  }

  function selectTicker(ticker: string) {
    setTicker(ticker, market);
    setMainTicker(ticker);
  }

  return (
    <div className="flex-1 overflow-y-auto text-xs">
      {tree.map((sector) => (
        <div key={sector.sector}>
          <button
            onClick={() => toggleSector(sector.sector)}
            className="flex items-center gap-1 w-full px-3 py-1.5 text-[#64748b] hover:text-[#e2e8f0] hover:bg-[#141414] text-left font-semibold uppercase tracking-wider text-[10px]"
          >
            <span className="text-[8px]">{openSectors.has(sector.sector) ? '▼' : '▶'}</span>
            {sector.sector}
          </button>
          {openSectors.has(sector.sector) && sector.industries.map((ind) => (
            <div key={ind.industry}>
              <button
                onClick={() => toggleIndustry(ind.industry)}
                className="flex items-center gap-1 w-full pl-5 pr-3 py-1 text-[#64748b] hover:text-[#94a3b8] hover:bg-[#141414] text-left"
              >
                <span className="text-[8px]">{openIndustries.has(ind.industry) ? '▼' : '▶'}</span>
                {ind.industry}
              </button>
              {openIndustries.has(ind.industry) && ind.tickers.map((ticker) => {
                const q = quotes[ticker];
                const up = (q?.change_pct ?? 0) >= 0;
                return (
                  <div key={ticker} className="flex items-center group">
                    <button
                      onClick={() => selectTicker(ticker)}
                      className={`flex items-center flex-1 min-w-0 pl-8 pr-2 py-0.5 text-left transition-colors ${
                        selectedTicker === ticker
                          ? 'text-[#f59e0b] bg-[#1e1e1e]'
                          : 'text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#141414]'
                      }`}
                    >
                      <span className="truncate">{ticker}</span>
                      {q && (
                        <span className="ml-auto flex items-baseline gap-1 shrink-0 font-mono">
                          <span className="text-[9px] text-[#64748b]">{fmtBadgePrice(q.price)}</span>
                          <span className={`text-[9px] ${up ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                            {up ? '+' : ''}{q.change_pct.toFixed(1)}%
                          </span>
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => addComparisonTicker(ticker)}
                      title="Add to comparison"
                      className="hidden group-hover:flex items-center pr-2 text-[#64748b] hover:text-[#22d3ee]"
                    >
                      +
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
