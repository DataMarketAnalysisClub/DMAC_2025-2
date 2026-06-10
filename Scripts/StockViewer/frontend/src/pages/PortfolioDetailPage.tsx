import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getPortfolio, getPortfolioPnL, addHolding, removeHolding } from '../api/portfolios';
import { useQuotes } from '../hooks/useQuotes';
import { PnLChart } from '../components/charts/PnLChart';
import { formatPrice } from '../components/charts/chartUtils';
import type { Portfolio, PnLResponse, Holding } from '../types/portfolio';

export function PortfolioDetailPage() {
  const { id } = useParams();
  const portfolioId = Number(id);
  const navigate = useNavigate();

  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [pnl, setPnl] = useState<PnLResponse | null>(null);
  const [pnlLoading, setPnlLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quotes = useQuotes(portfolio?.holdings.map((h) => h.ticker) ?? []);

  const load = useCallback(() => {
    getPortfolio(portfolioId)
      .then(setPortfolio)
      .catch((e) => setError(e.message));
    setPnlLoading(true);
    getPortfolioPnL(portfolioId)
      .then(setPnl)
      .catch(() => setPnl(null))
      .finally(() => setPnlLoading(false));
  }, [portfolioId]);

  useEffect(() => {
    if (Number.isNaN(portfolioId)) { navigate('/portfolio'); return; }
    load();
  }, [portfolioId, load, navigate]);

  async function handleRemove(h: Holding) {
    if (!window.confirm(`Remove ${h.ticker} from this portfolio?`)) return;
    try {
      await removeHolding(portfolioId, h.id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Remove failed');
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <span className="text-[#ef4444] text-xs">{error}</span>
        <button onClick={() => navigate('/portfolio')} className="text-[#f59e0b] text-xs hover:underline">
          ← Back to portfolios
        </button>
      </div>
    );
  }

  if (!portfolio) {
    return <div className="flex items-center justify-center h-full text-[#64748b] text-xs">Loading...</div>;
  }

  const isUp = (pnl?.pnl_pct ?? 0) >= 0;
  const pnlColor = isUp ? 'text-[#22c55e]' : 'text-[#ef4444]';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-2.5 border-b border-[#1e1e1e]">
        <button onClick={() => navigate('/portfolio')} className="text-[#64748b] hover:text-[#e2e8f0] text-xs">
          ←
        </button>
        <span className="text-[#f59e0b] font-bold text-sm">{portfolio.name}</span>
        {pnl && pnl.series.length > 0 && (
          <div className="ml-auto flex items-center gap-5 text-xs">
            <Stat label="Invested" value={formatPrice(pnl.total_invested)} />
            <Stat label="Value" value={formatPrice(pnl.current_value)} />
            <div className="flex flex-col items-end">
              <span className="text-[#64748b] text-[10px] uppercase tracking-wider">P&L</span>
              <span className={`font-semibold ${pnlColor}`}>
                {isUp ? '+' : ''}{formatPrice(pnl.current_value - pnl.total_invested)}
                {pnl.pnl_pct != null && ` (${isUp ? '+' : ''}${pnl.pnl_pct.toFixed(2)}%)`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* P&L chart */}
      <div className="h-[260px] border-b border-[#1e1e1e] relative">
        {pnlLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0d0d0d]/60">
            <span className="text-[#64748b] text-xs animate-pulse">Computing P&L...</span>
          </div>
        )}
        <PnLChart series={pnl?.series ?? []} positive={isUp} />
      </div>

      {/* Holdings */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[#0d0d0d]">
            <tr className="text-[#64748b] text-[10px] uppercase tracking-wider border-b border-[#1e1e1e]">
              <th className="text-left px-6 py-2 font-medium">Ticker</th>
              <th className="text-right px-3 py-2 font-medium">Shares</th>
              <th className="text-right px-3 py-2 font-medium">Avg Cost</th>
              <th className="text-right px-3 py-2 font-medium">Last</th>
              <th className="text-right px-3 py-2 font-medium">Mkt Value</th>
              <th className="text-right px-3 py-2 font-medium">P&L</th>
              <th className="text-right px-3 py-2 font-medium">P&L %</th>
              <th className="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {portfolio.holdings.map((h) => {
              const q = quotes[h.ticker];
              const value = q ? q.price * h.shares : null;
              const cost = h.avg_cost * h.shares;
              const gain = value != null ? value - cost : null;
              const gainPct = gain != null && cost ? (gain / cost) * 100 : null;
              const up = (gain ?? 0) >= 0;
              const color = up ? 'text-[#22c55e]' : 'text-[#ef4444]';
              return (
                <tr key={h.id} className="border-b border-[#1a1a1a] hover:bg-[#141414] group">
                  <td className="px-6 py-1.5">
                    <span className="text-[#f59e0b] font-mono">{h.ticker}</span>
                    <span className="ml-2 text-[#475569] text-[10px]">{h.market}</span>
                  </td>
                  <td className="text-right px-3 py-1.5 text-[#e2e8f0] font-mono">{h.shares}</td>
                  <td className="text-right px-3 py-1.5 text-[#94a3b8] font-mono">
                    {formatPrice(h.avg_cost, h.currency)}
                  </td>
                  <td className="text-right px-3 py-1.5 text-[#e2e8f0] font-mono">
                    {q ? formatPrice(q.price, q.currency) : '—'}
                  </td>
                  <td className="text-right px-3 py-1.5 text-[#e2e8f0] font-mono">
                    {value != null ? formatPrice(value, h.currency) : '—'}
                  </td>
                  <td className={`text-right px-3 py-1.5 font-mono ${gain != null ? color : 'text-[#64748b]'}`}>
                    {gain != null ? `${up ? '+' : ''}${formatPrice(gain, h.currency)}` : '—'}
                  </td>
                  <td className={`text-right px-3 py-1.5 font-mono ${gainPct != null ? color : 'text-[#64748b]'}`}>
                    {gainPct != null ? `${up ? '+' : ''}${gainPct.toFixed(2)}%` : '—'}
                  </td>
                  <td className="text-right px-3 py-1.5">
                    <button
                      onClick={() => handleRemove(h)}
                      title="Remove holding"
                      className="invisible group-hover:visible text-[#64748b] hover:text-[#ef4444]"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
            {portfolio.holdings.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-[#64748b]">
                  No holdings yet — add your first position below
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <AddHoldingForm portfolioId={portfolioId} onAdded={load} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-[#64748b] text-[10px] uppercase tracking-wider">{label}</span>
      <span className="text-[#e2e8f0] font-semibold">{value}</span>
    </div>
  );
}

function AddHoldingForm({ portfolioId, onAdded }: { portfolioId: number; onAdded: () => void }) {
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = ticker.trim() && Number(shares) > 0 && Number(avgCost) > 0;

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    const sym = ticker.trim().toUpperCase();
    try {
      await addHolding(portfolioId, {
        ticker: sym,
        market: sym.endsWith('.SN') ? 'CL' : 'US',
        shares: Number(shares),
        avg_cost: Number(avgCost),
        currency,
      });
      setTicker(''); setShares(''); setAvgCost('');
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Add failed');
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    'bg-[#0d0d0d] border border-[#1e1e1e] rounded px-2 py-1 text-xs text-[#e2e8f0] outline-none focus:border-[#f59e0b]/50 placeholder-[#64748b]';

  return (
    <div className="px-6 py-3 border-t border-[#1e1e1e]">
      <div className="text-[#64748b] text-[10px] uppercase tracking-wider mb-2">Add Holding</div>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder="Ticker (e.g. AAPL or SQM-B.SN)"
          className={`${inputCls} w-48 font-mono uppercase`}
        />
        <input
          value={shares}
          onChange={(e) => setShares(e.target.value)}
          placeholder="Shares"
          type="number"
          min="0"
          step="any"
          className={`${inputCls} w-24`}
        />
        <input
          value={avgCost}
          onChange={(e) => setAvgCost(e.target.value)}
          placeholder="Avg cost"
          type="number"
          min="0"
          step="any"
          className={`${inputCls} w-28`}
        />
        <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
          <option value="USD">USD</option>
          <option value="CLP">CLP</option>
        </select>
        <button
          onClick={submit}
          disabled={!valid || busy}
          className="px-3 py-1 text-xs bg-[#f59e0b] text-black font-semibold rounded hover:bg-[#fbbf24] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {busy ? 'Adding...' : 'Add'}
        </button>
        {error && <span className="text-[#ef4444] text-xs">{error}</span>}
      </div>
    </div>
  );
}
