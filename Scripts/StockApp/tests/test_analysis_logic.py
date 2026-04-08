"""Unit tests for analysis_logic.py"""
import numpy as np
import pandas as pd
import pytest

from analysis_logic import get_model_quality, run_arima_forecast, _auto_arima_grid_search


# --- get_model_quality ---

def test_get_model_quality_none():
    label, color = get_model_quality(None)
    assert label == "Sin datos"
    assert color == "#999999"


def test_get_model_quality_excellent():
    label, color = get_model_quality(5)
    assert label == "Excelente"
    assert color == "#4CAF50"


def test_get_model_quality_good():
    label, _ = get_model_quality(15)
    assert label == "Bueno"


def test_get_model_quality_acceptable():
    label, _ = get_model_quality(25)
    assert label == "Aceptable"


def test_get_model_quality_regular():
    label, _ = get_model_quality(40)
    assert label == "Regular"


def test_get_model_quality_bad():
    label, color = get_model_quality(60)
    assert label == "Malo"
    assert color == "#F44336"


def test_get_model_quality_boundary_10():
    # < 10 → Excelente, so 10 should be "Bueno"
    label, _ = get_model_quality(10)
    assert label == "Bueno"


# --- run_arima_forecast ---

def test_run_arima_forecast_manual_returns_dict(sample_ohlc_df):
    result, error = run_arima_forecast(
        sample_ohlc_df, horizon=5, freq_str='D', is_auto=False, manual_order=(1, 1, 1)
    )
    assert error is None
    assert isinstance(result, dict)
    assert len(result['forecast']) == 5
    assert len(result['dates']) == 5
    assert result['order'] == (1, 1, 1)
    assert len(result['lower_bound']) == 5
    assert len(result['upper_bound']) == 5


def test_run_arima_forecast_returns_no_error_for_valid_data(sample_ohlc_df):
    _, error = run_arima_forecast(
        sample_ohlc_df, horizon=5, freq_str='D', is_auto=False, manual_order=(1, 1, 1)
    )
    assert error is None


def test_run_arima_forecast_error_on_bad_df():
    empty_df = pd.DataFrame()
    result, error = run_arima_forecast(
        empty_df, horizon=5, freq_str='D', is_auto=False, manual_order=(1, 1, 1)
    )
    assert result is None
    assert isinstance(error, str)
    assert len(error) > 0


def test_run_arima_forecast_horizon_length(sample_ohlc_df):
    for horizon in [7, 14, 30]:
        result, error = run_arima_forecast(
            sample_ohlc_df, horizon=horizon, freq_str='D', is_auto=False, manual_order=(1, 1, 1)
        )
        assert error is None
        assert len(result['forecast']) == horizon


def test_run_arima_forecast_confidence_interval_direction(sample_ohlc_df):
    result, error = run_arima_forecast(
        sample_ohlc_df, horizon=10, freq_str='D', is_auto=False, manual_order=(1, 1, 1)
    )
    assert error is None
    for i in range(10):
        assert result['upper_bound'][i] >= result['lower_bound'][i]


def test_run_arima_forecast_mape_not_none_with_enough_data(sample_ohlc_df):
    # 100 rows → 80 train / 20 test → mape should be computed
    result, error = run_arima_forecast(
        sample_ohlc_df, horizon=5, freq_str='D', is_auto=False, manual_order=(1, 1, 1)
    )
    assert error is None
    assert result['mape'] is not None


# --- _auto_arima_grid_search ---

def test_auto_arima_grid_search_returns_valid_order():
    np.random.seed(0)
    data = np.cumsum(np.random.randn(80))
    order = _auto_arima_grid_search(data, max_p=2, max_d=1, max_q=2)
    assert isinstance(order, tuple)
    assert len(order) == 3
    assert all(v >= 0 for v in order)
