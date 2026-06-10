import { useState } from 'react';
import type { StockQuote } from '../../types/stock';
import { formatPrice, formatVolume } from '../charts/chartUtils';
import { useWatchlistStore } from '../../store/useWatchlistStore';
import { AddToListModal } from '../modals/AddToListModal';

interface StockHeaderProps {
  ticker: string;
  name: string | null;
  quote: StockQuote | null;
}

export function StockHeader({ ticker, name, quote }: StockHeaderProps) {
  const [showListModal, setShowListModal] = useState(false);
  const toggleFavorite = useWatchlistStore((s) => s.toggleFavorite);
  // Subscribe to favorites so the star re-renders after toggling
  const favorites = useWatchlistStore((s) => s.favorites);
  const isFav = !!favorites?.items.some((i) => i.ticker === ticker);
  const market = ticker.endsWith('.SN') ? 'CL' : 'US';

  const isUp = (quote?.change ?? 0) >= 0;
  const color = isUp ? 'text-[#22c55e]' : 'text-[#ef4444]';

  return (
    <div className="flex items-baseline gap-3 px-4 py-2 border-b border-[#1e1e1e]">
      <span className="text-[#f59e0b] font-bold text-base">{ticker}</span>
      {name && <span className="text-[#64748b] text-xs truncate max-w-[200px]">{name}</span>}

      <button
        onClick={() => toggleFavorite(ticker, market).catch(console.error)}
        title={isFav ? 'Remove from favorites' : 'Add to favorites'}
        className={`text-sm leading-none transition-colors ${
          isFav ? 'text-[#f59e0b]' : 'text-[#475569] hover:text-[#f59e0b]'
        }`}
      >
        {isFav ? '★' : '☆'}
      </button>
      <button
        onClick={() => setShowListModal(true)}
        title="Add to a watchlist"
        className="text-[10px] text-[#64748b] hover:text-[#e2e8f0] border border-[#1e1e1e] rounded px-1.5 py-0.5 hover:border-[#f59e0b]/50 transition-colors"
      >
        + LIST
      </button>

      {quote && (
        <>
          <span className="text-[#e2e8f0] font-semibold text-sm ml-auto">
            {formatPrice(quote.price, quote.currency)}
          </span>
          <span className={`text-xs font-medium ${color}`}>
            {isUp ? '+' : ''}{quote.change.toFixed(2)} ({isUp ? '+' : ''}{quote.change_pct.toFixed(2)}%)
          </span>
          <span className="text-[#64748b] text-xs">
            Vol {formatVolume(quote.volume)}
          </span>
        </>
      )}

      {showListModal && (
        <AddToListModal ticker={ticker} market={market} onClose={() => setShowListModal(false)} />
      )}
    </div>
  );
}
