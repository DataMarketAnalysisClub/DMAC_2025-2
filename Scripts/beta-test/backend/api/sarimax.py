import pandas as pd
import numpy as np
import statsmodels.api as sm
from statsmodels.tsa.statespace.sarimax import SARIMAX
from sklearn.metrics import mean_absolute_error
import logging
import warnings

# Attempt to import pmdarima for auto-arima functionality
try:
    import pmdarima as pm
    PMDARIMA_AVAILABLE = True
except ImportError:
    PMDARIMA_AVAILABLE = False

logger = logging.getLogger(__name__)

def fit_sarimax(history_data, exog_data=None, order=(1, 1, 1), seasonal_order=(0, 1, 1, 12), forecast_steps=15, auto_fit=False):
    """
    Fits a SARIMAX model to the provided historical data.
    
    Args:
        history_data (list of dicts): Target data like [{'date': '2023-01-01', 'price': 150.0}, ...]
        exog_data (list of dicts): Exogenous data like [{'date': '2023-01-01', 'SPY': 400.0, 'OIL': 70.0}, ...]
        order (tuple): The (p, d, q) order of the model (ignored if auto_fit=True).
        seasonal_order (tuple): The (P, D, Q, s) seasonal order (ignored if auto_fit=True).
        forecast_steps (int): Number of steps to forecast into the future.
        auto_fit (bool): If True, uses Auto-ARIMA to find optimal parameters.
        
    Returns:
        dict: Contains 'forecast', 'lower_ci', 'upper_ci', 'metrics', 'dates', 'params'
    """
    try:
        # 1. Prepare Target Data
        df = pd.DataFrame(history_data)
        df['date'] = pd.to_datetime(df['date'])
        df = df.set_index('date').sort_index()
        
        # Infer frequency
        if df.index.freq is None:
            df.index.freq = pd.infer_freq(df.index)
        freq = df.index.freq if df.index.freq else 'D'
        
        series = df['price']

        # 2. Prepare Exogenous Data (if provided)
        exog_df = None
        future_exog = None
        
        if exog_data and len(exog_data) > 0:
            exog_raw = pd.DataFrame(exog_data)
            exog_raw['date'] = pd.to_datetime(exog_raw['date'])
            exog_raw = exog_raw.set_index('date').sort_index()
            
            # Align exog with target dates
            # We need common dates to fit the model
            common_index = df.index.intersection(exog_raw.index)
            
            if len(common_index) < 10: # Arbitrary check for sufficient overlap
                 logger.warning("Insufficient overlap between target and exogenous data.")
            else:
                 # LAG LOGIC: Use exogenous data up to previous day to predict today
                 # We shift exogenous variables forward by 1 (t-1 becomes predictor for t)
                 exog_shifted = exog_raw.shift(1).dropna()
                 
                 # Re-align after shifting (we lose the first data point)
                 aligned_index = df.index.intersection(exog_shifted.index)
                 
                 series = series.loc[aligned_index]
                 exog_df = exog_shifted.loc[aligned_index]
                 
                 # For forecasting, we need "future" exogenous values.
                 # Because we lag by 1, the "future" exog value for tomorrow (T+1) 
                 # is actually the REAL value from today (T).
                 # However, we need to project 'forecast_steps' into the future.
                 # If we only have data up to today, we can only strictly forecast T+1 using known data.
                 # For T+2, T+3... we technically need forecasts of the exogenous variables.
                 # SIMPLIFICATION: For this MVP, we will assume the exogenous variables 
                 # stay constant at the last known value or repeat the last known sequence 
                 # (Naive method) to allow multi-step forecasting.
                 
                 last_known_exog = exog_raw.iloc[-1] # This is "Today's" value, used to predict "Tomorrow"
                 
                 # Create future exog DataFrame
                 future_dates_idx = pd.date_range(start=series.index[-1] + pd.Timedelta(days=1), periods=forecast_steps, freq=freq)
                 future_exog = pd.DataFrame([last_known_exog.values] * forecast_steps, index=future_dates_idx, columns=exog_df.columns)


        # 3. Model Fitting
        final_order = order
        final_seasonal_order = seasonal_order
        
        if auto_fit and PMDARIMA_AVAILABLE:
            # Use Auto-ARIMA to find best params
            try:
                logger.info("Running Auto-ARIMA...")
                auto_model = pm.auto_arima(
                    series, 
                    exogenous=exog_df,
                    start_p=0, start_q=0,
                    max_p=3, max_q=3, m=seasonal_order[3],
                    start_P=0, seasonal=True,
                    d=None, D=1, trace=False,
                    error_action='ignore',  
                    suppress_warnings=True, 
                    stepwise=True
                )
                final_order = auto_model.order
                final_seasonal_order = auto_model.seasonal_order
                logger.info(f"Auto-ARIMA found order: {final_order}, seasonal: {final_seasonal_order}")
            except Exception as ae:
                logger.error(f"Auto-ARIMA failed: {ae}, falling back to manual.")

        # Fit using Statsmodels (for consistency and detailed results)
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore")
            
            model = SARIMAX(
                series,
                exog=exog_df,
                order=final_order,
                seasonal_order=final_seasonal_order,
                enforce_stationarity=False,
                enforce_invertibility=False
            )
            
            results = model.fit(disp=False)

        # 4. Forecast
        forecast_obj = results.get_forecast(steps=forecast_steps, exog=future_exog)
        forecast_mean = forecast_obj.predicted_mean
        conf_int = forecast_obj.conf_int(alpha=0.05)

        # 5. Metrics
        # In-sample prediction for metrics
        # Note: prediction start index must be adjusted if exog is used
        predict_start = 1 
        in_sample_preds = results.predict(start=predict_start, end=len(series)-1, exog=exog_df.iloc[predict_start:] if exog_df is not None else None)
        actuals = series[predict_start:]
        
        mae = mean_absolute_error(actuals, in_sample_preds)
        aic = results.aic
        mape = np.mean(np.abs((actuals - in_sample_preds) / actuals)) * 100

        # Prepare response
        future_dates = pd.date_range(start=series.index[-1] + pd.Timedelta(days=1), periods=forecast_steps, freq=freq)
        
        response = {
            'forecast': forecast_mean.tolist(),
            'lower_ci': conf_int.iloc[:, 0].tolist(),
            'upper_ci': conf_int.iloc[:, 1].tolist(),
            'dates': [d.strftime('%Y-%m-%d') for d in future_dates],
            'metrics': {
                'aic': round(aic, 2),
                'mae': round(mae, 4),
                'mape': round(mape, 2)
            },
            'params': {
                'order': final_order,
                'seasonal_order': final_seasonal_order
            }
        }
        
        return response

    except Exception as e:
        logger.error(f"SARIMAX Fitting Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return None
