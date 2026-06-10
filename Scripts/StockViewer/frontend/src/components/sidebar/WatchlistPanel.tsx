import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWatchlistStore } from '../../store/useWatchlistStore';
import { useMarketStore } from '../../store/useMarketStore';
import { useChartStore } from '../../store/useChartStore';
import type { Market } from '../../types/stock';

/** Sidebar section listing all watchlists; expands one at a time to show its tickers. */
export function WatchlistPanel() {
  const { summaries, openList, openWatchlist, createList, deleteList, removeTicker } = useWatchlistStore();
  const { setTicker } = useMarketStore();
  const { setMainTicker } = useChartStore();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const navigate = useNavigate();

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    try {
      await createList(name);
      setNewName('');
      setCreating(false);
    } catch (e) {
      console.error(e);
    }
  }

  function selectTicker(ticker: string, market: string) {
    setTicker(ticker, market as Market);
    setMainTicker(ticker);
    navigate('/');
  }

  return (
    <div className="border-t border-[#1e1e1e]">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1e1e1e]">
        <span className="text-[#64748b] text-[10px] uppercase tracking-wider">Watchlists</span>
        <button
          onClick={() => setCreating((c) => !c)}
          title="New watchlist"
          className="text-[#64748b] hover:text-[#f59e0b] text-xs leading-none"
        >
          +
        </button>
      </div>

      {creating && (
        <div className="flex gap-1 px-3 py-1.5 border-b border-[#1e1e1e]">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') { setCreating(false); setNewName(''); }
            }}
            placeholder="List name"
            className="flex-1 min-w-0 bg-[#0d0d0d] border border-[#1e1e1e] rounded px-1.5 py-0.5 text-[11px] text-[#e2e8f0] outline-none focus:border-[#f59e0b]/50 placeholder-[#64748b]"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="text-[10px] px-1.5 bg-[#f59e0b] text-black font-semibold rounded disabled:opacity-40"
          >
            OK
          </button>
        </div>
      )}

      <div className="max-h-56 overflow-y-auto text-xs">
        {summaries.map((s) => {
          const isOpen = openList?.id === s.id;
          return (
            <div key={s.id}>
              <div className="flex items-center group">
                <button
                  onClick={() => openWatchlist(isOpen ? null : s.id)}
                  className="flex items-center gap-1 flex-1 min-w-0 px-3 py-1 text-left text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#141414]"
                >
                  <span className="text-[8px]">{isOpen ? '▼' : '▶'}</span>
                  <span className="truncate">
                    {s.is_favorites ? '★ ' : ''}{s.name}
                  </span>
                  <span className="ml-auto text-[#475569] text-[10px] shrink-0">{s.ticker_count}</span>
                </button>
                {!s.is_favorites && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete watchlist "${s.name}"?`)) deleteList(s.id).catch(console.error);
                    }}
                    title="Delete list"
                    className="hidden group-hover:block pr-2 text-[#64748b] hover:text-[#ef4444] text-[10px]"
                  >
                    ✕
                  </button>
                )}
              </div>
              {isOpen && openList && (
                <div>
                  {openList.items.map((item) => (
                    <div key={item.id} className="flex items-center group/item">
                      <button
                        onClick={() => selectTicker(item.ticker, item.market)}
                        className="flex-1 pl-7 pr-2 py-0.5 text-left text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#141414] font-mono"
                      >
                        {item.ticker}
                      </button>
                      <button
                        onClick={() => removeTicker(s.id, item.ticker).catch(console.error)}
                        title="Remove from list"
                        className="hidden group-hover/item:block pr-2 text-[#64748b] hover:text-[#ef4444] text-[10px]"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {openList.items.length === 0 && (
                    <div className="pl-7 py-1 text-[#475569] text-[10px]">Empty list</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
