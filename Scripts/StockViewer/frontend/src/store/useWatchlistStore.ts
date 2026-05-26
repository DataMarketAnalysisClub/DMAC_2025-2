import { create } from 'zustand';
import type { WatchlistSummary, Watchlist } from '../types/watchlist';

interface WatchlistState {
  summaries: WatchlistSummary[];
  openList: Watchlist | null;
  setSummaries: (list: WatchlistSummary[]) => void;
  setOpenList: (wl: Watchlist | null) => void;
}

export const useWatchlistStore = create<WatchlistState>((set) => ({
  summaries: [],
  openList: null,
  setSummaries: (summaries) => set({ summaries }),
  setOpenList: (openList) => set({ openList }),
}));
