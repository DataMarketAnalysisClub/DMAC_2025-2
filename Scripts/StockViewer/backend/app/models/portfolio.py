from datetime import datetime, date, UTC
from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Portfolio(Base):
    __tablename__ = "portfolios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC)
    )
    holdings: Mapped[list["PortfolioHolding"]] = relationship(
        "PortfolioHolding", back_populates="portfolio", cascade="all, delete-orphan"
    )
    snapshots: Mapped[list["PortfolioSnapshot"]] = relationship(
        "PortfolioSnapshot", back_populates="portfolio", cascade="all, delete-orphan"
    )


class PortfolioHolding(Base):
    __tablename__ = "portfolio_holdings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    portfolio_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("portfolios.id", ondelete="CASCADE")
    )
    ticker: Mapped[str] = mapped_column(String(20), nullable=False)
    market: Mapped[str] = mapped_column(String(5), default="US")
    shares: Mapped[float] = mapped_column(Float, nullable=False)
    avg_cost: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(5), default="USD")
    portfolio: Mapped["Portfolio"] = relationship("Portfolio", back_populates="holdings")


class PortfolioSnapshot(Base):
    __tablename__ = "portfolio_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    portfolio_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("portfolios.id", ondelete="CASCADE")
    )
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_value: Mapped[float] = mapped_column(Float, nullable=False)
    cash_invested: Mapped[float] = mapped_column(Float, nullable=False)
    portfolio: Mapped["Portfolio"] = relationship("Portfolio", back_populates="snapshots")
