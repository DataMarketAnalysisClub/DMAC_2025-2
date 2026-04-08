"""Shared test fixtures for StockApp tests."""
import sys
import os
import pytest
import pandas as pd
import numpy as np

# Add parent directory to path so tests can import StockApp modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture
def sample_ohlc_df():
    """A minimal 100-row OHLC DataFrame with a DatetimeIndex."""
    dates = pd.date_range(start='2022-01-01', periods=100, freq='D')
    np.random.seed(42)
    close = 100 + np.cumsum(np.random.randn(100))
    df = pd.DataFrame({
        'Open':  close * 0.99,
        'High':  close * 1.01,
        'Low':   close * 0.98,
        'Close': close,
    }, index=dates)
    return df


@pytest.fixture
def two_ticker_data(sample_ohlc_df):
    """Dict with two tickers for portfolio tests."""
    np.random.seed(7)
    close2 = 50 + np.cumsum(np.random.randn(100))
    df2 = pd.DataFrame({
        'Open':  close2 * 0.99,
        'High':  close2 * 1.01,
        'Low':   close2 * 0.98,
        'Close': close2,
    }, index=sample_ohlc_df.index)
    return {'AAPL': sample_ohlc_df, 'MSFT': df2}
