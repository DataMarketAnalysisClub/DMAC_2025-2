import { apiFetch } from './client';

export interface SectorTree {
  us: SectorNode[];
  cl: SectorNode[];
}

export interface SectorNode {
  sector: string;
  industries: { industry: string; tickers: string[] }[];
}

export function getSectors(): Promise<SectorTree> {
  return apiFetch<SectorTree>('/market/sectors');
}

export function getIpsa(period = '1y'): Promise<{ series: { date: string; value: number }[]; last_updated: string | null }> {
  return apiFetch(`/market/ipsa?period=${period}`);
}

export function getIpsaConstituents(): Promise<{ constituents: { ticker: string; name: string; weight?: number }[] }> {
  return apiFetch('/market/ipsa/constituents');
}
