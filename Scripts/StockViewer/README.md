# StockViewer

A Bloomberg-terminal-inspired web app for visualizing and analyzing stocks across
the **US** market and the Chilean **IPSA** index. Browse companies by sector and
industry, chart them side by side, inspect key fundamentals, build custom
watchlists and portfolios, and track performance over time.

The interface favors **data density and keyboard speed** over decoration: a live
index strip, a candlestick main chart, a base-100 comparison chart, a collapsible
sector tree with live mini-quotes, and a metrics panel — all on a dark terminal
theme.

---

## Features

- **Market view** — 3-column layout: sector/industry sidebar, candlestick + volume
  chart, and a company metrics panel (sector, industry, market cap, P/E, dividend
  yield).
- **Live index strip** — S&P 500, NASDAQ, Dow Jones, Russell 2000, VIX and IPSA,
  polled every 30s.
- **Search** — ticker/company autocomplete with US / CL / ALL market switcher,
  keyboard navigation (↑ ↓ Enter Esc) and recently-viewed history.
- **Charts** — TradingView Lightweight Charts: candlestick + volume main chart with
  selectable periods (1D → 5Y), and a base-100 normalized multi-ticker comparison
  chart (with an IPSA baseline option).
- **Watchlists & Favorites** — create custom lists, add/remove tickers, and a
  dedicated Favorites view.
- **Portfolios** — track holdings (shares, avg cost, currency), per-position P&L, a
  portfolio value-over-time area chart, and a Markowitz optimization endpoint.
- **IPSA pipeline** — the Chilean index series is built from constituent data and
  cached locally, rebuilt in the background when stale.
- **ARIMA forecast** endpoint (backend, surfaced in the UI in Phase 3).

See [`TODO.md`](TODO.md) for the full roadmap (Phase 1 & 2 complete; Phase 3
intelligence layer and Docker deployment pending) and [`BUILD.md`](BUILD.md) for
the original architecture brief.

---

## Tech stack

| Layer    | Technology |
| -------- | ---------- |
| Frontend | React 19 + TypeScript, Vite, Tailwind CSS v4, Zustand, React Router, Lightweight Charts v5 |
| Backend  | Python 3.12, FastAPI, Uvicorn, async SQLAlchemy 2.0 |
| Data     | `yfinance`, `pandas`, `numpy`, `scipy`, `statsmodels` / `pmdarima` (ARIMA) |
| Storage  | SQLite (via `aiosqlite`); a local CSV cache for the IPSA series |

---

## Project layout

```
StockViewer/
├── backend/            FastAPI app — see backend/README.md
│   ├── main.py         App entry point (routers, CORS, startup lifespan)
│   ├── app/            config, database, routers, models, schemas, services, constants
│   ├── lib/            data/portfolio/analysis logic + IPSA data pipeline
│   ├── data/           SQLite db + cached ipsa_index.csv
│   └── requirements.txt
├── frontend/           React + Vite app — see frontend/README.md
│   └── src/            api/, components/, pages/, hooks/, store/, types/
├── SVenv/              Python virtual environment (Python 3.12)
├── TODO.md             Roadmap / status
└── BUILD.md            Original architecture brief
```

---

## Running the app locally

You need **two processes**: the backend API (port 8000) and the frontend dev
server (port 5173). The Vite dev server proxies `/api` and `/health` to the
backend, so the browser only ever talks to `localhost:5173`.

### Prerequisites

- Python 3.12
- Node.js 18+ and npm

### 1. Backend (port 8000)

```bash
cd StockViewer

# Use the existing venv...
source SVenv/bin/activate
# ...or create your own:
#   python3.12 -m venv SVenv && source SVenv/bin/activate

pip install -r backend/requirements.txt

# Run from inside backend/ so the `app` and `lib` imports resolve
cd backend
uvicorn main:app --reload --port 8000
```

The database is created automatically on first start, the **Favorites** watchlist
is seeded, and the IPSA cache is built/refreshed if stale. API docs are then at
<http://localhost:8000/docs> and a health check at
<http://localhost:8000/health>.

Optional configuration lives in `backend/.env` (copy from
[`backend/.env.example`](backend/.env.example)): `DATABASE_URL`, `IPSA_CSV_PATH`,
`IPSA_REBUILD_INTERVAL_HOURS`, `RF_RATE`, `CORS_ORIGINS`.

### 2. Frontend (port 5173)

In a second terminal:

```bash
cd StockViewer/frontend
npm install
npm run dev
```

Open <http://localhost:5173>. (Run the backend first so data loads.)

### Production build of the frontend

```bash
cd StockViewer/frontend
npm run build      # outputs to dist/
npm run preview    # serve the build locally
```

---

## API overview

All routes are prefixed with `/api`. Full interactive docs at `/docs`.

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET | `/api/stocks/search?q=&market=` | Ticker/company autocomplete (US/CL/ALL) |
| GET | `/api/stocks/quotes?tickers=A,B,C` | Batch live quotes (max 40) |
| GET | `/api/stocks/{ticker}/ohlcv` | OHLCV bars (period/interval) |
| GET | `/api/stocks/{ticker}/quote` | Live price, change %, volume |
| GET | `/api/stocks/{ticker}/metrics` | P/E, market cap, dividend yield (cached) |
| GET | `/api/stocks/{ticker}/forecast` | ARIMA price forecast |
| GET | `/api/market/indices` | Live major indices |
| GET | `/api/market/sectors` | US + IPSA sector/industry tree |
| GET | `/api/market/ipsa` | IPSA index time series |
| GET | `/api/market/ipsa/constituents` | IPSA tickers + weights |
| —   | `/api/watchlists` (+ `/items`) | Watchlists CRUD |
| —   | `/api/portfolios` (+ `/holdings`, `/pnl`, `/optimize`) | Portfolios CRUD, P&L, optimizer |
| GET | `/health` | Liveness probe |