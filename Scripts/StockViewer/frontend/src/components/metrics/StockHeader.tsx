import type { StockQuote } from '../../types/stock';
import { formatPrice, formatVolume } from '../charts/chartUtils';

interface StockHeaderProps {
  ticker: string;
  name: string | null;
  quote: StockQuote | null;
}

export function StockHeader({ ticker, name, quote }: StockHeaderProps) {
  const isUp = (quote?.change ?? 0) >= 0;
  const color = isUp ? 'text-[#22c55e]' : 'text-[#ef4444]';

  return (
    <div className="flex items-baseline gap-3 px-4 py-2 border-b border-[#1e1e1e]">
      <span className="text-[#f59e0b] font-bold text-base">{ticker}</span>
      {name && <span className="text-[#64748b] text-xs truncate max-w-[200px]">{name}</span>}
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
    </div>
  );
}
