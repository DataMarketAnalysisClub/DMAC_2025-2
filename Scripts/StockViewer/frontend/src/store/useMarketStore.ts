import { create } from 'zustand';
import type { Market } from '../types/stock';
import type { SectorTree } from '../api/market';

interface MarketState {
  selectedTicker: string;
  selectedMarket: Market;
  treeMarket: Market;
  sectorTree: SectorTree | null;
  setTicker: (ticker: string, market: Market) => void;
  setTreeMarket: (market: Market) => void;
  setSectorTree: (tree: SectorTree) => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  selectedTicker: 'AAPL',
  selectedMarket: 'US',
  treeMarket: 'US',
  sectorTree: null,
  setTicker: (ticker, market) => set({ selectedTicker: ticker, selectedMarket: market }),
  setTreeMarket: (treeMarket) => set({ treeMarket }),
  setSectorTree: (tree) => set({ sectorTree: tree }),
}));
