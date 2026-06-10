import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listPortfolios, createPortfolio, deletePortfolio } from '../api/portfolios';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { Modal } from '../components/ui/Modal';

export function PortfolioPage() {
  const { summaries, setSummaries } = usePortfolioStore();
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  function load() {
    listPortfolios().then(setSummaries).catch((e) => setError(e.message));
  }

  useEffect(load, []);

  async function handleDelete(id: number, name: string) {
    if (!window.confirm(`Delete portfolio "${name}"? This cannot be undone.`)) return;
    try {
      await deletePortfolio(id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-3 border-b border-[#1e1e1e]">
        <span className="text-[#64748b] text-[10px] uppercase tracking-wider">
          Portfolios — {summaries.length} total
        </span>
        <button
          onClick={() => setShowNew(true)}
          className="px-3 py-1 text-xs bg-[#f59e0b] text-black font-semibold rounded hover:bg-[#fbbf24] transition-colors"
        >
          + New Portfolio
        </button>
      </div>

      {error && (
        <div className="px-6 py-2 text-[#ef4444] text-xs">{error}</div>
      )}

      {summaries.length === 0 && !error ? (
        <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
          <span className="text-[#64748b] text-sm">No portfolios yet</span>
          <span className="text-[#475569] text-xs">Create one to start tracking your positions</span>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 p-6">
          {summaries.map((p) => (
            <div
              key={p.id}
              onClick={() => navigate(`/portfolio/${p.id}`)}
              className="group flex flex-col gap-1 p-4 bg-[#141414] border border-[#1e1e1e] rounded cursor-pointer hover:border-[#f59e0b]/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-[#e2e8f0] text-sm font-semibold">{p.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(p.id, p.name); }}
                  title="Delete portfolio"
                  className="hidden group-hover:block text-[#64748b] hover:text-[#ef4444] text-xs"
                >
                  ✕
                </button>
              </div>
              <span className="text-[#64748b] text-xs">
                {p.holding_count} holding{p.holding_count === 1 ? '' : 's'}
              </span>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <NewPortfolioModal
          onClose={() => setShowNew(false)}
          onCreated={(id) => { setShowNew(false); navigate(`/portfolio/${id}`); }}
        />
      )}
    </div>
  );
}

function NewPortfolioModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const p = await createPortfolio(trimmed);
      onCreated(p.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
      setBusy(false);
    }
  }

  return (
    <Modal title="New Portfolio" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Portfolio name"
          className="bg-[#0d0d0d] border border-[#1e1e1e] rounded px-2 py-1.5 text-xs text-[#e2e8f0] outline-none focus:border-[#f59e0b]/50 placeholder-[#64748b]"
        />
        {error && <span className="text-[#ef4444] text-xs">{error}</span>}
        <button
          onClick={submit}
          disabled={busy || !name.trim()}
          className="px-3 py-1.5 text-xs bg-[#f59e0b] text-black font-semibold rounded hover:bg-[#fbbf24] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {busy ? 'Creating...' : 'Create'}
        </button>
      </div>
    </Modal>
  );
}
