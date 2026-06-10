import { useEffect, useState } from 'react';
import { getSectors, getIpsa } from '../api/market';
import { useMarketStore } from '../store/useMarketStore';
import { useChartStore } from '../store/useChartStore';
import { useOHLCV } from '../hooks/useOHLCV';
import { useTickerData } from '../hooks/useTickerData';
import { SectorTree } from '../components/sidebar/SectorTree';
import { WatchlistPanel } from '../components/sidebar/WatchlistPanel';
import { MainChart } from '../components/charts/MainChart';
import { ComparisonChart } from '../components/charts/ComparisonChart';
import { ChartToolbar } from '../components/charts/ChartToolbar';
import { StockHeader } from '../components/metrics/StockHeader';
import { CompanyMetrics } from '../components/metrics/CompanyMetrics';
import { getOHLCV, PERIOD_MAP } from '../api/stocks';
import type { SectorNode } from '../api/market';
import type { OHLCVBar, Market } from '../types/stock';

export function MarketPage() {
  const { selectedTicker, setSectorTree, sectorTree, treeMarket, setTreeMarket } = useMarketStore();
  const { period, comparisonTickers, showIpsaBaseline } = useChartStore();
  const { bars, loading } = useOHLCV(selectedTicker, period);
  const { quote, metrics } = useTickerData(selectedTicker);
  const [comparisonData, setComparisonData] = useState<{ ticker: string; bars: OHLCVBar[] }[]>([]);
  const [ipsaBars, setIpsaBars] = useState<OHLCVBar[]>([]);

  const currentTree: SectorNode[] = treeMarket === 'CL'
    ? (sectorTree?.cl ?? [])
    : (sectorTree?.us ?? []);

  // Load sector tree once
  useEffect(() => {
    getSectors().then((tree) => setSectorTree(tree)).catch(console.error);
  }, []);

  // Load comparison data when tickers or period changes
  useEffect(() => {
    if (!comparisonTickers.length) { setComparisonData([]); return; }
    Promise.allSettled(comparisonTickers.map((t) => getOHLCV(t, period))).then((results) => {
      const data = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map((r) => ({ ticker: r.value.ticker, bars: r.value.bars }));
      setComparisonData(data);
    });
  }, [comparisonTickers, period]);

  // Load IPSA baseline series when enabled (daily series, converted to pseudo-bars)
  useEffect(() => {
    if (!showIpsaBaseline) { setIpsaBars([]); return; }
    const yfPeriod = PERIOD_MAP[period]?.period ?? '1y';
    getIpsa(yfPeriod)
      .then((res) => {
        setIpsaBars(res.series.map((p) => {
          const time = Math.floor(new Date(p.date).getTime() / 1000);
          return { time, open: p.value, high: p.value, low: p.value, close: p.value, volume: 0 };
        }));
      })
      .catch(() => setIpsaBars([]));
  }, [showIpsaBaseline, period]);

  const showComparison = comparisonTickers.length > 0 || showIpsaBaseline;
  const allComparisonDatasets = [
    { ticker: selectedTicker, bars },
    ...comparisonData,
    ...(showIpsaBaseline && ipsaBars.length ? [{ ticker: 'IPSA', bars: ipsaBars }] : []),
  ];

  return (
    <div className="flex flex-col h-full">
      {/* 3-column grid */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Sidebar */}
        <div className="w-[220px] flex flex-col border-r border-[#1e1e1e] shrink-0">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1e1e1e]">
            <span className="text-[#64748b] text-[10px] uppercase tracking-wider">
              {treeMarket === 'CL' ? 'IPSA — Chile' : 'US Markets'}
            </span>
            <div className="flex gap-0.5">
              {(['US', 'CL'] as Market[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setTreeMarket(m)}
                  className={`px-1.5 py-0.5 text-[9px] font-semibold rounded transition-colors ${
                    treeMarket === m
                      ? 'bg-[#f59e0b] text-black'
                      : 'text-[#64748b] hover:text-[#e2e8f0] hover:bg-[#1e1e1e]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <SectorTree tree={currentTree} market={treeMarket} />
          <WatchlistPanel />
        </div>

        {/* Center: Chart */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <StockHeader ticker={selectedTicker} name={metrics?.name ?? null} quote={quote} />
          <ChartToolbar />

          {/* Main chart — 65% height */}
          <div className="flex-1" style={{ minHeight: 0 }}>
            <MainChart bars={bars} loading={loading} />
          </div>

          {/* Comparison chart — 35% height, only when tickers or IPSA baseline present */}
          {showComparison && (
            <div className="h-[180px] border-t border-[#1e1e1e]">
              <div className="flex items-center gap-2 px-3 py-1 border-b border-[#1e1e1e]">
                <span className="text-[#64748b] text-[10px] uppercase tracking-wider">Comparison (Base 100)</span>
                <div className="ml-auto flex gap-1">
                  {showIpsaBaseline && (
                    <button
                      onClick={() => useChartStore.getState().toggleIpsaBaseline()}
                      className="text-[10px] bg-[#1e1e1e] text-[#22d3ee] px-1.5 py-0.5 rounded hover:bg-[#ef4444]/20 hover:text-[#ef4444]"
                    >
                      IPSA ×
                    </button>
                  )}
                  {comparisonTickers.map((t) => (
                    <button
                      key={t}
                      onClick={() => useChartStore.getState().removeComparisonTicker(t)}
                      className="text-[10px] bg-[#1e1e1e] text-[#94a3b8] px-1.5 py-0.5 rounded hover:bg-[#ef4444]/20 hover:text-[#ef4444]"
                    >
                      {t} ×
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-[calc(100%-28px)]">
                <ComparisonChart datasets={allComparisonDatasets} />
              </div>
            </div>
          )}
        </div>

        {/* Right: Metrics panel */}
        <div className="w-[200px] flex flex-col border-l border-[#1e1e1e] shrink-0 overflow-y-auto">
          <CompanyMetrics metrics={metrics} />
        </div>
      </div>
    </div>
  );
}
