import { create } from 'zustand';
import type { PortfolioSummary, Portfolio } from '../types/portfolio';

interface PortfolioState {
  summaries: PortfolioSummary[];
  activePortfolio: Portfolio | null;
  setSummaries: (list: PortfolioSummary[]) => void;
  setActivePortfolio: (p: Portfolio | null) => void;
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
  summaries: [],
  activePortfolio: null,
  setSummaries: (summaries) => set({ summaries }),
  setActivePortfolio: (activePortfolio) => set({ activePortfolio }),
}));
