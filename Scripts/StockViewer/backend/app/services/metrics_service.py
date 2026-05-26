import asyncio
import logging
from datetime import datetime, UTC, timedelta
from functools import partial

import yfinance as yf
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.stock_cache import StockInfoCache
from app.schemas.stock import StockMetrics

logger = logging.getLogger(__name__)
CACHE_TTL_HOURS = 4


def _sync_fetch_info(ticker: str) -> dict:
    info = yf.Ticker(ticker).info
    return {
        "name": info.get("longName") or info.get("shortName"),
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "market_cap": info.get("marketCap"),
        "pe_ratio": info.get("trailingPE"),
        "div_yield": info.get("dividendYield"),
        "currency": info.get("currency"),
        "exchange": info.get("exchange"),
    }


async def get_stock_metrics(ticker: str, db: AsyncSession) -> StockMetrics:
    result = await db.execute(
        select(StockInfoCache).where(StockInfoCache.ticker == ticker)
    )
    cached = result.scalar_one_or_none()

    if cached:
        age = datetime.now(UTC) - cached.fetched_at.replace(tzinfo=UTC)
        if age < timedelta(hours=CACHE_TTL_HOURS):
            return _cache_to_schema(ticker, cached)

    loop = asyncio.get_event_loop()
    try:
        info = await loop.run_in_executor(None, partial(_sync_fetch_info, ticker))
    except Exception as e:
        logger.warning("Failed to fetch metrics for %s: %s", ticker, e)
        info = {}

    now = datetime.now(UTC)
    if cached:
        for k, v in info.items():
            setattr(cached, k, v)
        cached.fetched_at = now
    else:
        cached = StockInfoCache(ticker=ticker, fetched_at=now, **info)
        db.add(cached)

    await db.commit()
    await db.refresh(cached)
    return _cache_to_schema(ticker, cached)


def _cache_to_schema(ticker: str, c: StockInfoCache) -> StockMetrics:
    return StockMetrics(
        ticker=ticker,
        name=c.name,
        sector=c.sector,
        industry=c.industry,
        market_cap=c.market_cap,
        pe_ratio=c.pe_ratio,
        div_yield=c.div_yield,
        currency=c.currency,
        exchange=c.exchange,
        fetched_at=c.fetched_at.isoformat(),
    )
