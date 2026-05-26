import { create } from 'zustand';
import type { Period } from '../types/stock';

interface ChartState {
  mainTicker: string;
  comparisonTickers: string[];
  period: Period;
  chartType: 'candlestick' | 'line';
  setMainTicker: (ticker: string) => void;
  addComparisonTicker: (ticker: string) => void;
  removeComparisonTicker: (ticker: string) => void;
  setPeriod: (period: Period) => void;
  setChartType: (type: 'candlestick' | 'line') => void;
}

export const useChartStore = create<ChartState>((set) => ({
  mainTicker: 'AAPL',
  comparisonTickers: [],
  period: '1Y',
  chartType: 'candlestick',
  setMainTicker: (ticker) => set({ mainTicker: ticker }),
  addComparisonTicker: (ticker) =>
    set((s) => ({
      comparisonTickers: s.comparisonTickers.includes(ticker) || s.comparisonTickers.length >= 4
        ? s.comparisonTickers
        : [...s.comparisonTickers, ticker],
    })),
  removeComparisonTicker: (ticker) =>
    set((s) => ({ comparisonTickers: s.comparisonTickers.filter((t) => t !== ticker) })),
  setPeriod: (period) => set({ period }),
  setChartType: (chartType) => set({ chartType }),
}));
