import { apiFetch } from './client';
import type { Watchlist, WatchlistSummary, WatchlistItem } from '../types/watchlist';

export function listWatchlists(): Promise<WatchlistSummary[]> {
  return apiFetch<WatchlistSummary[]>('/watchlists');
}

export function getWatchlist(id: number): Promise<Watchlist> {
  return apiFetch<Watchlist>(`/watchlists/${id}`);
}

export function createWatchlist(name: string): Promise<Watchlist> {
  return apiFetch<Watchlist>('/watchlists', { method: 'POST', body: JSON.stringify({ name }) });
}

export function deleteWatchlist(id: number): Promise<void> {
  return apiFetch<void>(`/watchlists/${id}`, { method: 'DELETE' });
}

export function addToWatchlist(id: number, ticker: string, market = 'US'): Promise<WatchlistItem> {
  return apiFetch<WatchlistItem>(`/watchlists/${id}/items`, {
    method: 'POST',
    body: JSON.stringify({ ticker, market }),
  });
}

export function removeFromWatchlist(id: number, ticker: string): Promise<void> {
  return apiFetch<void>(`/watchlists/${id}/items/${ticker}`, { method: 'DELETE' });
}
