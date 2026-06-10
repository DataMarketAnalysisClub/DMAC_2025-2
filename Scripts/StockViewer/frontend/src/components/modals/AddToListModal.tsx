import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useWatchlistStore } from '../../store/useWatchlistStore';

interface AddToListModalProps {
  ticker: string;
  market: string;
  onClose: () => void;
}

export function AddToListModal({ ticker, market, onClose }: AddToListModalProps) {
  const { summaries, addTicker, createList } = useWatchlistStore();
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(listId: number) {
    try {
      await addTicker(listId, ticker, market);
      setAdded((prev) => new Set(prev).add(listId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Add failed');
    }
  }

  async function handleCreateAndAdd() {
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true);
    setError(null);
    try {
      const wl = await createList(name);
      await addTicker(wl.id, ticker, market);
      setAdded((prev) => new Set(prev).add(wl.id));
      setNewName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Add ${ticker} to list`} onClose={onClose}>
      <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
        {summaries.map((s) => (
          <button
            key={s.id}
            onClick={() => handleAdd(s.id)}
            disabled={added.has(s.id)}
            className="flex items-center justify-between px-2 py-1.5 rounded text-xs text-left hover:bg-[#1e1e1e] disabled:cursor-default"
          >
            <span className="text-[#e2e8f0]">
              {s.is_favorites ? '★ ' : ''}{s.name}
              <span className="ml-2 text-[#64748b] text-[10px]">{s.ticker_count}</span>
            </span>
            <span className={added.has(s.id) ? 'text-[#22c55e]' : 'text-[#64748b]'}>
              {added.has(s.id) ? '✓ Added' : '+'}
            </span>
          </button>
        ))}
        {summaries.length === 0 && (
          <span className="text-[#64748b] text-xs px-2 py-1">No lists yet — create one below</span>
        )}
      </div>
      <div className="flex gap-2 mt-3 pt-3 border-t border-[#1e1e1e]">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreateAndAdd()}
          placeholder="New list name"
          className="flex-1 bg-[#0d0d0d] border border-[#1e1e1e] rounded px-2 py-1 text-xs text-[#e2e8f0] outline-none focus:border-[#f59e0b]/50 placeholder-[#64748b]"
        />
        <button
          onClick={handleCreateAndAdd}
          disabled={busy || !newName.trim()}
          className="px-3 py-1 text-xs bg-[#f59e0b] text-black font-semibold rounded hover:bg-[#fbbf24] disabled:opacity-40 transition-colors"
        >
          Create
        </button>
      </div>
      {error && <span className="block mt-2 text-[#ef4444] text-xs">{error}</span>}
    </Modal>
  );
}
