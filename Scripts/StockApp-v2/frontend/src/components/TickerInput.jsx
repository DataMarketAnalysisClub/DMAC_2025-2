import { useState } from 'react';
import { Search, X } from 'lucide-react';

const PERIODS   = ['1mo', '3mo', '6mo', '1y', '2y', '5y'];
const INTERVALS = [
  { value: '1d',  label: 'Diario'  },
  { value: '1wk', label: 'Semanal' },
  { value: '1mo', label: 'Mensual' },
];

export default function TickerInput({ onSubmit, loading }) {
  const [input,    setInput]    = useState('');
  const [period,   setPeriod]   = useState('1y');
  const [interval, setInterval] = useState('1d');

  function handleSubmit(e) {
    e.preventDefault();
    const tickers = input
      .split(',')
      .map(t => t.trim().toUpperCase())
      .filter(Boolean);
    if (tickers.length === 0) return;
    onSubmit(tickers, period, interval);
  }

  function clearInput() {
    setInput('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {/* Ticker input */}
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="AAPL, MSFT, BSANTANDER.SN ..."
          disabled={loading}
          className="w-full pr-8 pl-3 py-2 rounded border border-gray-600 bg-gray-800 text-white text-sm
                     placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        {input && (
          <button type="button" onClick={clearInput}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Periodo e intervalo */}
      <div className="flex gap-2">
        <select value={period} onChange={e => setPeriod(e.target.value)} disabled={loading}
          className="flex-1 py-1.5 px-2 rounded border border-gray-600 bg-gray-800 text-white text-sm
                     focus:outline-none focus:border-blue-500">
          {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={interval} onChange={e => setInterval(e.target.value)} disabled={loading}
          className="flex-1 py-1.5 px-2 rounded border border-gray-600 bg-gray-800 text-white text-sm
                     focus:outline-none focus:border-blue-500">
          {INTERVALS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
        </select>
      </div>

      <button type="submit" disabled={loading || !input.trim()}
        className="flex items-center justify-center gap-2 py-2 px-4 rounded bg-blue-600 hover:bg-blue-700
                   disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors">
        <Search size={14} />
        {loading ? 'Cargando...' : 'Buscar'}
      </button>
    </form>
  );
}
