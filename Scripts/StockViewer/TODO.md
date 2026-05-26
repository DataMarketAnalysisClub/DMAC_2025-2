# StockViewer — TODO

## Phase 1 — MVP (Foundation)

### Backend
- [x] Scaffold `backend/` directory structure (routers, services, models, schemas, lib)
- [x] Copy and adapt logic from StockApp: `data_logic.py`, `portfolio_logic.py`, `analysis_logic.py`
- [x] Copy and adapt IPSA pipeline from IpsaPlot: `data_loader.py`, `data_cleaning.py`, `data_new_features.py`
- [x] SQLite database with async SQLAlchemy (`aiosqlite`)
- [x] ORM models: `Watchlist`, `WatchlistItem`, `Portfolio`, `PortfolioHolding`, `PortfolioSnapshot`, `StockInfoCache`
- [x] Pydantic schemas for all models and API responses
- [x] `GET /api/stocks/{ticker}/ohlcv` — OHLCV bars (yfinance)
- [x] `GET /api/stocks/{ticker}/quote` — live price, change%, volume
- [x] `GET /api/stocks/{ticker}/metrics` — P/E, market cap, dividend yield (4h cache)
- [x] `GET /api/stocks/{ticker}/forecast` — ARIMA forecast endpoint (backend only)
- [x] `GET /api/stocks/search` — ticker/company autocomplete
- [x] `GET /api/market/sectors` — US sector tree + IPSA CL tree
- [x] `GET /api/market/ipsa` — IPSA index time series from CSV
- [x] `GET /api/market/ipsa/constituents` — 29 IPSA tickers with weights
- [x] `GET /api/market/indices` — live S&P 500, NASDAQ, Dow Jones, Russell 2000, VIX, IPSA
- [x] Watchlists CRUD (`GET`, `POST`, `DELETE /api/watchlists`, `/items`)
- [x] Portfolios CRUD + `GET /pnl` + `GET /optimize`
- [x] Favorites watchlist auto-seeded on first startup
- [x] IPSA background rebuild (on startup if CSV is stale)
- [x] CORS configured for `localhost:5173`

### Frontend
- [x] Scaffold with Vite + React + TypeScript
- [x] Tailwind CSS v4 + Bloomberg dark theme (`#0d0d0d` bg, amber, green/red)
- [x] `TopBar` — search autocomplete with US/CL/ALL market switcher + live clock
- [x] `IndexBar` — live strip showing S&P 500, NASDAQ, Dow, Russell 2000, VIX, IPSA (30s polling)
- [x] `MainChart` — TradingView Lightweight Charts v5 candlestick + volume histogram
- [x] `ComparisonChart` — base-100 normalized multi-ticker line chart
- [x] `ChartToolbar` — period buttons (1D, 5D, 1M, 3M, 6M, 1Y, 2Y, 5Y) + chart type toggle
- [x] `StockHeader` — ticker name, price, change%, volume
- [x] `CompanyMetrics` + `MetricCard` — sector, industry, market cap, P/E, dividend yield
- [x] `SectorTree` + `SectorTreeItem` — collapsible sector → industry → ticker accordion (US + CL)
- [x] `MarketPage` — 3-column Bloomberg layout (sidebar | chart | metrics)
- [x] Zustand stores: `useMarketStore`, `useChartStore`, `useWatchlistStore`, `usePortfolioStore`
- [x] Typed API client layer: `stocks.ts`, `market.ts`, `watchlists.ts`, `portfolios.ts`
- [x] Hooks: `useOHLCV`, `useTickerData`, `usePolling`
- [x] Add to comparison: hover button on sidebar ticker rows, chip UI with remove

---

## Phase 2 — Core Features

### Watchlists & Favorites
- [ ] `WatchlistPanel` — sidebar panel listing all custom watchlists
- [ ] `AddToListModal` — modal to add a ticker to a chosen watchlist
- [ ] `FavoritesPage` — dedicated view showing favorites as a metrics card grid
- [ ] Market switcher toggle (US ↔ CL) in the sidebar header

### Portfolio
- [ ] `PortfolioPage` — list all portfolios, create new
- [ ] `PortfolioDetail` — holdings table (ticker, shares, avg cost, current value, P&L per position)
- [ ] `PnLChart` — TradingView AreaSeries for portfolio value over time
- [ ] `NewPortfolioModal` — name input to create a portfolio
- [ ] Add holding form (ticker, shares, avg cost, currency)
- [ ] Remove holding button

### IPSA & Market Polish
- [ ] IPSA index line in `ComparisonChart` as a default baseline option
- [ ] Live mini-price badges in `SectorTreeItem` rows (from polling)
- [ ] Navigation tabs: Market / Favorites / Portfolio (currently only MarketPage is routed)
- [ ] `react-router-dom` routes wired up (`/`, `/favorites`, `/portfolio`)

### Search & UX Polish
- [ ] Keyboard navigation in search dropdown (↑ ↓ Enter)
- [ ] Recent searches / recently viewed tickers
- [ ] Error boundary + fallback UI for when backend is unreachable
- [ ] Loading skeleton for chart while data fetches

---

## Phase 3 — Intelligence Layer

### ARIMA Forecast
- [ ] Forecast overlay on `MainChart` — dashed line extending from last bar
- [ ] 95% confidence interval band shading on chart
- [ ] Model quality badge (Excellent / Good / Acceptable / Poor) in `StockHeader`
- [ ] Forecast toggle button in `ChartToolbar`

### Portfolio Optimizer
- [ ] "Optimize" button in `PortfolioDetail`
- [ ] Markowitz weight suggestion modal (pie chart or bar)
- [ ] Efficient frontier scatter (Canvas/SVG — LWC doesn't do scatter natively)

### Earnings Calendar
- [ ] `EarningsCard` in the right metrics panel
- [ ] Next earnings date, EPS estimate vs actual, surprise %
- [ ] `GET /api/stocks/{ticker}/earnings` backend route + `EarningsCache` model

### News & Sentiment
- [ ] `GET /api/stocks/{ticker}/news` backend route (yfinance RSS)
- [ ] VADER sentiment scoring on headline titles
- [ ] `NewsFeed` — scrollable list of headlines with sentiment badge (positive / neutral / negative)
- [ ] `SentimentChart` — 7-day rolling sentiment as a secondary line on `MainChart`

### Analyst Ratings
- [ ] `GET /api/stocks/{ticker}/analyst-ratings` backend route
- [ ] `AnalystBar` — horizontal buy / hold / sell distribution bar

---

## Deployment
- [ ] `backend/Dockerfile`
- [ ] `frontend/Dockerfile` (Nginx serving `dist/`)
- [ ] `docker-compose.yml` at repo root
- [ ] Environment variable config (`DATABASE_URL`, `CORS_ORIGINS`, etc.)
- [ ] Switch `DATABASE_URL` to PostgreSQL for production (`asyncpg`)
- [ ] CI/CD GitHub Actions workflow (build + push Docker images)
