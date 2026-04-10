import { useState } from 'react';
import { TrendingUp } from 'lucide-react';

const HORIZONS  = [7, 14, 30, 60, 90];
const INTERVALS = [
  { value: '1d',  label: 'Diario'  },
  { value: '1wk', label: 'Semanal' },
  { value: '1mo', label: 'Mensual' },
];

export default function ForecastPanel({ tickers, period, interval, onForecast, loading, predictions }) {
  const [horizon,  setHorizon]  = useState(30);
  const [auto,     setAuto]     = useState(true);
  const [p, setP] = useState(1);
  const [d, setD] = useState(1);
  const [q, setQ] = useState(1);
  const [showCI,   setShowCI]   = useState(true);

  function handleSubmit(e) {
    e.preventDefault();
    onForecast({ horizon, auto, order: [p, d, q], showCI });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {/* Horizonte */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">Horizonte (períodos)</label>
        <select value={horizon} onChange={e => setHorizon(Number(e.target.value))}
          className="w-full py-1.5 px-2 rounded border border-gray-600 bg-gray-800 text-white text-sm
                     focus:outline-none focus:border-blue-500">
          {HORIZONS.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
      </div>

      {/* Modo ARIMA */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">Modo ARIMA</label>
        <div className="flex gap-3 text-sm">
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="radio" checked={auto}  onChange={() => setAuto(true)}  /> Auto
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="radio" checked={!auto} onChange={() => setAuto(false)} /> Manual
          </label>
        </div>
      </div>

      {/* Parámetros manuales */}
      {!auto && (
        <div className="flex gap-2">
          {[['p', p, setP], ['d', d, setD], ['q', q, setQ]].map(([name, val, set]) => (
            <div key={name} className="flex-1">
              <label className="text-xs text-gray-400 block mb-1 uppercase">{name}</label>
              <input type="number" min={0} max={5} value={val}
                onChange={e => set(Number(e.target.value))}
                className="w-full py-1.5 px-2 rounded border border-gray-600 bg-gray-800 text-white text-sm
                           focus:outline-none focus:border-blue-500" />
            </div>
          ))}
        </div>
      )}

      {/* Bandas de confianza */}
      <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
        <input type="checkbox" checked={showCI} onChange={e => setShowCI(e.target.checked)} />
        Bandas de confianza (95%)
      </label>

      <button type="submit" disabled={loading || tickers.length === 0}
        className="flex items-center justify-center gap-2 py-2 px-4 rounded bg-purple-600 hover:bg-purple-700
                   disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors">
        <TrendingUp size={14} />
        {loading ? 'Calculando...' : 'Predecir'}
      </button>

      {/* Métricas por ticker */}
      {predictions && Object.entries(predictions).map(([ticker, pred]) => (
        pred.metrics && (
          <div key={ticker} className="text-xs bg-gray-800 rounded p-2 border border-gray-700">
            <span className="font-medium text-gray-200">{ticker}</span>
            <span className="ml-2 font-bold" style={{ color: pred.metrics.quality?.color }}>
              {pred.metrics.quality?.label}
            </span>
            <div className="text-gray-400 mt-1">
              MAPE {pred.metrics.mape?.toFixed(1)}% · RMSE {pred.metrics.rmse?.toFixed(2)}
            </div>
            <div className="text-gray-500">Orden ARIMA {pred.order?.join(',')}</div>
          </div>
        )
      ))}
    </form>
  );
}
