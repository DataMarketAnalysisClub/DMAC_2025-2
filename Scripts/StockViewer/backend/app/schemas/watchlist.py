from datetime import datetime
from pydantic import BaseModel


class WatchlistItemCreate(BaseModel):
    ticker: str
    market: str = "US"


class WatchlistItemRead(BaseModel):
    id: int
    ticker: str
    market: str
    added_at: datetime

    model_config = {"from_attributes": True}


class WatchlistCreate(BaseModel):
    name: str


class WatchlistRead(BaseModel):
    id: int
    name: str
    is_favorites: bool
    created_at: datetime
    items: list[WatchlistItemRead] = []

    model_config = {"from_attributes": True}


class WatchlistSummary(BaseModel):
    id: int
    name: str
    is_favorites: bool
    ticker_count: int

    model_config = {"from_attributes": True}
