from datetime import datetime, UTC
from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class StockInfoCache(Base):
    __tablename__ = "stock_info_cache"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticker: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    name: Mapped[str | None] = mapped_column(String(200))
    sector: Mapped[str | None] = mapped_column(String(100))
    industry: Mapped[str | None] = mapped_column(String(100))
    market_cap: Mapped[float | None] = mapped_column(Float)
    pe_ratio: Mapped[float | None] = mapped_column(Float)
    div_yield: Mapped[float | None] = mapped_column(Float)
    currency: Mapped[str | None] = mapped_column(String(5))
    exchange: Mapped[str | None] = mapped_column(String(20))
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC)
    )
