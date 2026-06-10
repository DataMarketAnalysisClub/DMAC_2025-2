import { create } from 'zustand';
import {
  listWatchlists, getWatchlist, createWatchlist, deleteWatchlist,
  addToWatchlist, removeFromWatchlist,
} from '../api/watchlists';
import type { WatchlistSummary, Watchlist } from '../types/watchlist';

interface WatchlistState {
  summaries: WatchlistSummary[];
  favorites: Watchlist | null;
  openList: Watchlist | null;
  loadAll: () => Promise<void>;
  openWatchlist: (id: number | null) => Promise<void>;
  createList: (name: string) => Promise<Watchlist>;
  deleteList: (id: number) => Promise<void>;
  addTicker: (listId: number, ticker: string, market?: string) => Promise<void>;
  removeTicker: (listId: number, ticker: string) => Promise<void>;
  toggleFavorite: (ticker: string, market: string) => Promise<void>;
  isFavorite: (ticker: string) => boolean;
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  summaries: [],
  favorites: null,
  openList: null,

  loadAll: async () => {
    const summaries = await listWatchlists();
    set({ summaries });
    const fav = summaries.find((s) => s.is_favorites);
    if (fav) set({ favorites: await getWatchlist(fav.id) });
  },

  openWatchlist: async (id) => {
    if (id == null) { set({ openList: null }); return; }
    set({ openList: await getWatchlist(id) });
  },

  createList: async (name) => {
    const wl = await createWatchlist(name);
    set({ summaries: await listWatchlists() });
    return wl;
  },

  deleteList: async (id) => {
    await deleteWatchlist(id);
    const { openList } = get();
    set({
      summaries: await listWatchlists(),
      openList: openList?.id === id ? null : openList,
    });
  },

  addTicker: async (listId, ticker, market = 'US') => {
    await addToWatchlist(listId, ticker, market);
    await refreshAffected(listId, set, get);
  },

  removeTicker: async (listId, ticker) => {
    await removeFromWatchlist(listId, ticker);
    await refreshAffected(listId, set, get);
  },

  toggleFavorite: async (ticker, market) => {
    const { favorites, addTicker, removeTicker, loadAll } = get();
    if (!favorites) { await loadAll(); }
    const fav = get().favorites;
    if (!fav) return;
    if (fav.items.some((i) => i.ticker === ticker)) {
      await removeTicker(fav.id, ticker);
    } else {
      await addTicker(fav.id, ticker, market);
    }
  },

  isFavorite: (ticker) => {
    const fav = get().favorites;
    return !!fav?.items.some((i) => i.ticker === ticker);
  },
}));

async function refreshAffected(
  listId: number,
  set: (partial: Partial<WatchlistState>) => void,
  get: () => WatchlistState,
) {
  const { favorites, openList } = get();
  const updates: Partial<WatchlistState> = { summaries: await listWatchlists() };
  if (favorites?.id === listId) updates.favorites = await getWatchlist(listId);
  if (openList?.id === listId) updates.openList = await getWatchlist(listId);
  set(updates);
}
