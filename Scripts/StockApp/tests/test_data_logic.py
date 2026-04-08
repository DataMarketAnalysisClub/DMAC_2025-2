"""Unit tests for data_logic.py"""
import os
import pytest
import pandas as pd
import numpy as np
from unittest.mock import patch, MagicMock

import data_logic
from data_logic import fetch_stock_data, export_to_csv


# --- fetch_stock_data ---

def test_fetch_stock_data_valid_ticker(sample_ohlc_df):
    with patch('data_logic.yf.download', return_value=sample_ohlc_df):
        current_data, valid_tickers, errors = fetch_stock_data(['AAPL'], '1y', '1d')
    assert 'AAPL' in current_data
    assert 'AAPL' in valid_tickers
    assert errors == []


def test_fetch_stock_data_empty_response():
    empty_df = pd.DataFrame()
    with patch('data_logic.yf.download', return_value=empty_df):
        current_data, valid_tickers, errors = fetch_stock_data(['BADTICKER'], '1y', '1d')
    assert current_data == {}
    assert 'BADTICKER' not in valid_tickers
    assert len(errors) == 1


def test_fetch_stock_data_exception_on_download():
    with patch('data_logic.yf.download', side_effect=Exception("network error")):
        current_data, valid_tickers, errors = fetch_stock_data(['AAPL'], '1y', '1d')
    assert current_data == {}
    assert len(errors) == 1
    assert 'AAPL' in errors[0]


def test_fetch_stock_data_multi_index_columns_dropped(sample_ohlc_df):
    # Simulate a MultiIndex response from yfinance
    multi_df = sample_ohlc_df.copy()
    multi_df.columns = pd.MultiIndex.from_tuples(
        [(col, 'AAPL') for col in sample_ohlc_df.columns]
    )
    with patch('data_logic.yf.download', return_value=multi_df):
        current_data, valid_tickers, errors = fetch_stock_data(['AAPL'], '1y', '1d')
    assert 'AAPL' in current_data
    assert not isinstance(current_data['AAPL'].columns, pd.MultiIndex)


# --- export_to_csv ---

def test_export_to_csv_no_data():
    filename, error = export_to_csv({}, [], {})
    assert filename is None
    assert isinstance(error, str)
    assert len(error) > 0


def test_export_to_csv_single_ticker(sample_ohlc_df, tmp_path, monkeypatch):
    # Redirect home directory to tmp_path via env var (works on Windows)
    monkeypatch.setenv("USERPROFILE", str(tmp_path))
    monkeypatch.setenv("HOMEPATH", str(tmp_path))
    monkeypatch.setenv("HOMEDRIVE", "")
    (tmp_path / 'Downloads').mkdir(exist_ok=True)

    filename, error = export_to_csv({'AAPL': sample_ohlc_df}, ['AAPL'], {})
    assert error is None
    assert filename is not None
    assert filename.endswith('.csv')

    filepath = tmp_path / 'Downloads' / filename
    assert filepath.exists()


def test_export_to_csv_with_predictions(sample_ohlc_df, tmp_path, monkeypatch):
    monkeypatch.setenv("USERPROFILE", str(tmp_path))
    monkeypatch.setenv("HOMEPATH", str(tmp_path))
    monkeypatch.setenv("HOMEDRIVE", "")
    (tmp_path / 'Downloads').mkdir(exist_ok=True)

    dates = pd.date_range(start=sample_ohlc_df.index[-1], periods=6, freq='D')[1:]
    predictions = {
        'AAPL': {
            'forecast': np.array([110.0] * 5),
            'lower_bound': np.array([108.0] * 5),
            'upper_bound': np.array([112.0] * 5),
            'dates': dates,
        }
    }

    filename, error = export_to_csv({'AAPL': sample_ohlc_df}, ['AAPL'], predictions)
    assert error is None

    filepath = tmp_path / 'Downloads' / filename
    df = pd.read_csv(filepath)
    assert 'Prediccion' in df.columns
    pred_rows = df[df['Prediccion'] == True]
    assert len(pred_rows) == 5


def test_export_to_csv_multiple_tickers(two_ticker_data, tmp_path, monkeypatch):
    monkeypatch.setenv("USERPROFILE", str(tmp_path))
    monkeypatch.setenv("HOMEPATH", str(tmp_path))
    monkeypatch.setenv("HOMEDRIVE", "")
    (tmp_path / 'Downloads').mkdir(exist_ok=True)

    filename, error = export_to_csv(two_ticker_data, ['AAPL', 'MSFT'], {})
    assert error is None
    assert 'multiple_tickers' in filename
