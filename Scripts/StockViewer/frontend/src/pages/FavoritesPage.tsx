import { useNavigate } from 'react-router-dom';
import { useWatchlistStore } from '../store/useWatchlistStore';
import { useMarketStore } from '../store/useMarketStore';
import { useChartStore } from '../store/useChartStore';
import { useQuotes } from '../hooks/useQuotes';
import { formatPrice, formatVolume } from '../components/charts/chartUtils';
import type { Market } from '../types/stock';

export function FavoritesPage() {
  const { favorites, removeTicker } = useWatchlistStore();
  const { setTicker } = useMarketStore();
  const { setMainTicker } = useChartStore();
  const navigate = useNavigate();

  const tickers = favorites?.items.map((i) => i.ticker) ?? [];
  const quotes = useQuotes(tickers);

  function open(ticker: string, market: string) {
    setTicker(ticker, market as Market);
    setMainTicker(ticker);
    navigate('/');
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-3 border-b border-[#1e1e1e]">
        <span className="text-[#64748b] text-[10px] uppercase tracking-wider">
          ★ My Favorites — {tickers.length} ticker{tickers.length === 1 ? '' : 's'}
        </span>
      </div>

      {tickers.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
          <span className="text-[#64748b] text-sm">No favorites yet</span>
          <span className="text-[#475569] text-xs">
            Open a stock in Market view and click the ★ in its header
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 p-6">
          {favorites!.items.map((item) => {
            const q = quotes[item.ticker];
            const up = (q?.change ?? 0) >= 0;
            const color = up ? 'text-[#22c55e]' : 'text-[#ef4444]';
            return (
              <div
                key={item.id}
                onClick={() => open(item.ticker, item.market)}
                className="group flex flex-col gap-1.5 p-4 bg-[#141414] border border-[#1e1e1e] rounded cursor-pointer hover:border-[#f59e0b]/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[#f59e0b] font-mono font-semibold text-sm">{item.ticker}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[#475569] text-[10px]">{item.market}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (favorites) removeTicker(favorites.id, item.ticker).catch(console.error);
                      }}
                      title="Remove from favorites"
                      className="hidden group-hover:block text-[#f59e0b] hover:text-[#ef4444] text-xs"
                    >
                      ★
                    </button>
                  </div>
                </div>
                {q ? (
                  <>
                    <span className="text-[#e2e8f0] text-lg font-semibold font-mono">
                      {formatPrice(q.price, q.currency)}
                    </span>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-mono ${color}`}>
                        {up ? '▲' : '▼'} {up ? '+' : ''}{q.change.toFixed(2)} ({up ? '+' : ''}{q.change_pct.toFixed(2)}%)
                      </span>
                      <span className="text-[#64748b] text-[10px]">Vol {formatVolume(q.volume)}</span>
                    </div>
                  </>
                ) : (
                  <span className="text-[#475569] text-xs animate-pulse">Loading quote...</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
