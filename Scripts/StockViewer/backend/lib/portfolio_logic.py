import logging
import numpy as np
import pandas as pd
from scipy.optimize import minimize

logger = logging.getLogger(__name__)


def calculate_returns(prices_dict):
    returns_data = {}
    for ticker, df in prices_dict.items():
        returns = df['Close'].pct_change().dropna()
        returns_data[ticker] = returns
    returns_df = pd.DataFrame(returns_data).dropna()
    return returns_df


def portfolio_stats(weights, mean_returns, cov_matrix, rf_rate):
    portfolio_return = np.sum(mean_returns * weights) * 252
    portfolio_std = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights))) * np.sqrt(252)
    sharpe_ratio = (portfolio_return - rf_rate) / portfolio_std if portfolio_std > 0 else 0
    return portfolio_return, portfolio_std, sharpe_ratio


def negative_sharpe(weights, mean_returns, cov_matrix, rf_rate):
    return -portfolio_stats(weights, mean_returns, cov_matrix, rf_rate)[2]


def optimize_portfolio(mean_returns, cov_matrix, rf_rate):
    num_assets = len(mean_returns)
    constraints = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1})
    bounds = tuple((0, 1) for _ in range(num_assets))
    initial_guess = num_assets * [1. / num_assets]

    result = minimize(
        negative_sharpe,
        initial_guess,
        args=(mean_returns, cov_matrix, rf_rate),
        method='SLSQP',
        bounds=bounds,
        constraints=constraints,
    )

    if not result.success:
        raise ValueError(f"Optimization failed: {result.message}")

    return result.x


def generate_random_portfolios(mean_returns, cov_matrix, rf_rate, num_portfolios=5000):
    num_assets = len(mean_returns)
    results = np.zeros((3, num_portfolios))

    for i in range(num_portfolios):
        weights = np.random.random(num_assets)
        weights /= np.sum(weights)
        portfolio_return, portfolio_std, sharpe = portfolio_stats(
            weights, mean_returns, cov_matrix, rf_rate
        )
        results[0, i] = portfolio_std
        results[1, i] = portfolio_return
        results[2, i] = sharpe

    return results


def run_portfolio_optimization(current_data, tickers, rf_rate):
    try:
        if len(tickers) < 2:
            return None, "Need at least 2 tickers for portfolio optimization"

        returns_df = calculate_returns(current_data)
        if returns_df.empty:
            return None, "Not enough data to calculate returns"

        mean_returns = returns_df.mean().values
        cov_matrix = returns_df.cov().values

        optimal_weights = optimize_portfolio(mean_returns, cov_matrix, rf_rate)
        optimal_return, optimal_std, optimal_sharpe = portfolio_stats(
            optimal_weights, mean_returns, cov_matrix, rf_rate
        )

        random_portfolios = generate_random_portfolios(
            mean_returns, cov_matrix, rf_rate, num_portfolios=5000
        )

        asset_stats = []
        for i, ticker in enumerate(tickers):
            asset_stats.append({
                'ticker': ticker,
                'return': mean_returns[i] * 252,
                'volatility': np.sqrt(cov_matrix[i, i]) * np.sqrt(252),
            })

        return {
            'optimal_weights': optimal_weights,
            'optimal_return': optimal_return,
            'optimal_std': optimal_std,
            'optimal_sharpe': optimal_sharpe,
            'random_portfolios': random_portfolios,
            'asset_stats': asset_stats,
            'mean_returns': mean_returns,
            'cov_matrix': cov_matrix,
            'rf_rate': rf_rate,
        }, None

    except Exception as e:
        logger.exception("Portfolio optimization failed")
        return None, f"Optimization error: {str(e)}"
