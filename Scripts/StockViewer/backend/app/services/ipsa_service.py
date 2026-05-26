import asyncio
import logging
from datetime import datetime, UTC, timedelta
from pathlib import Path

import pandas as pd

from app.config import IPSA_CSV_PATH, IPSA_REBUILD_INTERVAL_HOURS, IPSA_TICKERS

logger = logging.getLogger(__name__)
_rebuild_lock = asyncio.Lock()


def _sync_rebuild(csv_path: Path) -> None:
    from lib.ipsa.data_new_features import get_index_data, build_ipsa_index

    end = datetime.now(UTC).strftime("%Y-%m-%d")
    start = (datetime.now(UTC) - timedelta(days=365 * 5)).strftime("%Y-%m-%d")

    logger.info("Rebuilding IPSA index %s → %s", start, end)
    index_data = get_index_data(IPSA_TICKERS, start, end)
    index_df, _, _ = build_ipsa_index(index_data)

    csv_path.parent.mkdir(parents=True, exist_ok=True)
    index_df.to_csv(csv_path)
    logger.info("IPSA index saved to %s", csv_path)


async def _rebuild_async() -> None:
    async with _rebuild_lock:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _sync_rebuild, IPSA_CSV_PATH)


async def ensure_ipsa_cache() -> None:
    needs_rebuild = True
    if IPSA_CSV_PATH.exists():
        mtime = datetime.fromtimestamp(IPSA_CSV_PATH.stat().st_mtime, tz=UTC)
        age_hours = (datetime.now(UTC) - mtime).total_seconds() / 3600
        if age_hours < IPSA_REBUILD_INTERVAL_HOURS:
            needs_rebuild = False

    if needs_rebuild:
        asyncio.create_task(_rebuild_async())
    else:
        logger.info("IPSA cache is fresh, skipping rebuild")


def _read_csv_filtered(period: str) -> list[dict]:
    if not IPSA_CSV_PATH.exists():
        return []

    df = pd.read_csv(IPSA_CSV_PATH, parse_dates=["Date"])
    df = df.rename(columns={"Date": "date", "IPSA": "value"})
    df = df.dropna(subset=["value"])

    period_days = {
        "1m": 30, "3m": 90, "6m": 180,
        "1y": 365, "2y": 730, "5y": 1825,
    }
    days = period_days.get(period, 365)
    cutoff = pd.Timestamp.now(tz="UTC") - pd.Timedelta(days=days)
    cutoff = cutoff.tz_localize(None)

    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"]).dt.tz_localize(None)
        df = df[df["date"] >= cutoff]

    return [{"date": r["date"].strftime("%Y-%m-%d"), "value": float(r["value"])} for _, r in df.iterrows()]


async def get_ipsa_series(period: str = "1y") -> dict:
    loop = asyncio.get_event_loop()
    series = await loop.run_in_executor(None, _read_csv_filtered, period)

    last_updated = None
    if IPSA_CSV_PATH.exists():
        mtime = datetime.fromtimestamp(IPSA_CSV_PATH.stat().st_mtime, tz=UTC)
        last_updated = mtime.isoformat()

    return {"series": series, "last_updated": last_updated}
