/**
 * Cliente HTTP para la API Django.
 * Todas las llamadas a la API pasan por aquí.
 * El proxy en package.json redirige /api/* → http://localhost:8000
 */

const BASE = '/api';

async function post(endpoint, body) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

export const api = {
  health: () => fetch(`${BASE}/health/`).then(r => r.json()),

  marketData: (tickers, period = '1y', interval = '1d') =>
    post('/market-data/', { tickers, period, interval }),

  forecast: (ticker, { period = '2y', interval = '1d', horizon = 30, auto = true, order = [1, 1, 1] } = {}) =>
    post('/forecast/', { ticker, period, interval, horizon, auto, order }),

  optimize: (tickers, { period = '2y', interval = '1d', rf = 0.03 } = {}) =>
    post('/optimize/', { tickers, period, interval, rf }),
};
