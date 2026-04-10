import { useState } from 'react';
import { BarChart2, TrendingUp, PieChart, Download } from 'lucide-react';

import { api } from './api/client';
import TickerInput          from './components/TickerInput';
import StockChart           from './components/StockChart';
import ForecastPanel        from './components/ForecastPanel';
import PortfolioPanel       from './components/PortfolioPanel';
import EfficientFrontierChart from './components/EfficientFrontierChart';

const TABS = [
  { id: 'chart',     label: 'Gráfico',   Icon: BarChart2   },
  { id: 'forecast',  label: 'Predicción',Icon: TrendingUp  },
  { id: 'portfolio', label: 'Cartera',   Icon: PieChart    },
];

export default function App() {
  // --- Datos de mercado ---
  const [dataMap,   setDataMap]   = useState({});   // { AAPL: { dates, open, ... } }
  const [tickers,   setTickers]   = useState([]);
  const [period,    setPeriod]    = useState('1y');
  const [interval,  setInterval]  = useState('1d');
  const [loadingData, setLoadingData] = useState(false);

  // --- Predicción ---
  const [predictions,    setPredictions]    = useState({});  // { AAPL: { dates, forecast, ... } }
  const [showCI,         setShowCI]         = useState(true);
  const [useBase100,     setUseBase100]     = useState(true);
  const [loadingForecast, setLoadingForecast] = useState(false);

  // --- Cartera ---
  const [portfolioResult,  setPortfolioResult]  = useState(null);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);

  // --- UI ---
  const [activeTab, setActiveTab] = useState('chart');
  const [error,     setError]     = useState('');

  // ── Handlers ──────────────────────────────────────────────

  async function handleSearch(newTickers, newPeriod, newInterval) {
    setError('');
    setLoadingData(true);
    setPredictions({});
    setPortfolioResult(null);
    try {
      const res = await api.marketData(newTickers, newPeriod, newInterval);
      setDataMap(res.data);
      setTickers(Object.keys(res.data));
      setPeriod(newPeriod);
      setInterval(newInterval);
      if (res.errors?.length) setError(`Sin datos: ${res.errors.join(', ')}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingData(false);
    }
  }

  async function handleForecast({ horizon, auto, order, showCI: ci }) {
    if (tickers.length === 0) return;
    setError('');
    setShowCI(ci);
    setLoadingForecast(true);
    setPredictions({});

    const results = {};
    for (const ticker of tickers) {
      try {
        const res = await api.forecast(ticker, { period, interval, horizon, auto, order });
        results[ticker] = res;
      } catch (e) {
        setError(prev => prev + ` ${ticker}: ${e.message}`);
      }
    }
    setPredictions(results);
    setLoadingForecast(false);
    setActiveTab('chart');
  }

  async function handleOptimize({ rf }) {
    if (tickers.length < 2) return;
    setError('');
    setLoadingPortfolio(true);
    try {
      const res = await api.optimize(tickers, { period, interval, rf });
      setPortfolioResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingPortfolio(false);
    }
  }

  function handleExportCSV() {
    const rows = [];
    const allDates = new Set(tickers.flatMap(t => dataMap[t]?.dates ?? []));
    const sorted   = [...allDates].sort();

    const header = ['date', ...tickers.flatMap(t => [`${t}_open`, `${t}_close`])];
    rows.push(header.join(','));

    sorted.forEach(date => {
      const row = [date];
      tickers.forEach(t => {
        const idx = dataMap[t]?.dates.indexOf(date) ?? -1;
        row.push(idx >= 0 ? dataMap[t].open[idx]  : '');
        row.push(idx >= 0 ? dataMap[t].close[idx] : '');
      });
      rows.push(row.join(','));
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'stocks.csv' });
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Render ────────────────────────────────────────────────

  const hasData = tickers.length > 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-700 bg-gray-900">
        <div className="flex items-center gap-3">
          <BarChart2 className="text-blue-400" size={22} />
          <span className="font-bold text-lg tracking-tight">DMAC StockApp</span>
        </div>
        {hasData && (
          <button onClick={handleExportCSV}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white
                       border border-gray-600 hover:border-gray-400 rounded px-3 py-1.5 transition-colors">
            <Download size={12} /> Exportar CSV
          </button>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 border-r border-gray-700 bg-gray-900 flex flex-col overflow-y-auto p-4 gap-5">
          {/* Búsqueda */}
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tickers</h2>
            <TickerInput onSubmit={handleSearch} loading={loadingData} />
          </section>

          {/* Opciones de gráfico (solo si hay datos) */}
          {hasData && tickers.length > 1 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Visualización</h2>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" checked={useBase100}
                  onChange={e => setUseBase100(e.target.checked)} />
                Normalizar Base 100
              </label>
            </section>
          )}

          {/* Panel activo */}
          {hasData && activeTab === 'forecast' && (
            <section>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Predicción ARIMA</h2>
              <ForecastPanel
                tickers={tickers} period={period} interval={interval}
                onForecast={handleForecast}
                loading={loadingForecast}
                predictions={predictions}
              />
            </section>
          )}

          {hasData && activeTab === 'portfolio' && (
            <section>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Optimización</h2>
              <PortfolioPanel
                tickers={tickers}
                onOptimize={handleOptimize}
                loading={loadingPortfolio}
                result={portfolioResult}
              />
            </section>
          )}

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400 bg-red-950 rounded p-2 border border-red-800">{error}</p>
          )}
        </aside>

        {/* Contenido principal */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <nav className="flex border-b border-gray-700 bg-gray-900 px-4">
            {TABS.map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm border-b-2 transition-colors
                  ${activeTab === id
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                <Icon size={14} />{label}
              </button>
            ))}
          </nav>

          {/* Chart area */}
          <div className="flex-1 p-4 overflow-auto">
            {!hasData ? (
              <div className="h-full flex items-center justify-center text-gray-600 text-sm">
                Ingresa uno o más tickers para comenzar.
              </div>
            ) : (
              <>
                {(activeTab === 'chart' || activeTab === 'forecast') && (
                  <div className="h-full">
                    <StockChart
                      dataMap={dataMap}
                      tickers={tickers}
                      useBase100={useBase100}
                      predictions={Object.keys(predictions).length > 0 ? predictions : null}
                      showCI={showCI}
                    />
                  </div>
                )}
                {activeTab === 'portfolio' && (
                  <div className="h-full">
                    <EfficientFrontierChart result={portfolioResult} />
                    {!portfolioResult && (
                      <div className="h-full flex items-center justify-center text-gray-600 text-sm">
                        Configura y ejecuta la optimización en el panel lateral.
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
