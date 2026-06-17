# StockViewer — Backend

FastAPI service exposing market data, watchlists, portfolios, and analytics for the
StockViewer frontend. Data comes from `yfinance`; the Chilean IPSA index series is
built from constituent data and cached locally.

## Stack

- **Python 3.12**, **FastAPI** + **Uvicorn**
- **SQLAlchemy 2.0 (async)** over **SQLite** (`aiosqlite`)
- `yfinance`, `pandas`, `numpy`, `scipy`, `statsmodels` / `pmdarima` for quant work

## Layout

```
backend/
├── main.py              App factory: routers, CORS, startup lifespan
│                        (init DB, seed Favorites, build IPSA cache)
├── app/
│   ├── config.py        Env config (DATABASE_URL, IPSA paths, RF_RATE, CORS, IPSA tickers)
│   ├── database.py      Async engine, session factory, init_db()
│   ├── routers/         stocks, market, watchlists, portfolios
│   ├── services/        stock, metrics, forecast, ipsa, portfolio (business logic)
│   ├── models/          ORM: Watchlist(Item), Portfolio(Holding/Snapshot), StockInfoCache
│   ├── schemas/         Pydantic request/response models
│   └── constants/       US sector tree, IPSA tickers/sectors
├── lib/
│   ├── data_logic.py    yfinance OHLCV fetching
│   ├── portfolio_logic.py / analysis_logic.py
│   └── ipsa/            IPSA data loader, cleaning, feature engineering
├── data/                stockviewer.db + ipsa_index.csv (generated)
└── requirements.txt
```

Routers are thin HTTP adapters; the real work lives in `app/services/*`, which in
turn lean on the reusable `lib/` modules.

## Setup & run

```bash
# From the StockViewer/ root:
source SVenv/bin/activate          # or: python3.12 -m venv SVenv && source SVenv/bin/activate
pip install -r backend/requirements.txt

cd backend                          # imports (`app`, `lib`) resolve from here
uvicorn main:app --reload --port 8000
```

- Interactive docs: <http://localhost:8000/docs>
- Health check: <http://localhost:8000/health>

On startup the app creates the SQLite schema, seeds a **Favorites** watchlist, and
rebuilds the IPSA cache if it is older than `IPSA_REBUILD_INTERVAL_HOURS`.

## Configuration

Copy `.env.example` to `.env` and adjust as needed:

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `DATABASE_URL` | `sqlite+aiosqlite:///./data/stockviewer.db` | Database connection string |
| `IPSA_CSV_PATH` | `./data/ipsa_index.csv` | Cached IPSA index series |
| `IPSA_REBUILD_INTERVAL_HOURS` | `24` | How stale the IPSA cache may get before rebuild |
| `RF_RATE` | `0.03` | Risk-free rate used by the portfolio optimizer |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins |

## Endpoints

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET | `/api/stocks/search?q=&market=` | Autocomplete (market = US/CL/ALL) |
| GET | `/api/stocks/quotes?tickers=A,B,C` | Batch quotes (max 40, concurrent) |
| GET | `/api/stocks/{ticker}/ohlcv?period=&interval=` | OHLCV bars |
| GET | `/api/stocks/{ticker}/quote` | Live price / change % / volume |
| GET | `/api/stocks/{ticker}/metrics` | P/E, market cap, dividend yield (4h cache) |
| GET | `/api/stocks/{ticker}/forecast?horizon=&period=` | ARIMA forecast (5–252 days) |
| GET | `/api/market/indices` | Live S&P 500, NASDAQ, Dow, Russell, VIX, IPSA |
| GET | `/api/market/sectors` | US + IPSA sector/industry tree |
| GET | `/api/market/ipsa?period=` | IPSA index time series |
| GET | `/api/market/ipsa/constituents` | IPSA tickers + weights |
| GET/POST | `/api/watchlists` | List / create watchlists |
| GET/DELETE | `/api/watchlists/{id}` | Get / delete a watchlist (Favorites is protected) |
| POST/DELETE | `/api/watchlists/{id}/items[/{ticker}]` | Add / remove a ticker |
| GET/POST | `/api/portfolios` | List / create portfolios |
| GET/DELETE | `/api/portfolios/{id}` | Get / delete a portfolio |
| POST/DELETE | `/api/portfolios/{id}/holdings[/{holding_id}]` | Add / remove a holding |
| GET | `/api/portfolios/{id}/pnl?period=` | Portfolio value time series |
| GET | `/api/portfolios/{id}/optimize` | Markowitz weight suggestion |
| GET | `/health` | Liveness probe |

## Notes

- The frontend never calls external APIs directly — all requests hit this backend,
  which caches fundamentals and the IPSA series to absorb `yfinance` rate limits.
- Blocking `yfinance`/pandas work is run off the event loop so the API stays
  responsive.