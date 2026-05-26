export interface OHLCVBar {
  time: number; // Unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OHLCVResponse {
  ticker: string;
  market: string;
  bars: OHLCVBar[];
}

export interface StockQuote {
  ticker: string;
  price: number;
  change: number;
  change_pct: number;
  volume: number;
  market: string;
  currency: string;
  timestamp: string;
}

export interface StockMetrics {
  ticker: string;
  name: string | null;
  sector: string | null;
  industry: string | null;
  market_cap: number | null;
  pe_ratio: number | null;
  div_yield: number | null;
  currency: string | null;
  exchange: string | null;
  fetched_at: string;
}

export interface SearchResult {
  ticker: string;
  name: string;
  market: string;
}

export interface ForecastData {
  ticker: string;
  order: number[];
  forecast: number[];
  dates: string[];
  lower_bound: number[];
  upper_bound: number[];
  mape: number | null;
  quality: string;
}

export type Period = '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y';
export type Interval = '1m' | '5m' | '15m' | '1h' | '1d' | '1wk';
export type Market = 'US' | 'CL';

export const PERIOD_TO_YFINANCE: Record<Period, { period: string; interval: string }> = {
  '1D': { period: '1d', interval: '5m' },
  '5D': { period: '5d', interval: '15m' },
  '1M': { period: '1mo', interval: '1d' },
  '3M': { period: '3mo', interval: '1d' },
  '6M': { period: '6mo', interval: '1d' },
  '1Y': { period: '1y', interval: '1d' },
  '2Y': { period: '2y', interval: '1wk' },
  '5Y': { period: '5y', interval: '1wk' },
};
