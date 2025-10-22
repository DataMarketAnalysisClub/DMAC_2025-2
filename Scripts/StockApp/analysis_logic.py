import numpy as np
import pandas as pd
import warnings
from statsmodels.tsa.arima.model import ARIMA
from sklearn.metrics import mean_squared_error, mean_absolute_error

# Intentar importar pmdarima
try:
    from pmdarima import auto_arima
    PMDARIMA_AVAILABLE = True
except (ImportError, ValueError):
    PMDARIMA_AVAILABLE = False
    auto_arima = None

def _auto_arima_grid_search(train_data, max_p=3, max_d=2, max_q=3):
    """
    Búsqueda automática de parámetros ARIMA usando grid search con statsmodels.
    """
    best_aic = np.inf
    best_order = None
    
    for p in range(max_p + 1):
        for d in range(max_d + 1):
            for q in range(max_q + 1):
                try:
                    if p == 0 and d == 0 and q == 0:
                        continue
                    
                    model = ARIMA(train_data, order=(p, d, q))
                    with warnings.catch_warnings():
                        warnings.filterwarnings("ignore")
                        fitted = model.fit()
                    
                    if fitted.aic < best_aic:
                        best_aic = fitted.aic
                        best_order = (p, d, q)
                except Exception:
                    continue
    
    return best_order if best_order else (1, 1, 1) # Fallback

def get_model_quality(mape):
    """
    Determina la calidad del modelo basado en MAPE
    """
    if mape is None:
        return "Sin datos", "#999999"
    elif mape < 10:
        return "Excelente", "#4CAF50"
    elif mape < 20:
        return "Bueno", "#8BC34A"
    elif mape < 30:
        return "Aceptable", "#FFC107"
    elif mape < 50:
        return "Regular", "#FF9800"
    else:
        return "Malo", "#F44336"

def run_arima_forecast(df, horizon, freq_str, is_auto, manual_order):
    """
    Ejecuta una predicción ARIMA para un único DataFrame de datos.
    """
    try:
        close_prices = df['Close'].values
        
        # Dividir en train/test (últimos 20% para test)
        train_size = int(len(close_prices) * 0.8)
        train, test = close_prices[:train_size], close_prices[train_size:]
        
        order = None
        if is_auto:
            if PMDARIMA_AVAILABLE:
                try:
                    model_fit = auto_arima(train, seasonal=False, stepwise=True,
                                           suppress_warnings=True, error_action='ignore',
                                           max_p=5, max_q=5, max_d=2, trace=False)
                    order = model_fit.order
                except Exception:
                    order = _auto_arima_grid_search(train)
            else:
                order = _auto_arima_grid_search(train)
        else:
            order = manual_order
        
        # Re-entrenar con todos los datos
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore")
            final_model = ARIMA(close_prices, order=order)
            final_fit = final_model.fit()
        
        # Generar predicciones
        forecast_result = final_fit.get_forecast(steps=horizon)
        forecast = forecast_result.predicted_mean
        forecast_ci = forecast_result.conf_int(alpha=0.05) # 95% confianza
        
        if isinstance(forecast_ci, pd.DataFrame):
            lower_bound = forecast_ci.iloc[:, 0].values
            upper_bound = forecast_ci.iloc[:, 1].values
        else: # numpy array
            lower_bound = forecast_ci[:, 0]
            upper_bound = forecast_ci[:, 1]
        
        # Calcular métricas
        rmse, mae, mape, rmse_percent, mae_percent, residuals, test_actual, test_predicted = (None,) * 8
        if len(test) > 0:
            test_predictions = final_fit.forecast(steps=len(test))
            rmse = np.sqrt(mean_squared_error(test, test_predictions))
            mae = mean_absolute_error(test, test_predictions)
            mape = np.mean(np.abs((test - test_predictions) / test)) * 100
            mean_price = np.mean(test)
            rmse_percent = (rmse / mean_price) * 100
            mae_percent = (mae / mean_price) * 100
            residuals = test - test_predictions
            test_actual = test
            test_predicted = test_predictions

        # Generar fechas futuras
        last_date = df.index[-1]
        future_dates = pd.date_range(start=last_date, periods=horizon+1, freq=freq_str)[1:]
        
        prediction_data = {
            'forecast': forecast, 'dates': future_dates, 'order': order,
            'rmse': rmse, 'mae': mae, 'mape': mape,
            'rmse_percent': rmse_percent, 'mae_percent': mae_percent,
            'lower_bound': lower_bound, 'upper_bound': upper_bound,
            'residuals': residuals, 'test_actual': test_actual,
            'test_predicted': test_predicted
        }
        return prediction_data, None

    except Exception as e:
        import traceback
        traceback.print_exc()
        return None, str(e)
