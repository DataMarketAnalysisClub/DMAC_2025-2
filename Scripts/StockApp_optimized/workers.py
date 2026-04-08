"""
Qt worker threads: keeps network/CPU-heavy work off the main thread.
"""
import logging

from PyQt6.QtCore import QThread, pyqtSignal

from logic import fetch_stock_data, run_arima_forecast, run_portfolio_optimization

logger = logging.getLogger(__name__)


class DataFetchWorker(QThread):
    finished = pyqtSignal(dict, list, list)   # current_data, valid_tickers, errors
    progress = pyqtSignal(str)

    def __init__(self, tickers, period, interval):
        super().__init__()
        self.tickers = tickers
        self.period = period
        self.interval = interval

    def run(self):
        current_data, valid_tickers, errors = {}, [], []
        for i, ticker in enumerate(self.tickers, 1):
            self.progress.emit(f"Descargando {ticker} ({i}/{len(self.tickers)})...")
            df, err = fetch_stock_data(ticker, self.period, self.interval)
            if err:
                errors.append(err)
            else:
                current_data[ticker] = df
                valid_tickers.append(ticker)
        self.finished.emit(current_data, valid_tickers, errors)


class PredictionWorker(QThread):
    finished = pyqtSignal(dict, list)          # predictions, errors
    progress = pyqtSignal(str, int, int)       # message, current, total

    def __init__(self, current_data, tickers, horizon, freq_str, is_auto, manual_order):
        super().__init__()
        self.current_data = current_data
        self.tickers = tickers
        self.horizon = horizon
        self.freq_str = freq_str
        self.is_auto = is_auto
        self.manual_order = manual_order

    def run(self):
        predictions, errors = {}, []
        total = len(self.tickers)
        for i, ticker in enumerate(self.tickers, 1):
            self.progress.emit(f"Procesando {ticker}...", i, total)
            pred, err = run_arima_forecast(
                self.current_data[ticker], self.horizon,
                self.freq_str, self.is_auto, self.manual_order,
            )
            if err:
                errors.append(f"{ticker}: {err}")
            else:
                predictions[ticker] = pred
        self.finished.emit(predictions, errors)


class PortfolioWorker(QThread):
    finished = pyqtSignal(dict, str)           # portfolio_data, error
    progress = pyqtSignal(str)

    def __init__(self, current_data, tickers, rf_rate):
        super().__init__()
        self.current_data = current_data
        self.tickers = tickers
        self.rf_rate = rf_rate

    def run(self):
        self.progress.emit("Calculando retornos históricos...")
        data, err = run_portfolio_optimization(self.current_data, self.tickers, self.rf_rate)
        if err:
            self.finished.emit({}, err)
        else:
            self.progress.emit("Optimizando cartera...")
            self.finished.emit(data, "")
