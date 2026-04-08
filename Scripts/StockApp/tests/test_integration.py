"""Integration tests: end-to-end workflows across multiple StockApp modules."""
import os
import glob
import numpy as np
import pandas as pd
import pytest
from unittest.mock import patch

import data_logic
from analysis_logic import run_arima_forecast, get_model_quality
from portfolio_logic import run_portfolio_optimization
from memory_management import DataManager
from config import COLOR_SCHEMES, TICKER_COLOR_PAIRS, CONFIDENCE_COLORS


# --- Pure-logic integration tests (no Qt, no network) ---

def test_full_arima_workflow(sample_ohlc_df):
    """fetch data → forecast → generate stock chart HTML."""
    from plotting import generate_stock_chart

    current_data = {'AAPL': sample_ohlc_df}
    pred_data, error = run_arima_forecast(
        sample_ohlc_df, horizon=10, freq_str='D', is_auto=False, manual_order=(1, 1, 1)
    )
    assert error is None
    predictions = {'AAPL': pred_data}

    html = generate_stock_chart(
        current_data, ['AAPL'], predictions,
        COLOR_SCHEMES, TICKER_COLOR_PAIRS, CONFIDENCE_COLORS,
        'UDD', False, True, get_model_quality, background_image=None
    )
    assert isinstance(html, str)
    assert len(html) > 100
    assert 'AAPL' in html
    assert 'plotly' in html.lower()


def test_full_portfolio_workflow(two_ticker_data):
    """prices → optimization → generate frontier chart HTML."""
    from plotting import generate_efficient_frontier_chart

    result, error = run_portfolio_optimization(two_ticker_data, ['AAPL', 'MSFT'], rf_rate=0.03)
    assert error is None
    assert result is not None

    html = generate_efficient_frontier_chart(result, ['AAPL', 'MSFT'], background_image=None)
    assert isinstance(html, str)
    assert len(html) > 100
    assert 'plotly' in html.lower()


def test_data_fetch_and_arima_pipeline(sample_ohlc_df):
    """mock yf.download → fetch_stock_data → run_arima_forecast."""
    from data_logic import fetch_stock_data

    with patch('data_logic.yf.download', return_value=sample_ohlc_df):
        current_data, valid_tickers, errors = fetch_stock_data(['AAPL'], '1y', '1d')

    assert 'AAPL' in current_data
    pred_data, error = run_arima_forecast(
        current_data['AAPL'], horizon=5, freq_str='D', is_auto=False, manual_order=(1, 1, 1)
    )
    assert error is None
    assert len(pred_data['forecast']) == 5


def test_csv_export_integration(sample_ohlc_df, tmp_path, monkeypatch):
    """forecast → export CSV → file exists with prediction rows."""
    monkeypatch.setenv("USERPROFILE", str(tmp_path))
    monkeypatch.setenv("HOMEPATH", str(tmp_path))
    monkeypatch.setenv("HOMEDRIVE", "")
    (tmp_path / 'Downloads').mkdir(exist_ok=True)

    pred_data, _ = run_arima_forecast(
        sample_ohlc_df, horizon=5, freq_str='D', is_auto=False, manual_order=(1, 1, 1)
    )
    predictions = {'AAPL': pred_data}
    current_data = {'AAPL': sample_ohlc_df}

    filename, error = data_logic.export_to_csv(current_data, ['AAPL'], predictions)
    assert error is None
    assert filename is not None

    files = glob.glob(str(tmp_path / 'Downloads' / '*.csv'))
    assert len(files) == 1

    df = pd.read_csv(files[0])
    assert 'Prediccion' in df.columns
    pred_rows = df[df['Prediccion'] == True]
    assert len(pred_rows) == 5


def test_memory_manager_integration(sample_ohlc_df):
    """DataManager cycle: load → optimize → replace → clear."""
    dm = DataManager(max_tickers=5)
    dm.set_data({'AAPL': sample_ohlc_df.copy()}, ['AAPL'])
    dm.optimize_dataframes()
    assert dm.get_memory_usage() > 0

    dm.set_data({'MSFT': sample_ohlc_df.copy()}, ['MSFT'])
    assert 'AAPL' not in dm.current_data

    dm.clear_all()
    assert dm.current_data == {}
    assert dm.predictions == {}


# --- Worker integration tests (require Qt via pytest-qt) ---

def test_worker_data_fetch_integration(sample_ohlc_df, qtbot):
    """DataFetchWorker emits correct data via signal."""
    from worker_threads import DataFetchWorker

    with patch('worker_threads.yf.download', return_value=sample_ohlc_df):
        worker = DataFetchWorker(['AAPL'], '1y', '1d')
        with qtbot.waitSignal(worker.finished, timeout=10000) as blocker:
            worker.start()

    current_data, valid_tickers, errors = blocker.args
    assert 'AAPL' in current_data
    assert 'AAPL' in valid_tickers
    assert errors == []


def test_worker_prediction_integration(sample_ohlc_df, qtbot):
    """PredictionWorker runs ARIMA and emits predictions."""
    from worker_threads import PredictionWorker

    current_data = {'AAPL': sample_ohlc_df}
    worker = PredictionWorker(
        current_data, ['AAPL'], horizon=5, freq_str='D',
        is_auto=False, manual_order=(1, 1, 1)
    )
    with qtbot.waitSignal(worker.finished, timeout=60000) as blocker:
        worker.start()

    predictions, errors = blocker.args
    assert 'AAPL' in predictions
    assert len(predictions['AAPL']['forecast']) == 5
    assert errors == []


def test_worker_portfolio_integration(two_ticker_data, qtbot):
    """PortfolioWorker optimizes and emits valid weights."""
    from worker_threads import PortfolioWorker

    worker = PortfolioWorker(two_ticker_data, ['AAPL', 'MSFT'], rf_rate=0.03)
    with qtbot.waitSignal(worker.finished, timeout=60000) as blocker:
        worker.start()

    portfolio_data, error = blocker.args
    assert error == ""
    assert 'optimal_weights' in portfolio_data
    assert abs(sum(portfolio_data['optimal_weights']) - 1.0) < 1e-5
