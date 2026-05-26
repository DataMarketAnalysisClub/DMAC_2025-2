import asyncio
import logging
from functools import partial

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.portfolio import Portfolio, PortfolioHolding
from app.schemas.portfolio import PnLResponse, PnLPoint, OptimizeResult
from lib.data_logic import fetch_stock_data
from lib.portfolio_logic import run_portfolio_optimization
from app.config import RF_RATE

logger = logging.getLogger(__name__)


def _sync_compute_pnl(tickers: list[str], shares_map: dict[str, float]) -> list[dict]:
    data, valid, _ = fetch_stock_data(tickers, period="2y", interval="1d")
    if not valid:
        return []

    import pandas as pd
    closes = pd.DataFrame({t: data[t]["Close"] for t in valid})
    closes = closes.sort_index().fillna(method="ffill")

    pnl = []
    for date, row in closes.iterrows():
        total = sum(shares_map.get(t, 0) * float(row[t]) for t in valid if t in row)
        pnl.append({"date": date.date(), "value": round(total, 2)})
    return pnl


def _sync_optimize(tickers: list[str]) -> dict:
    data, valid, _ = fetch_stock_data(tickers, period="2y", interval="1d")
    if len(valid) < 2:
        raise ValueError("Need at least 2 valid tickers to optimize")
    result, err = run_portfolio_optimization(data, valid, RF_RATE)
    if err:
        raise ValueError(err)
    return {
        "tickers": valid,
        "weights": result["optimal_weights"].tolist(),
        "expected_return": result["optimal_return"],
        "volatility": result["optimal_std"],
        "sharpe": result["optimal_sharpe"],
    }


async def compute_pnl(portfolio_id: int, db: AsyncSession) -> PnLResponse:
    result = await db.execute(
        select(PortfolioHolding).where(PortfolioHolding.portfolio_id == portfolio_id)
    )
    holdings = result.scalars().all()
    if not holdings:
        return PnLResponse(series=[], total_invested=0, current_value=0, pnl_pct=None)

    tickers = [h.ticker for h in holdings]
    shares_map = {h.ticker: h.shares for h in holdings}
    total_invested = sum(h.shares * h.avg_cost for h in holdings)

    loop = asyncio.get_event_loop()
    pnl_points = await loop.run_in_executor(
        None, partial(_sync_compute_pnl, tickers, shares_map)
    )

    current_value = pnl_points[-1]["value"] if pnl_points else 0
    pnl_pct = ((current_value - total_invested) / total_invested * 100) if total_invested else None

    return PnLResponse(
        series=[PnLPoint(**p) for p in pnl_points],
        total_invested=total_invested,
        current_value=current_value,
        pnl_pct=pnl_pct,
    )


async def optimize_holdings(portfolio_id: int, db: AsyncSession) -> OptimizeResult:
    result = await db.execute(
        select(PortfolioHolding).where(PortfolioHolding.portfolio_id == portfolio_id)
    )
    holdings = result.scalars().all()
    tickers = list({h.ticker for h in holdings})

    loop = asyncio.get_event_loop()
    opt = await loop.run_in_executor(None, partial(_sync_optimize, tickers))

    weights = {t: round(w, 4) for t, w in zip(opt["tickers"], opt["weights"])}
    return OptimizeResult(
        weights=weights,
        expected_return=opt["expected_return"],
        volatility=opt["volatility"],
        sharpe=opt["sharpe"],
    )
