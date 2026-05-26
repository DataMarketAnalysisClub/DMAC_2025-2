export interface Holding {
  id: number;
  ticker: string;
  market: string;
  shares: number;
  avg_cost: number;
  currency: string;
}

export interface Portfolio {
  id: number;
  name: string;
  created_at: string;
  holdings: Holding[];
}

export interface PortfolioSummary {
  id: number;
  name: string;
  holding_count: number;
}

export interface PnLPoint {
  date: string;
  value: number;
}

export interface PnLResponse {
  series: PnLPoint[];
  total_invested: number;
  current_value: number;
  pnl_pct: number | null;
}

export interface OptimizeResult {
  weights: Record<string, number>;
  expected_return: number;
  volatility: number;
  sharpe: number;
}
