import asyncio
import logging
from datetime import datetime, UTC
from functools import partial

import yfinance as yf

from app.schemas.stock import OHLCVBar, OHLCVResponse, StockQuote
from lib.data_logic import fetch_stock_data

logger = logging.getLogger(__name__)


def _detect_market(ticker: str) -> str:
    return "CL" if ticker.endswith(".SN") else "US"


def _sync_fetch_ohlcv(ticker: str, period: str, interval: str) -> list[OHLCVBar]:
    data, valid, errors = fetch_stock_data([ticker], period, interval)
    if not valid:
        raise ValueError(errors[0] if errors else f"No data for {ticker}")

    df = data[ticker]
    bars = []
    for ts, row in df.iterrows():
        bars.append(OHLCVBar(
            time=int(ts.timestamp()),
            open=float(row["Open"]),
            high=float(row["High"]),
            low=float(row["Low"]),
            close=float(row["Close"]),
            volume=float(row.get("Volume", 0)),
        ))
    return bars


def _sync_fetch_quote(ticker: str) -> dict:
    t = yf.Ticker(ticker)
    fi = t.fast_info
    price = float(fi.last_price or 0)
    prev_close = float(fi.previous_close or price)
    change = price - prev_close
    change_pct = (change / prev_close * 100) if prev_close else 0
    return {
        "price": price,
        "change": change,
        "change_pct": change_pct,
        "volume": float(fi.three_month_average_volume or 0),
        "currency": fi.currency or "USD",
    }


async def get_ohlcv(ticker: str, period: str = "1y", interval: str = "1d") -> OHLCVResponse:
    loop = asyncio.get_event_loop()
    bars = await loop.run_in_executor(
        None, partial(_sync_fetch_ohlcv, ticker, period, interval)
    )
    return OHLCVResponse(ticker=ticker, market=_detect_market(ticker), bars=bars)


async def get_quote(ticker: str) -> StockQuote:
    loop = asyncio.get_event_loop()
    q = await loop.run_in_executor(None, partial(_sync_fetch_quote, ticker))
    return StockQuote(
        ticker=ticker,
        market=_detect_market(ticker),
        timestamp=datetime.now(UTC).isoformat(),
        **q,
    )


async def get_quotes(tickers: list[str]) -> list[StockQuote]:
    """Fetch quotes for several tickers concurrently; silently drops failures."""
    loop = asyncio.get_event_loop()
    now = datetime.now(UTC).isoformat()

    async def _fetch_one(ticker: str) -> StockQuote | None:
        try:
            q = await loop.run_in_executor(None, partial(_sync_fetch_quote, ticker))
            return StockQuote(ticker=ticker, market=_detect_market(ticker), timestamp=now, **q)
        except Exception as e:
            logger.warning("Quote failed for %s: %s", ticker, e)
            return None

    results = await asyncio.gather(*[_fetch_one(t) for t in tickers])
    return [r for r in results if r is not None]


INDICES = [
    {"ticker": "^GSPC",  "name": "S&P 500"},
    {"ticker": "^IXIC",  "name": "NASDAQ"},
    {"ticker": "^DJI",   "name": "Dow Jones"},
    {"ticker": "^RUT",   "name": "Russell 2000"},
    {"ticker": "^VIX",   "name": "VIX"},
]


async def get_index_quotes() -> list[dict]:
    """Fetch quotes for major indices concurrently, then append IPSA from CSV."""
    loop = asyncio.get_event_loop()
    now = datetime.now(UTC).isoformat()

    async def _fetch_one(meta: dict) -> dict | None:
        try:
            q = await loop.run_in_executor(None, partial(_sync_fetch_quote, meta["ticker"]))
            return {**meta, **q, "timestamp": now}
        except Exception as e:
            logger.warning("Index quote failed for %s: %s", meta["ticker"], e)
            return None

    results = await asyncio.gather(*[_fetch_one(m) for m in INDICES])
    quotes = [r for r in results if r is not None]

    # Append IPSA from CSV (last two rows → price + previous close)
    try:
        from app.config import IPSA_CSV_PATH
        import pandas as pd
        if IPSA_CSV_PATH.exists():
            df = pd.read_csv(IPSA_CSV_PATH).dropna()
            if len(df) >= 2:
                price = float(df["IPSA"].iloc[-1])
                prev  = float(df["IPSA"].iloc[-2])
                change = price - prev
                change_pct = (change / prev * 100) if prev else 0
                quotes.append({
                    "ticker": "IPSA",
                    "name": "IPSA",
                    "price": price,
                    "change": change,
                    "change_pct": change_pct,
                    "volume": 0.0,
                    "currency": "CLP",
                    "timestamp": now,
                })
    except Exception as e:
        logger.warning("IPSA CSV read failed: %s", e)

    return quotes
