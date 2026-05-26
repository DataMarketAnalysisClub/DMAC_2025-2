import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.database import init_db
from app.routers import stocks, market, watchlists, portfolios
from app.services.ipsa_service import ensure_ipsa_cache

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting StockViewer backend...")
    await init_db()
    await _seed_favorites()
    await ensure_ipsa_cache()
    logger.info("Backend ready.")
    yield
    logger.info("Shutting down.")


async def _seed_favorites():
    from app.database import AsyncSessionLocal
    from app.models.watchlist import Watchlist
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Watchlist).where(Watchlist.is_favorites.is_(True)))
        if not result.scalar_one_or_none():
            db.add(Watchlist(name="Favorites", is_favorites=True))
            await db.commit()
            logger.info("Seeded Favorites watchlist.")


app = FastAPI(title="StockViewer API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stocks.router, prefix="/api/stocks", tags=["stocks"])
app.include_router(market.router, prefix="/api/market", tags=["market"])
app.include_router(watchlists.router, prefix="/api/watchlists", tags=["watchlists"])
app.include_router(portfolios.router, prefix="/api/portfolios", tags=["portfolios"])


@app.get("/health")
async def health():
    return {"status": "ok"}
