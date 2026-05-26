import { useEffect, useState } from 'react';
import { getSectors } from '../api/market';
import { useMarketStore } from '../store/useMarketStore';
import { useChartStore } from '../store/useChartStore';
import { useOHLCV } from '../hooks/useOHLCV';
import { useTickerData } from '../hooks/useTickerData';
import { SectorTree } from '../components/sidebar/SectorTree';
import { MainChart } from '../components/charts/MainChart';
import { ComparisonChart } from '../components/charts/ComparisonChart';
import { ChartToolbar } from '../components/charts/ChartToolbar';
import { StockHeader } from '../components/metrics/StockHeader';
import { CompanyMetrics } from '../components/metrics/CompanyMetrics';
import { getOHLCV } from '../api/stocks';
import type { SectorNode } from '../api/market';
import type { OHLCVBar } from '../types/stock';

export function MarketPage() {
  const { selectedTicker, selectedMarket, setSectorTree, sectorTree } = useMarketStore();
  const { period, comparisonTickers } = useChartStore();
  const { bars, loading } = useOHLCV(selectedTicker, period);
  const { quote, metrics } = useTickerData(selectedTicker);
  const [comparisonData, setComparisonData] = useState<{ ticker: string; bars: OHLCVBar[] }[]>([]);

  const currentTree: SectorNode[] = selectedMarket === 'CL'
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

  const allComparisonDatasets = [
    { ticker: selectedTicker, bars },
    ...comparisonData,
  ];

  return (
    <div className="flex flex-col h-full">
      {/* 3-column grid */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Sidebar */}
        <div className="w-[220px] flex flex-col border-r border-[#1e1e1e] shrink-0">
          <div className="px-3 py-1.5 border-b border-[#1e1e1e]">
            <span className="text-[#64748b] text-[10px] uppercase tracking-wider">
              {selectedMarket === 'CL' ? 'IPSA — Chile' : 'US Markets'}
            </span>
          </div>
          <SectorTree tree={currentTree} market={selectedMarket} />
        </div>

        {/* Center: Chart */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <StockHeader ticker={selectedTicker} name={metrics?.name ?? null} quote={quote} />
          <ChartToolbar />

          {/* Main chart — 65% height */}
          <div className="flex-1" style={{ minHeight: 0 }}>
            <MainChart bars={bars} loading={loading} />
          </div>

          {/* Comparison chart — 35% height, only when tickers present */}
          {comparisonTickers.length > 0 && (
            <div className="h-[180px] border-t border-[#1e1e1e]">
              <div className="flex items-center gap-2 px-3 py-1 border-b border-[#1e1e1e]">
                <span className="text-[#64748b] text-[10px] uppercase tracking-wider">Comparison (Base 100)</span>
                <div className="ml-auto flex gap-1">
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
