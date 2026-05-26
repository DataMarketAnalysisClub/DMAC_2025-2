export interface WatchlistItem {
  id: number;
  ticker: string;
  market: string;
  added_at: string;
}

export interface Watchlist {
  id: number;
  name: string;
  is_favorites: boolean;
  created_at: string;
  items: WatchlistItem[];
}

export interface WatchlistSummary {
  id: number;
  name: string;
  is_favorites: boolean;
  ticker_count: number;
}
