"""Unit tests for portfolio_logic.py"""
import numpy as np
import pandas as pd
import pytest

from portfolio_logic import (
    calculate_returns,
    portfolio_stats,
    negative_sharpe,
    optimize_portfolio,
    generate_random_portfolios,
    run_portfolio_optimization,
)


# --- calculate_returns ---

def test_calculate_returns_shape(two_ticker_data):
    returns = calculate_returns(two_ticker_data)
    assert isinstance(returns, pd.DataFrame)
    assert set(returns.columns) == {'AAPL', 'MSFT'}
    # 100 rows → 99 after pct_change + dropna
    assert len(returns) == 99


def test_calculate_returns_no_nans(two_ticker_data):
    returns = calculate_returns(two_ticker_data)
    assert returns.isna().sum().sum() == 0


# --- portfolio_stats ---

def test_portfolio_stats_equal_weights(two_ticker_data):
    returns = calculate_returns(two_ticker_data)
    mean_returns = returns.mean().values
    cov_matrix = returns.cov().values
    weights = np.array([0.5, 0.5])
    ret, vol, sharpe = portfolio_stats(weights, mean_returns, cov_matrix, rf_rate=0.03)
    assert np.isfinite(ret)
    assert np.isfinite(vol)
    assert np.isfinite(sharpe)
    assert vol > 0


def test_portfolio_stats_sharpe_formula(two_ticker_data):
    returns = calculate_returns(two_ticker_data)
    mean_returns = returns.mean().values
    cov_matrix = returns.cov().values
    weights = np.array([0.5, 0.5])
    annual_return, annual_vol, sharpe = portfolio_stats(weights, mean_returns, cov_matrix, rf_rate=0.0)
    expected_sharpe = annual_return / annual_vol
    assert abs(sharpe - expected_sharpe) < 1e-9


# --- negative_sharpe ---

def test_negative_sharpe_is_negative_of_sharpe(two_ticker_data):
    returns = calculate_returns(two_ticker_data)
    mean_returns = returns.mean().values
    cov_matrix = returns.cov().values
    weights = np.array([0.5, 0.5])
    _, _, sharpe = portfolio_stats(weights, mean_returns, cov_matrix, rf_rate=0.03)
    neg_s = negative_sharpe(weights, mean_returns, cov_matrix, rf_rate=0.03)
    assert abs(neg_s - (-sharpe)) < 1e-9


# --- optimize_portfolio ---

def test_optimize_portfolio_weights_sum_to_one(two_ticker_data):
    returns = calculate_returns(two_ticker_data)
    mean_returns = returns.mean().values
    cov_matrix = returns.cov().values
    weights = optimize_portfolio(mean_returns, cov_matrix, rf_rate=0.03)
    assert abs(sum(weights) - 1.0) < 1e-6
    assert all(0 <= w <= 1 for w in weights)


# --- generate_random_portfolios ---

def test_generate_random_portfolios_shape(two_ticker_data):
    returns = calculate_returns(two_ticker_data)
    mean_returns = returns.mean().values
    cov_matrix = returns.cov().values
    result = generate_random_portfolios(mean_returns, cov_matrix, rf_rate=0.0, num_portfolios=100)
    assert result.shape == (3, 100)


def test_generate_random_portfolios_positive_volatility(two_ticker_data):
    returns = calculate_returns(two_ticker_data)
    mean_returns = returns.mean().values
    cov_matrix = returns.cov().values
    result = generate_random_portfolios(mean_returns, cov_matrix, rf_rate=0.0, num_portfolios=50)
    assert all(result[0, :] > 0)


# --- run_portfolio_optimization ---

def test_run_portfolio_optimization_success(two_ticker_data):
    result, error = run_portfolio_optimization(two_ticker_data, ['AAPL', 'MSFT'], rf_rate=0.03)
    assert error is None
    assert result is not None
    for key in ['optimal_weights', 'optimal_return', 'optimal_std', 'optimal_sharpe',
                'random_portfolios', 'asset_stats']:
        assert key in result
    assert len(result['optimal_weights']) == 2


def test_run_portfolio_optimization_fails_with_one_ticker(sample_ohlc_df):
    result, error = run_portfolio_optimization({'AAPL': sample_ohlc_df}, ['AAPL'], rf_rate=0.03)
    assert result is None
    assert isinstance(error, str)
    assert len(error) > 0


def test_run_portfolio_optimization_optimal_weights_in_range(two_ticker_data):
    result, _ = run_portfolio_optimization(two_ticker_data, ['AAPL', 'MSFT'], rf_rate=0.03)
    for w in result['optimal_weights']:
        assert 0 <= w <= 1
