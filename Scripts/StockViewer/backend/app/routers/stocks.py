from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.stock import (
    OHLCVResponse, StockQuote, StockMetrics,
    SearchResponse, SearchResult, ForecastResponse, BatchQuotesResponse,
)
from app.services import stock_service, metrics_service, forecast_service
from app.config import IPSA_TICKERS

router = APIRouter()

_US_SEARCH_TICKERS = [
    ("AAPL", "Apple Inc."), ("MSFT", "Microsoft Corporation"), ("GOOGL", "Alphabet Inc."),
    ("AMZN", "Amazon.com Inc."), ("META", "Meta Platforms Inc."), ("NVDA", "NVIDIA Corporation"),
    ("TSLA", "Tesla Inc."), ("BRK-B", "Berkshire Hathaway Inc."), ("JPM", "JPMorgan Chase & Co."),
    ("V", "Visa Inc."), ("JNJ", "Johnson & Johnson"), ("WMT", "Walmart Inc."),
    ("XOM", "Exxon Mobil Corporation"), ("PG", "Procter & Gamble Co."), ("MA", "Mastercard Inc."),
    ("UNH", "UnitedHealth Group"), ("HD", "The Home Depot"), ("CVX", "Chevron Corporation"),
    ("ABBV", "AbbVie Inc."), ("BAC", "Bank of America"), ("LLY", "Eli Lilly and Company"),
    ("KO", "The Coca-Cola Company"), ("PEP", "PepsiCo Inc."), ("COST", "Costco Wholesale"),
    ("AVGO", "Broadcom Inc."), ("MRK", "Merck & Co."), ("ORCL", "Oracle Corporation"),
    ("AMD", "Advanced Micro Devices"), ("NFLX", "Netflix Inc."), ("CRM", "Salesforce Inc."),
    ("TMO", "Thermo Fisher Scientific"), ("ACN", "Accenture plc"), ("ABT", "Abbott Laboratories"),
    ("DHR", "Danaher Corporation"), ("TXN", "Texas Instruments"), ("LIN", "Linde plc"),
    ("NEE", "NextEra Energy"), ("UNP", "Union Pacific"), ("RTX", "RTX Corporation"),
    ("PM", "Philip Morris International"), ("SPGI", "S&P Global Inc."), ("HON", "Honeywell"),
    ("IBM", "International Business Machines"), ("GE", "GE Aerospace"), ("CAT", "Caterpillar Inc."),
    ("BKNG", "Booking Holdings"), ("INTU", "Intuit Inc."), ("AMGN", "Amgen Inc."),
    ("SYK", "Stryker Corporation"), ("PLD", "Prologis Inc."),
]


@router.get("/search", response_model=SearchResponse)
async def search_stocks(q: str = Query("", min_length=0), market: str = "US"):
    q_lower = q.lower()
    results = []

    if market in ("US", "ALL"):
        for ticker, name in _US_SEARCH_TICKERS:
            if q_lower in ticker.lower() or q_lower in name.lower():
                results.append(SearchResult(ticker=ticker, name=name, market="US"))

    if market in ("CL", "ALL"):
        from app.constants.ipsa_tickers import IPSA_TICKER_INFO
        for item in IPSA_TICKER_INFO:
            if q_lower in item["ticker"].lower() or q_lower in item["name"].lower():
                results.append(SearchResult(ticker=item["ticker"], name=item["name"], market="CL"))

    return SearchResponse(results=results[:20])


@router.get("/quotes", response_model=BatchQuotesResponse)
async def get_batch_quotes(tickers: str = Query(..., description="Comma-separated tickers, max 40")):
    symbols = [t.strip().upper() for t in tickers.split(",") if t.strip()][:40]
    if not symbols:
        raise HTTPException(status_code=400, detail="No tickers provided")
    try:
        return BatchQuotesResponse(quotes=await stock_service.get_quotes(symbols))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{ticker}/ohlcv", response_model=OHLCVResponse)
async def get_ohlcv(
    ticker: str,
    period: str = Query("1y"),
    interval: str = Query("1d"),
):
    try:
        return await stock_service.get_ohlcv(ticker.upper(), period, interval)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{ticker}/quote", response_model=StockQuote)
async def get_quote(ticker: str):
    try:
        return await stock_service.get_quote(ticker.upper())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{ticker}/metrics", response_model=StockMetrics)
async def get_metrics(ticker: str, db: AsyncSession = Depends(get_db)):
    try:
        return await metrics_service.get_stock_metrics(ticker.upper(), db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{ticker}/forecast", response_model=ForecastResponse)
async def get_forecast(
    ticker: str,
    horizon: int = Query(30, ge=5, le=252),
    period: str = Query("2y"),
):
    try:
        return await forecast_service.get_arima_forecast(ticker.upper(), horizon, period)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
