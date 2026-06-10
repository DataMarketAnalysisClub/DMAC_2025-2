from pydantic import BaseModel
from typing import Optional


class OHLCVBar(BaseModel):
    time: int  # Unix timestamp (seconds)
    open: float
    high: float
    low: float
    close: float
    volume: float


class OHLCVResponse(BaseModel):
    ticker: str
    market: str
    bars: list[OHLCVBar]


class StockQuote(BaseModel):
    ticker: str
    price: float
    change: float
    change_pct: float
    volume: float
    market: str
    currency: str
    timestamp: str


class BatchQuotesResponse(BaseModel):
    quotes: list[StockQuote]


class StockMetrics(BaseModel):
    ticker: str
    name: Optional[str]
    sector: Optional[str]
    industry: Optional[str]
    market_cap: Optional[float]
    pe_ratio: Optional[float]
    div_yield: Optional[float]
    currency: Optional[str]
    exchange: Optional[str]
    fetched_at: str


class SearchResult(BaseModel):
    ticker: str
    name: str
    market: str


class SearchResponse(BaseModel):
    results: list[SearchResult]


class ForecastResponse(BaseModel):
    ticker: str
    order: list[int]
    forecast: list[float]
    dates: list[str]
    lower_bound: list[float]
    upper_bound: list[float]
    mape: Optional[float]
    quality: str
