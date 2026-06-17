# StockViewer — Frontend

The React UI for StockViewer: a Bloomberg-style terminal for browsing US and IPSA
stocks, charting, watchlists, and portfolios. Talks to the FastAPI backend through
a Vite dev-server proxy, so the browser only ever hits `localhost:5173`.

## Stack

- **React 19** + **TypeScript**, bundled with **Vite**
- **Tailwind CSS v4** (dark terminal theme: `#0d0d0d` background, amber, green/red)
- **Zustand** for state, **React Router** for navigation
- **TradingView Lightweight Charts v5** for candlestick, comparison, and P&L charts

## Setup & run

```bash
cd frontend
npm install
npm run dev      # dev server at http://localhost:5173
```

Start the [backend](../backend/README.md) on port 8000 first — the dev server
proxies `/api` and `/health` to it (see `vite.config.ts`).

Other scripts:

```bash
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build locally
npm run lint     # ESLint
```

## Structure (`src/`)

```
src/
├── main.tsx, App.tsx        Entry + router (TopBar, IndexBar, routes)
├── api/                     Typed fetch client + per-domain modules
│                            (client, stocks, market, watchlists, portfolios)
├── pages/                   MarketPage, FavoritesPage, PortfolioPage, PortfolioDetailPage
├── components/
│   ├── layout/              TopBar (search), IndexBar, BackendBanner, ErrorBoundary
│   ├── charts/              MainChart, ComparisonChart, PnLChart, ChartToolbar
│   ├── metrics/             StockHeader, CompanyMetrics, MetricCard
│   ├── sidebar/             SectorTree, WatchlistPanel
│   ├── modals/              AddToListModal
│   └── ui/                  Modal
├── hooks/                   useOHLCV, useTickerData, useQuotes, usePolling
├── store/                   Zustand: useMarketStore, useChartStore,
│                            useWatchlistStore, usePortfolioStore
└── types/                   stock, portfolio, watchlist type definitions
```

## Routes

| Path | Page |
| ---- | ---- |
| `/` | Market view (sector sidebar · chart · metrics) |
| `/favorites` | Favorites as a metrics-card grid |
| `/portfolio` | List/create portfolios |
| `/portfolio/:id` | Holdings table + P&L chart |

## How it talks to the backend

`src/api/client.ts` wraps `fetch` with typed responses and an `ApiError`. All paths
are relative (`/api/...`), proxied by Vite in dev. The `BackendBanner` component
polls `/health` and shows a banner if the API is unreachable.