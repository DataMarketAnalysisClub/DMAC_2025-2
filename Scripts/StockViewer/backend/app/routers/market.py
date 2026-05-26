from fastapi import APIRouter, Query, HTTPException
from app.services import ipsa_service, stock_service

router = APIRouter()


@router.get("/indices")
async def get_indices():
    """Current quotes for major market indices (S&P 500, NASDAQ, Dow, Russell, VIX, IPSA)."""
    try:
        return {"indices": await stock_service.get_index_quotes()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sectors")
async def get_sectors():
    from app.constants.sectors import US_SECTOR_TREE
    from app.constants.ipsa_tickers import IPSA_SECTOR_TREE
    return {"us": US_SECTOR_TREE, "cl": IPSA_SECTOR_TREE}


@router.get("/ipsa")
async def get_ipsa(period: str = Query("1y")):
    try:
        return await ipsa_service.get_ipsa_series(period)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ipsa/constituents")
async def get_ipsa_constituents():
    from app.constants.ipsa_tickers import IPSA_TICKER_INFO
    return {"constituents": IPSA_TICKER_INFO}
