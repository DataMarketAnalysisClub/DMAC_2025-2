from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.portfolio import Portfolio, PortfolioHolding
from app.schemas.portfolio import (
    PortfolioCreate, PortfolioRead, PortfolioSummary,
    HoldingCreate, HoldingRead, PnLResponse, OptimizeResult,
)
from app.services import portfolio_service

router = APIRouter()


@router.get("", response_model=list[PortfolioSummary])
async def list_portfolios(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Portfolio))
    portfolios = result.scalars().all()
    out = []
    for p in portfolios:
        await db.refresh(p, ["holdings"])
        out.append(PortfolioSummary(id=p.id, name=p.name, holding_count=len(p.holdings)))
    return out


@router.post("", response_model=PortfolioRead, status_code=201)
async def create_portfolio(body: PortfolioCreate, db: AsyncSession = Depends(get_db)):
    p = Portfolio(name=body.name)
    db.add(p)
    await db.commit()
    await db.refresh(p, ["holdings"])
    return p


@router.get("/{portfolio_id}", response_model=PortfolioRead)
async def get_portfolio(portfolio_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Portfolio).where(Portfolio.id == portfolio_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    await db.refresh(p, ["holdings"])
    return p


@router.delete("/{portfolio_id}", status_code=204)
async def delete_portfolio(portfolio_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Portfolio).where(Portfolio.id == portfolio_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    await db.delete(p)
    await db.commit()


@router.post("/{portfolio_id}/holdings", response_model=HoldingRead, status_code=201)
async def add_holding(portfolio_id: int, body: HoldingCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Portfolio).where(Portfolio.id == portfolio_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Portfolio not found")
    h = PortfolioHolding(portfolio_id=portfolio_id, **body.model_dump())
    db.add(h)
    await db.commit()
    await db.refresh(h)
    return h


@router.delete("/{portfolio_id}/holdings/{holding_id}", status_code=204)
async def remove_holding(portfolio_id: int, holding_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PortfolioHolding).where(
            PortfolioHolding.id == holding_id,
            PortfolioHolding.portfolio_id == portfolio_id,
        )
    )
    h = result.scalar_one_or_none()
    if not h:
        raise HTTPException(status_code=404, detail="Holding not found")
    await db.delete(h)
    await db.commit()


@router.get("/{portfolio_id}/pnl", response_model=PnLResponse)
async def get_pnl(portfolio_id: int, period: str = Query("1y"), db: AsyncSession = Depends(get_db)):
    try:
        return await portfolio_service.compute_pnl(portfolio_id, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{portfolio_id}/optimize", response_model=OptimizeResult)
async def optimize(portfolio_id: int, db: AsyncSession = Depends(get_db)):
    try:
        return await portfolio_service.optimize_holdings(portfolio_id, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
