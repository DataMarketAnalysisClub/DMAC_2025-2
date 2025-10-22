from PyQt5.QtCore import QThread, pyqtSignal
from data_logic import fetch_stock_data
from analysis_logic import run_arima_forecast

class DataFetchWorker(QThread):
    """Worker thread for fetching stock data"""
    finished = pyqtSignal(dict, list, list)  # current_data, valid_tickers, errors
    progress = pyqtSignal(str)  # progress messages
    
    def __init__(self, tickers, period, interval):
        super().__init__()
        self.tickers = tickers
        self.period = period
        self.interval = interval
    
    def run(self):
        try:
            self.progress.emit(f'Descargando datos para {len(self.tickers)} ticker(s)...')
            current_data, valid_tickers, errors = fetch_stock_data(
                self.tickers, self.period, self.interval
            )
            self.finished.emit(current_data, valid_tickers, errors)
        except Exception as e:
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
