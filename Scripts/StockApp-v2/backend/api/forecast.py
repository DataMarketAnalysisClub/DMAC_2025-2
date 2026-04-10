"""
Predicción de series de tiempo con ARIMA.
Solo variables endógenas (historial de precios).

Migración a async: reemplazar esta función por una tarea Celery
envolviendo el mismo código sin cambios internos.
"""
import warnings
import numpy as np
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA
from sklearn.metrics import mean_squared_error, mean_absolute_error

try:
    from pmdarima import auto_arima as _auto_arima
    PMDARIMA_AVAILABLE = True
except (ImportError, ValueError):
    PMDARIMA_AVAILABLE = False


def _grid_search_order(series: np.ndarray, max_p=3, max_d=2, max_q=3):
    best_aic = np.inf
    best_order = (1, 1, 1)
    for p in range(max_p + 1):
        for d in range(max_d + 1):
            for q in range(max_q + 1):
                if p == 0 and d == 0 and q == 0:
                    continue
                try:
                    with warnings.catch_warnings():
                        warnings.filterwarnings('ignore')
                        fit = ARIMA(series, order=(p, d, q)).fit()
                    if fit.aic < best_aic:
                        best_aic = fit.aic
                        best_order = (p, d, q)
                except Exception:
                    continue
    return best_order


def run_forecast(
    close_series: pd.Series,
    horizon: int,
    freq: str,
    auto: bool,
    manual_order: tuple,
) -> dict:
    """
    Ajusta ARIMA y genera forecast.

    Args:
        close_series: pd.Series con precios de cierre indexada por fecha.
        horizon: número de períodos a predecir.
        freq: frecuencia pandas ('D', 'W', 'ME').
        auto: si True busca el mejor orden automáticamente.
        manual_order: (p, d, q) usado cuando auto=False.

    Returns:
        dict con forecast, fechas, bandas de confianza y métricas.
    """
    prices = close_series.values.astype(float)
    train_size = int(len(prices) * 0.8)
    train, test = prices[:train_size], prices[train_size:]

    # Selección de orden
    if auto:
        if PMDARIMA_AVAILABLE:
            try:
                with warnings.catch_warnings():
                    warnings.filterwarnings('ignore')
                    result = _auto_arima(
                        train, seasonal=False, stepwise=True,
                        suppress_warnings=True, error_action='ignore',
                        max_p=5, max_q=5, max_d=2,
                    )
                order = result.order
            except Exception:
                order = _grid_search_order(train)
        else:
            order = _grid_search_order(train)
    else:
        order = manual_order

    # Entrenar con serie completa
    with warnings.catch_warnings():
        warnings.filterwarnings('ignore')
        final_fit = ARIMA(prices, order=order).fit()

    # Forecast
    fc_result = final_fit.get_forecast(steps=horizon)
    forecast = fc_result.predicted_mean
    ci = fc_result.conf_int(alpha=0.05)
    lower = ci.iloc[:, 0].values if isinstance(ci, pd.DataFrame) else ci[:, 0]
    upper = ci.iloc[:, 1].values if isinstance(ci, pd.DataFrame) else ci[:, 1]

    # Métricas sobre test set
    metrics = {}
    if len(test) > 0:
        test_pred = final_fit.forecast(steps=len(test))
        rmse = float(np.sqrt(mean_squared_error(test, test_pred)))
        mae  = float(mean_absolute_error(test, test_pred))
        mape = float(np.mean(np.abs((test - test_pred) / test)) * 100)
        metrics = {
            'rmse': round(rmse, 4),
            'mae':  round(mae, 4),
            'mape': round(mape, 4),
            'quality': _quality_label(mape),
        }

    # Fechas futuras
    last_date = close_series.index[-1]
    future_dates = pd.date_range(start=last_date, periods=horizon + 1, freq=freq)[1:]

    return {
        'order': list(order),
        'dates': future_dates.strftime('%Y-%m-%d').tolist(),
        'forecast': [round(float(v), 4) for v in forecast],
        'lower':    [round(float(v), 4) for v in lower],
        'upper':    [round(float(v), 4) for v in upper],
        'metrics':  metrics,
    }


def _quality_label(mape: float) -> dict:
    if mape < 10:
        return {'label': 'Excelente', 'color': '#4CAF50'}
    if mape < 20:
        return {'label': 'Bueno',     'color': '#8BC34A'}
    if mape < 30:
        return {'label': 'Aceptable', 'color': '#FFC107'}
    if mape < 50:
        return {'label': 'Regular',   'color': '#FF9800'}
    return     {'label': 'Malo',      'color': '#F44336'}
