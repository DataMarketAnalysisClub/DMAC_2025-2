"""
Business logic: configuration, data fetching, ARIMA forecasting, and portfolio optimization.
"""
import gc
import logging
import warnings
import datetime
import os

import numpy as np
import pandas as pd
import yfinance as yf
from scipy.optimize import minimize
from statsmodels.tsa.arima.model import ARIMA
from sklearn.metrics import mean_squared_error, mean_absolute_error

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

COLOR_SCHEMES = {
    'default': {
        'increasing': {'line': {'color': '#00FF00'}, 'fillcolor': 'rgba(0,255,0,0.5)'},
        'decreasing': {'line': {'color': '#FF0000'}, 'fillcolor': 'rgba(255,0,0,0.5)'},
    },
    'UDD': {
        'increasing': {'line': {'color': '#005293'}, 'fillcolor': 'rgba(65,123,171,1)'},
        'decreasing': {'line': {'color': '#6E7b8b'}, 'fillcolor': 'rgba(147,148,149,0.82)'},
    },
}

TICKER_COLOR_PAIRS = [
    {'increasing': {'line': {'color': '#005293'}, 'fillcolor': 'rgba(0,82,147,0.5)'},
     'decreasing': {'line': {'color': '#6E7B8B'}, 'fillcolor': 'rgba(110,123,139,0.5)'},
     'line_color': '#005293'},
    {'increasing': {'line': {'color': '#00A651'}, 'fillcolor': 'rgba(0,166,81,0.5)'},
     'decreasing': {'line': {'color': '#E63946'}, 'fillcolor': 'rgba(230,57,70,0.5)'},
     'line_color': '#00A651'},
    {'increasing': {'line': {'color': '#F26419'}, 'fillcolor': 'rgba(242,100,25,0.5)'},
     'decreasing': {'line': {'color': '#662E9B'}, 'fillcolor': 'rgba(102,46,155,0.5)'},
     'line_color': '#F26419'},
    {'increasing': {'line': {'color': '#1ABC9C'}, 'fillcolor': 'rgba(26,188,156,0.5)'},
     'decreasing': {'line': {'color': '#E91E63'}, 'fillcolor': 'rgba(233,30,99,0.5)'},
     'line_color': '#1ABC9C'},
    {'increasing': {'line': {'color': '#F4D03F'}, 'fillcolor': 'rgba(244,208,63,0.5)'},
     'decreasing': {'line': {'color': '#795548'}, 'fillcolor': 'rgba(121,85,72,0.5)'},
     'line_color': '#F4D03F'},
    {'increasing': {'line': {'color': '#00BCD4'}, 'fillcolor': 'rgba(0,188,212,0.5)'},
     'decreasing': {'line': {'color': '#FF5722'}, 'fillcolor': 'rgba(255,87,34,0.5)'},
     'line_color': '#00BCD4'},
    {'increasing': {'line': {'color': '#9C27B0'}, 'fillcolor': 'rgba(156,39,176,0.5)'},
     'decreasing': {'line': {'color': '#607D8B'}, 'fillcolor': 'rgba(96,125,139,0.5)'},
     'line_color': '#9C27B0'},
    {'increasing': {'line': {'color': '#FF9800'}, 'fillcolor': 'rgba(255,152,0,0.5)'},
     'decreasing': {'line': {'color': '#3F51B5'}, 'fillcolor': 'rgba(63,81,181,0.5)'},
     'line_color': '#FF9800'},
    {'increasing': {'line': {'color': '#4CAF50'}, 'fillcolor': 'rgba(76,175,80,0.5)'},
     'decreasing': {'line': {'color': '#F44336'}, 'fillcolor': 'rgba(244,67,54,0.5)'},
     'line_color': '#4CAF50'},
    {'increasing': {'line': {'color': '#009688'}, 'fillcolor': 'rgba(0,150,136,0.5)'},
     'decreasing': {'line': {'color': '#FF4081'}, 'fillcolor': 'rgba(255,64,129,0.5)'},
     'line_color': '#009688'},
]

CONFIDENCE_COLORS = [
    'rgba(0,82,147,0.2)',
    'rgba(0,166,81,0.2)',
    'rgba(242,100,25,0.2)',
    'rgba(26,188,156,0.2)',
    'rgba(244,208,63,0.2)',
    'rgba(0,188,212,0.2)',
    'rgba(156,39,176,0.2)',
    'rgba(255,152,0,0.2)',
    'rgba(76,175,80,0.2)',
    'rgba(0,150,136,0.2)',
]

# ---------------------------------------------------------------------------
# Data fetching
# ---------------------------------------------------------------------------

def fetch_stock_data(ticker: str, period: str, interval: str):
    """Download and clean OHLC data for a single ticker. Returns (df, error)."""
    try:
        df = yf.download(ticker, period=period, interval=interval, progress=False)
        if df.empty:
            return None, f"No data for '{ticker}'"
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.droplevel(1)
        df = df[['Open', 'High', 'Low', 'Close']].dropna()
        if df.empty:
            return None, f"Empty data for '{ticker}' after cleaning"
        return df, None
    except Exception as e:
        return None, f"Error fetching '{ticker}': {e}"


def export_to_csv(current_data: dict, tickers: list, predictions: dict):
    """Save historical + prediction data to CSV in the Downloads folder. Returns (filename, error)."""
    if not current_data or not tickers:
        return None, "No data to export."
    try:
        downloads_path = os.path.join(os.path.expanduser("~"), "Downloads")
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')

        if len(tickers) == 1:
            ticker = tickers[0]
            df = current_data[ticker]
            if ticker in predictions:
                pred = predictions[ticker]
                pred_df = pd.DataFrame({
                    'Open': pred['forecast'], 'High': pred['upper_bound'],
                    'Low': pred['lower_bound'], 'Close': pred['forecast'],
                    'Lower_95': pred['lower_bound'], 'Upper_95': pred['upper_bound'],
                    'Prediccion': True,
                }, index=pred['dates'])
                base_df = df.copy()
                base_df['Prediccion'] = False
                base_df['Lower_95'] = pd.NA
                base_df['Upper_95'] = pd.NA
                out = pd.concat([base_df, pred_df])
                filename = f"{ticker}_data_con_prediccion_{timestamp}.csv"
            else:
                out = df
                filename = f"{ticker}_data_{timestamp}.csv"
            out.to_csv(os.path.join(downloads_path, filename))
        else:
            all_dates = set()
            for df in current_data.values():
                all_dates.update(df.index)
            for ticker in tickers:
                if ticker in predictions:
                    all_dates.update(predictions[ticker]['dates'])
            all_dates = sorted(all_dates)

            cols = ['Fecha']
            for t in tickers:
                cols += [f'{t}_Apertura', f'{t}_Maximo', f'{t}_Minimo',
                         f'{t}_Cierre', f'{t}_Prediccion',
                         f'{t}_IC95_Inferior', f'{t}_IC95_Superior']

            rows = []
            for date in all_dates:
                row = [date.strftime('%Y-%m-%d')]
                for ticker in tickers:
                    if ticker in current_data and date in current_data[ticker].index:
                        d = current_data[ticker].loc[date]
                        row += [d['Open'], d['High'], d['Low'], d['Close'], 'No', pd.NA, pd.NA]
                    elif ticker in predictions and date in predictions[ticker]['dates']:
                        idx = list(predictions[ticker]['dates']).index(date)
                        fc = predictions[ticker]['forecast'][idx]
                        lo = predictions[ticker]['lower_bound'][idx]
                        hi = predictions[ticker]['upper_bound'][idx]
                        row += [fc, hi, lo, fc, 'Si', lo, hi]
                    else:
                        row += [pd.NA] * 7
                rows.append(row)

            filename = f"multiple_tickers_{timestamp}.csv"
            pd.DataFrame(rows, columns=cols).to_csv(
                os.path.join(downloads_path, filename), index=False
            )

        return filename, None
    except Exception as e:
        return None, f"Error exporting CSV: {e}"


# ---------------------------------------------------------------------------
# ARIMA forecasting
# ---------------------------------------------------------------------------

try:
    from pmdarima import auto_arima as _pm_auto_arima
    _PMDARIMA_AVAILABLE = True
except (ImportError, ValueError):
    _PMDARIMA_AVAILABLE = False
    _pm_auto_arima = None


def _grid_search_arima(train_data, max_p=3, max_d=2, max_q=3):
    """Brute-force AIC grid search for ARIMA order."""
    best_aic, best_order = np.inf, None
    for p in range(max_p + 1):
        for d in range(max_d + 1):
            for q in range(max_q + 1):
                if p == q == d == 0:
                    continue
                try:
                    with warnings.catch_warnings():
                        warnings.filterwarnings("ignore")
                        fit = ARIMA(train_data, order=(p, d, q)).fit()
                    if fit.aic < best_aic:
                        best_aic, best_order = fit.aic, (p, d, q)
                except Exception:
                    continue
    return best_order or (1, 1, 1)


def get_model_quality(mape):
    """Return (label, color) based on MAPE."""
    if mape is None:
        return "Sin datos", "#999999"
    if mape < 10:
        return "Excelente", "#4CAF50"
    if mape < 20:
        return "Bueno", "#8BC34A"
    if mape < 30:
        return "Aceptable", "#FFC107"
    if mape < 50:
        return "Regular", "#FF9800"
    return "Malo", "#F44336"


def run_arima_forecast(df: pd.DataFrame, horizon: int, freq_str: str,
                       is_auto: bool, manual_order: tuple):
    """Run ARIMA forecast. Returns (prediction_dict, error_str)."""
    try:
        prices = df['Close'].values
        split = int(len(prices) * 0.8)
        train, test = prices[:split], prices[split:]

        if is_auto:
            if _PMDARIMA_AVAILABLE:
                try:
                    order = _pm_auto_arima(
                        train, seasonal=False, stepwise=True,
                        suppress_warnings=True, error_action='ignore',
                        max_p=5, max_q=5, max_d=2, trace=False
                    ).order
                except Exception:
                    order = _grid_search_arima(train)
            else:
                order = _grid_search_arima(train)
        else:
            order = manual_order

        with warnings.catch_warnings():
            warnings.filterwarnings("ignore")
            final_fit = ARIMA(prices, order=order).fit()

        fc_res = final_fit.get_forecast(steps=horizon)
        forecast = fc_res.predicted_mean
        ci = fc_res.conf_int(alpha=0.05)
        lower = ci.iloc[:, 0].values if isinstance(ci, pd.DataFrame) else ci[:, 0]
        upper = ci.iloc[:, 1].values if isinstance(ci, pd.DataFrame) else ci[:, 1]

        rmse = mae = mape = rmse_pct = mae_pct = None
        residuals = test_actual = test_pred = None
        if len(test) > 0:
            test_pred = final_fit.forecast(steps=len(test))
            rmse = float(np.sqrt(mean_squared_error(test, test_pred)))
            mae = float(mean_absolute_error(test, test_pred))
            mape = float(np.mean(np.abs((test - test_pred) / test)) * 100)
            mean_p = np.mean(test)
            rmse_pct = (rmse / mean_p) * 100
            mae_pct = (mae / mean_p) * 100
            residuals = test - test_pred
            test_actual = test

        future_dates = pd.date_range(start=df.index[-1], periods=horizon + 1, freq=freq_str)[1:]

        return {
            'forecast': forecast, 'dates': future_dates, 'order': order,
            'rmse': rmse, 'mae': mae, 'mape': mape,
            'rmse_percent': rmse_pct, 'mae_percent': mae_pct,
            'lower_bound': lower, 'upper_bound': upper,
            'residuals': residuals, 'test_actual': test_actual, 'test_predicted': test_pred,
        }, None
    except Exception as e:
        logger.exception("ARIMA forecast failed for a ticker")
        return None, str(e)


# ---------------------------------------------------------------------------
# Portfolio optimization (Markowitz)
# ---------------------------------------------------------------------------

def _portfolio_stats(weights, mean_returns, cov_matrix, rf_rate):
    ret = float(np.sum(mean_returns * weights) * 252)
    std = float(np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights))) * np.sqrt(252))
    sharpe = (ret - rf_rate) / std if std > 0 else 0.0
    return ret, std, sharpe


def run_portfolio_optimization(current_data: dict, tickers: list, rf_rate: float):
    """Run Markowitz optimization. Returns (result_dict, error_str)."""
    try:
        if len(tickers) < 2:
            return None, "Se necesitan al menos 2 tickers."

        returns_df = pd.DataFrame(
            {t: current_data[t]['Close'].pct_change() for t in tickers}
        ).dropna()

        if returns_df.empty:
            return None, "Insuficientes datos para calcular retornos."

        mean_ret = returns_df.mean().values
        cov = returns_df.cov().values
        n = len(tickers)

        result = minimize(
            lambda w: -_portfolio_stats(w, mean_ret, cov, rf_rate)[2],
            x0=np.full(n, 1.0 / n),
            method='SLSQP',
            bounds=[(0, 1)] * n,
            constraints={'type': 'eq', 'fun': lambda w: np.sum(w) - 1},
        )
        if not result.success:
            raise ValueError(f"Optimization failed: {result.message}")

        opt_w = result.x
        opt_ret, opt_std, opt_sharpe = _portfolio_stats(opt_w, mean_ret, cov, rf_rate)

        rng = np.random.default_rng(42)
        num_port = 5000
        rand_results = np.zeros((3, num_port))
        for i in range(num_port):
            w = rng.random(n)
            w /= w.sum()
            r, s, sh = _portfolio_stats(w, mean_ret, cov, rf_rate)
            rand_results[:, i] = [s, r, sh]

        return {
            'optimal_weights': opt_w,
            'optimal_return': opt_ret,
            'optimal_std': opt_std,
            'optimal_sharpe': opt_sharpe,
            'random_portfolios': rand_results,
            'asset_stats': [
                {'ticker': t, 'return': mean_ret[i] * 252,
                 'volatility': float(np.sqrt(cov[i, i]) * np.sqrt(252))}
                for i, t in enumerate(tickers)
            ],
        }, None
    except Exception as e:
        logger.exception("Portfolio optimization failed")
        return None, str(e)
