"""
Optimización de cartera — Frontera Eficiente de Markowitz.

Migración a async: igual que forecast.py, el mismo código
puede envolverse en una tarea Celery sin cambios internos.
"""
import numpy as np
import pandas as pd
from scipy.optimize import minimize


def _portfolio_stats(weights, mean_returns, cov, rf):
    ret = float(np.sum(mean_returns * weights) * 252)
    std = float(np.sqrt(weights @ cov @ weights) * np.sqrt(252))
    sharpe = (ret - rf) / std if std > 0 else 0.0
    return ret, std, sharpe


def _max_sharpe_weights(mean_returns, cov, rf):
    n = len(mean_returns)
    result = minimize(
        lambda w: -_portfolio_stats(w, mean_returns, cov, rf)[2],
        x0=np.full(n, 1 / n),
        method='SLSQP',
        bounds=[(0, 1)] * n,
        constraints={'type': 'eq', 'fun': lambda w: np.sum(w) - 1},
    )
    if not result.success:
        raise ValueError(result.message)
    return result.x


def run_optimization(close_dict: dict[str, pd.Series], rf: float) -> dict:
    """
    Args:
        close_dict: {ticker: pd.Series de precios de cierre}
        rf: tasa libre de riesgo anualizada (decimal, ej. 0.03)

    Returns:
        dict con cartera óptima, frontera y stats por activo.
    """
    returns_df = pd.DataFrame({t: s.pct_change() for t, s in close_dict.items()}).dropna()

    mean_returns = returns_df.mean().values
    cov = returns_df.cov().values
    tickers = list(close_dict.keys())

    optimal_weights = _max_sharpe_weights(mean_returns, cov, rf)
    opt_ret, opt_std, opt_sharpe = _portfolio_stats(optimal_weights, mean_returns, cov, rf)

    # Monte Carlo para la nube de carteras
    n = len(tickers)
    num_portfolios = 2000
    cloud = []
    rng = np.random.default_rng(42)
    for _ in range(num_portfolios):
        w = rng.random(n)
        w /= w.sum()
        r, s, sh = _portfolio_stats(w, mean_returns, cov, rf)
        cloud.append({'ret': round(r * 100, 4), 'std': round(s * 100, 4), 'sharpe': round(sh, 4)})

    # Stats por activo individual
    assets = []
    for i, t in enumerate(tickers):
        a_ret = float(mean_returns[i] * 252)
        a_std = float(np.sqrt(cov[i, i]) * np.sqrt(252))
        assets.append({'ticker': t, 'ret': round(a_ret * 100, 4), 'std': round(a_std * 100, 4)})

    return {
        'tickers': tickers,
        'optimal': {
            'weights': {t: round(float(w), 4) for t, w in zip(tickers, optimal_weights)},
            'ret':    round(opt_ret * 100, 4),
            'std':    round(opt_std * 100, 4),
            'sharpe': round(opt_sharpe, 4),
        },
        'cloud':  cloud,
        'assets': assets,
    }
