from PyQt5.QtCore import QThread, pyqtSignal
import pandas as pd
import yfinance as yf
from analysis_logic import run_arima_forecast
from portfolio_logic import run_portfolio_optimization

class DataFetchWorker(QThread):
    """Worker thread for fetching stock data sequentially"""
    finished = pyqtSignal(dict, list, list)  # current_data, valid_tickers, errors
    progress = pyqtSignal(str)  # progress messages
    
    def __init__(self, tickers, period, interval):
        super().__init__()
        self.tickers = tickers
        self.period = period
        self.interval = interval
    
    def run(self):
        try:
            current_data = {}
            valid_tickers = []
            errors = []
            
            for idx, ticker in enumerate(self.tickers, 1):
                self.progress.emit(f'Descargando {ticker} ({idx}/{len(self.tickers)})...')
                
                try:
                    df = yf.download(ticker, period=self.period, interval=self.interval, progress=False)
                    
                    if df.empty:
                        errors.append(f"No se obtuvieron datos para '{ticker}'.")
                        continue
                    
                    if isinstance(df.columns, pd.MultiIndex):
                        df.columns = df.columns.droplevel(1)
                    
                    df = df[['Open', 'High', 'Low', 'Close']].dropna()
                    
                    if not df.empty:
                        current_data[ticker] = df
                        valid_tickers.append(ticker)
                    else:
                        errors.append(f"Datos vacíos para '{ticker}' después de limpiar.")
                
                except Exception as e:
                    errors.append(f"Error con '{ticker}': {e}.")
                    continue
            
            self.finished.emit(current_data, valid_tickers, errors)
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            self.finished.emit({}, [], [f"Error crítico: {str(e)}"])


class PredictionWorker(QThread):
    """Worker thread for ARIMA predictions"""
    finished = pyqtSignal(dict, list)  # predictions, errors
    progress = pyqtSignal(str, int, int)  # message, current, total
    
    def __init__(self, current_data, tickers, horizon, freq_str, is_auto, manual_order):
        super().__init__()
        self.current_data = current_data
        self.tickers = tickers
        self.horizon = horizon
        self.freq_str = freq_str
        self.is_auto = is_auto
        self.manual_order = manual_order
    
    def run(self):
        try:
            predictions = {}
            errors = []
            
            for idx, ticker in enumerate(self.tickers, 1):
                self.progress.emit(f"Procesando {ticker}...", idx, len(self.tickers))
                
                pred_data, error = run_arima_forecast(
                    self.current_data[ticker],
                    self.horizon,
                    self.freq_str,
                    self.is_auto,
                    self.manual_order
                )
                
                if error:
                    errors.append(f"{ticker}: {error}")
                else:
                    predictions[ticker] = pred_data
            
            self.finished.emit(predictions, errors)
        except Exception as e:
            self.finished.emit({}, [f"Error crítico: {str(e)}"])


class PortfolioWorker(QThread):
    """Worker thread for portfolio optimization"""
    finished = pyqtSignal(dict, str)  # portfolio_data, error
    progress = pyqtSignal(str)  # progress message
    
    def __init__(self, current_data, tickers, rf_rate):
        super().__init__()
        self.current_data = current_data
        self.tickers = tickers
        self.rf_rate = rf_rate
    
    def run(self):
        try:
            self.progress.emit("Calculando retornos históricos...")
            portfolio_data, error = run_portfolio_optimization(
                self.current_data,
                self.tickers,
                self.rf_rate
            )
            
            if error:
                self.finished.emit({}, error)
            else:
                self.progress.emit("Optimizando cartera...")
                self.finished.emit(portfolio_data, "")
                
        except Exception as e:
            import traceback
            traceback.print_exc()
            self.finished.emit({}, f"Error crítico: {str(e)}")
