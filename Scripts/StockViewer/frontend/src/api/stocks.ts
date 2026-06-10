import { apiFetch } from './client';
import type { OHLCVResponse, StockQuote, StockMetrics, ForecastData } from '../types/stock';

// Re-exported for convenience
export const PERIOD_MAP: Record<string, { period: string; interval: string }> = {
  '1D': { period: '1d', interval: '5m' },
  '5D': { period: '5d', interval: '15m' },
  '1M': { period: '1mo', interval: '1d' },
  '3M': { period: '3mo', interval: '1d' },
  '6M': { period: '6mo', interval: '1d' },
  '1Y': { period: '1y', interval: '1d' },
  '2Y': { period: '2y', interval: '1wk' },
  '5Y': { period: '5y', interval: '1wk' },
};

export function getOHLCV(ticker: string, uiPeriod: string): Promise<OHLCVResponse> {
  const { period, interval } = PERIOD_MAP[uiPeriod] ?? PERIOD_MAP['1Y'];
  return apiFetch<OHLCVResponse>(`/stocks/${ticker}/ohlcv?period=${period}&interval=${interval}`);
}

export function getQuote(ticker: string): Promise<StockQuote> {
  return apiFetch<StockQuote>(`/stocks/${ticker}/quote`);
}

export function getBatchQuotes(tickers: string[]): Promise<{ quotes: StockQuote[] }> {
  return apiFetch(`/stocks/quotes?tickers=${encodeURIComponent(tickers.join(','))}`);
}

export function getMetrics(ticker: string): Promise<StockMetrics> {
  return apiFetch<StockMetrics>(`/stocks/${ticker}/metrics`);
}

export function searchStocks(q: string, market: string = 'US'): Promise<{ results: { ticker: string; name: string; market: string }[] }> {
  return apiFetch(`/stocks/search?q=${encodeURIComponent(q)}&market=${market}`);
}

export function getForecast(ticker: string, horizon = 30, period = '2y'): Promise<ForecastData> {
  return apiFetch<ForecastData>(`/stocks/${ticker}/forecast?horizon=${horizon}&period=${period}`);
}
