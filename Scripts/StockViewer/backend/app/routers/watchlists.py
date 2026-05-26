from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.watchlist import Watchlist, WatchlistItem
from app.schemas.watchlist import (
    WatchlistCreate, WatchlistRead, WatchlistSummary, WatchlistItemCreate, WatchlistItemRead,
)

router = APIRouter()


@router.get("", response_model=list[WatchlistSummary])
async def list_watchlists(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Watchlist))
    wls = result.scalars().all()
    summaries = []
    for wl in wls:
        await db.refresh(wl, ["items"])
        summaries.append(WatchlistSummary(id=wl.id, name=wl.name, is_favorites=wl.is_favorites, ticker_count=len(wl.items)))
    return summaries


@router.post("", response_model=WatchlistRead, status_code=201)
async def create_watchlist(body: WatchlistCreate, db: AsyncSession = Depends(get_db)):
    wl = Watchlist(name=body.name)
    db.add(wl)
    await db.commit()
    await db.refresh(wl)
    return wl


@router.get("/{watchlist_id}", response_model=WatchlistRead)
async def get_watchlist(watchlist_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Watchlist).where(Watchlist.id == watchlist_id))
    wl = result.scalar_one_or_none()
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    await db.refresh(wl, ["items"])
    return wl


@router.delete("/{watchlist_id}", status_code=204)
async def delete_watchlist(watchlist_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Watchlist).where(Watchlist.id == watchlist_id))
    wl = result.scalar_one_or_none()
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    if wl.is_favorites:
        raise HTTPException(status_code=400, detail="Cannot delete the Favorites list")
    await db.delete(wl)
    await db.commit()


@router.post("/{watchlist_id}/items", response_model=WatchlistItemRead, status_code=201)
async def add_item(watchlist_id: int, body: WatchlistItemCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Watchlist).where(Watchlist.id == watchlist_id))
    wl = result.scalar_one_or_none()
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    item = WatchlistItem(watchlist_id=watchlist_id, ticker=body.ticker.upper(), market=body.market)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{watchlist_id}/items/{ticker}", status_code=204)
async def remove_item(watchlist_id: int, ticker: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(WatchlistItem).where(
            WatchlistItem.watchlist_id == watchlist_id,
            WatchlistItem.ticker == ticker.upper(),
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    await db.delete(item)
    await db.commit()
