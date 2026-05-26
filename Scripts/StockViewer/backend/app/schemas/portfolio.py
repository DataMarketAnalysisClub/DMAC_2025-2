from datetime import datetime, date
from pydantic import BaseModel
from typing import Optional


class HoldingCreate(BaseModel):
    ticker: str
    market: str = "US"
    shares: float
    avg_cost: float
    currency: str = "USD"


class HoldingRead(BaseModel):
    id: int
    ticker: str
    market: str
    shares: float
    avg_cost: float
    currency: str

    model_config = {"from_attributes": True}


class PortfolioCreate(BaseModel):
    name: str


class PortfolioRead(BaseModel):
    id: int
    name: str
    created_at: datetime
    holdings: list[HoldingRead] = []

    model_config = {"from_attributes": True}


class PortfolioSummary(BaseModel):
    id: int
    name: str
    holding_count: int

    model_config = {"from_attributes": True}


class PnLPoint(BaseModel):
    date: date
    value: float


class PnLResponse(BaseModel):
    series: list[PnLPoint]
    total_invested: float
    current_value: float
    pnl_pct: Optional[float]


class OptimizeResult(BaseModel):
    weights: dict[str, float]
    expected_return: float
    volatility: float
    sharpe: float
