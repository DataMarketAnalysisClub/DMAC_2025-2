import { apiFetch } from './client';
import type { Portfolio, PortfolioSummary, Holding, PnLResponse, OptimizeResult } from '../types/portfolio';

export function listPortfolios(): Promise<PortfolioSummary[]> {
  return apiFetch<PortfolioSummary[]>('/portfolios');
}

export function getPortfolio(id: number): Promise<Portfolio> {
  return apiFetch<Portfolio>(`/portfolios/${id}`);
}

export function createPortfolio(name: string): Promise<Portfolio> {
  return apiFetch<Portfolio>('/portfolios', { method: 'POST', body: JSON.stringify({ name }) });
}

export function deletePortfolio(id: number): Promise<void> {
  return apiFetch<void>(`/portfolios/${id}`, { method: 'DELETE' });
}

export function addHolding(portfolioId: number, holding: { ticker: string; market: string; shares: number; avg_cost: number; currency: string }): Promise<Holding> {
  return apiFetch<Holding>(`/portfolios/${portfolioId}/holdings`, {
    method: 'POST',
    body: JSON.stringify(holding),
  });
}

export function removeHolding(portfolioId: number, holdingId: number): Promise<void> {
  return apiFetch<void>(`/portfolios/${portfolioId}/holdings/${holdingId}`, { method: 'DELETE' });
}

export function getPortfolioPnL(id: number, period = '1y'): Promise<PnLResponse> {
  return apiFetch<PnLResponse>(`/portfolios/${id}/pnl?period=${period}`);
}

export function optimizePortfolio(id: number): Promise<OptimizeResult> {
  return apiFetch<OptimizeResult>(`/portfolios/${id}/optimize`);
}
