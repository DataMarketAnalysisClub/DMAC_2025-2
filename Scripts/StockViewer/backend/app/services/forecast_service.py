import asyncio
import logging
from functools import partial

from app.schemas.stock import ForecastResponse
from lib.data_logic import fetch_stock_data
from lib.analysis_logic import run_arima_forecast, get_model_quality

logger = logging.getLogger(__name__)


def _sync_forecast(ticker: str, horizon: int, period: str) -> dict:
    data, valid, errors = fetch_stock_data([ticker], period=period, interval="1d")
    if not valid:
        raise ValueError(errors[0] if errors else f"No data for {ticker}")

    df = data[ticker]
    result, err = run_arima_forecast(df, horizon, freq_str="B", is_auto=True, manual_order=None)
    if err:
        raise ValueError(err)

    quality, _ = get_model_quality(result.get("mape"))
    return {
        "order": list(result["order"]),
        "forecast": [float(v) for v in result["forecast"]],
        "dates": [d.strftime("%Y-%m-%d") for d in result["dates"]],
        "lower_bound": [float(v) for v in result["lower_bound"]],
        "upper_bound": [float(v) for v in result["upper_bound"]],
        "mape": float(result["mape"]) if result.get("mape") is not None else None,
        "quality": quality,
    }


async def get_arima_forecast(ticker: str, horizon: int = 30, period: str = "2y") -> ForecastResponse:
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None, partial(_sync_forecast, ticker, horizon, period)
    )
    return ForecastResponse(ticker=ticker, **result)
