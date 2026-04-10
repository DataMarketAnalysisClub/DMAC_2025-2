import { useState } from 'react';
import { PieChart } from 'lucide-react';

export default function PortfolioPanel({ tickers, onOptimize, loading, result }) {
  const [rf, setRf] = useState(3.0);

  function handleSubmit(e) {
    e.preventDefault();
    onOptimize({ rf: rf / 100 });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="text-xs text-gray-400 block mb-1">Tasa libre de riesgo (%)</label>
        <input type="number" step="0.1" min="0" max="20" value={rf}
          onChange={e => setRf(Number(e.target.value))}
          className="w-full py-1.5 px-2 rounded border border-gray-600 bg-gray-800 text-white text-sm
                     focus:outline-none focus:border-blue-500" />
      </div>

      <button type="submit" disabled={loading || tickers.length < 2}
        className="flex items-center justify-center gap-2 py-2 px-4 rounded bg-green-600 hover:bg-green-700
                   disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors">
        <PieChart size={14} />
        {loading ? 'Optimizando...' : 'Optimizar cartera'}
      </button>

      {tickers.length < 2 && (
        <p className="text-xs text-gray-500">Carga al menos 2 tickers para optimizar.</p>
      )}

      {/* Resultado */}
      {result && (
        <div className="text-xs bg-gray-800 rounded p-3 border border-gray-700 flex flex-col gap-2">
          <p className="text-gray-300 font-medium">Cartera óptima (Sharpe máximo)</p>
          <div className="flex justify-between text-gray-400">
            <span>Retorno anual</span>
            <span className="text-green-400 font-medium">{result.optimal.ret.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Volatilidad</span>
            <span className="text-yellow-400 font-medium">{result.optimal.std.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Sharpe ratio</span>
            <span className="text-blue-400 font-medium">{result.optimal.sharpe.toFixed(3)}</span>
          </div>
          <hr className="border-gray-700" />
          <p className="text-gray-400">Pesos:</p>
          {Object.entries(result.optimal.weights).map(([t, w]) => (
            <div key={t} className="flex justify-between text-gray-300">
              <span>{t}</span>
              <span>{(w * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}
    </form>
  );
}
