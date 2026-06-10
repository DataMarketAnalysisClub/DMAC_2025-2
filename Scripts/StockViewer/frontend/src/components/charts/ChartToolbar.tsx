import type { Period } from '../../types/stock';
import { useChartStore } from '../../store/useChartStore';

const PERIODS: Period[] = ['1D', '5D', '1M', '3M', '6M', '1Y', '2Y', '5Y'];

export function ChartToolbar() {
  const { period, setPeriod, chartType, setChartType, showIpsaBaseline, toggleIpsaBaseline } = useChartStore();

  return (
    <div className="flex items-center gap-1 px-3 py-1 border-b border-[#1e1e1e]">
      {PERIODS.map((p) => (
        <button
          key={p}
          onClick={() => setPeriod(p)}
          className={`px-2 py-0.5 text-xs rounded transition-colors ${
            period === p
              ? 'bg-[#f59e0b] text-black font-semibold'
              : 'text-[#64748b] hover:text-[#e2e8f0] hover:bg-[#1e1e1e]'
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={toggleIpsaBaseline}
        title="Toggle IPSA index baseline in the comparison chart"
        className={`ml-3 px-2 py-0.5 text-xs rounded transition-colors ${
          showIpsaBaseline
            ? 'bg-[#22d3ee] text-black font-semibold'
            : 'text-[#64748b] hover:text-[#e2e8f0] hover:bg-[#1e1e1e]'
        }`}
      >
        IPSA
      </button>
      <div className="ml-auto flex gap-1">
        {(['candlestick', 'line'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setChartType(type)}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              chartType === type
                ? 'bg-[#1e1e1e] text-[#e2e8f0]'
                : 'text-[#64748b] hover:text-[#e2e8f0]'
            }`}
          >
            {type === 'candlestick' ? '🕯' : '📈'}
          </button>
        ))}
      </div>
    </div>
  );
}
