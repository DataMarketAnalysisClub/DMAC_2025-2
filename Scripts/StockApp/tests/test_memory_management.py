"""Unit tests for memory_management.py"""
import pytest
import pandas as pd
import numpy as np

from memory_management import DataManager, get_dataframe_memory_usage, cleanup_dataframe


# --- DataManager ---

def test_data_manager_init():
    dm = DataManager(max_tickers=5)
    assert dm.max_tickers == 5
    assert dm.current_data == {}
    assert dm.predictions == {}


def test_data_manager_set_data_replaces_old(sample_ohlc_df):
    dm = DataManager(max_tickers=10)
    dm.set_data({'OLD': sample_ohlc_df}, ['OLD'])
    dm.set_data({'NEW': sample_ohlc_df.copy()}, ['NEW'])
    assert 'OLD' not in dm.current_data
    assert 'NEW' in dm.current_data


def test_data_manager_set_data_clears_predictions(sample_ohlc_df):
    dm = DataManager(max_tickers=10)
    dm.set_data({'AAPL': sample_ohlc_df}, ['AAPL'])
    dm.predictions = {'AAPL': {'forecast': np.array([1.0])}}
    dm.set_data({'MSFT': sample_ohlc_df.copy()}, ['MSFT'])
    assert dm.predictions == {}


def test_data_manager_set_data_enforces_max(sample_ohlc_df):
    dm = DataManager(max_tickers=2)
    tickers = {f'T{i}': sample_ohlc_df.copy() for i in range(3)}
    with pytest.raises(ValueError):
        dm.set_data(tickers, list(tickers.keys()))


def test_data_manager_clear_all(sample_ohlc_df):
    dm = DataManager(max_tickers=10)
    dm.set_data({'AAPL': sample_ohlc_df}, ['AAPL'])
    dm.predictions = {'AAPL': {'forecast': np.array([1.0])}}
    dm.clear_all()
    assert dm.current_data == {}
    assert dm.predictions == {}


def test_data_manager_get_memory_usage_zero_when_empty():
    dm = DataManager()
    assert dm.get_memory_usage() == 0.0


def test_data_manager_get_memory_usage_positive(sample_ohlc_df):
    dm = DataManager()
    dm.set_data({'AAPL': sample_ohlc_df}, ['AAPL'])
    assert dm.get_memory_usage() > 0


def test_data_manager_optimize_dataframes_downcasts(sample_ohlc_df):
    # Ensure input is float64
    df = sample_ohlc_df.astype('float64')
    dm = DataManager()
    dm.set_data({'AAPL': df}, ['AAPL'])
    dm.optimize_dataframes()
    result_df = dm.current_data['AAPL']
    float_cols = result_df.select_dtypes(include=['float32']).columns.tolist()
    assert len(float_cols) > 0


# --- get_dataframe_memory_usage ---

def test_get_dataframe_memory_usage_format(sample_ohlc_df):
    result = get_dataframe_memory_usage(sample_ohlc_df)
    assert isinstance(result, str)
    assert any(unit in result for unit in ['bytes', 'KB', 'MB', 'GB'])


# --- cleanup_dataframe ---

def test_cleanup_dataframe_does_not_raise(sample_ohlc_df):
    cleanup_dataframe(sample_ohlc_df)  # Should not raise


def test_cleanup_dataframe_none_does_not_raise():
    cleanup_dataframe(None)  # Should not raise
