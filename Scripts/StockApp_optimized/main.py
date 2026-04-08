"""
DMAPP – Multi-stock analysis and portfolio optimization desktop app.
Entry point and main application class.
"""
import base64
import gc
import logging
import os
import sys
import warnings
from weakref import WeakValueDictionary

import pandas as pd
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QIcon
from PyQt6.QtWidgets import QApplication, QWidget

warnings.filterwarnings('ignore')

logging.basicConfig(
    level=logging.WARNING,
    format='%(asctime)s %(name)s %(levelname)s %(message)s',
)
# Suppress noisy third-party loggers
logging.getLogger('yfinance').setLevel(logging.CRITICAL)
logging.getLogger('peewee').setLevel(logging.CRITICAL)
logger = logging.getLogger(__name__)

from logic import (
    COLOR_SCHEMES, CONFIDENCE_COLORS, TICKER_COLOR_PAIRS,
    export_to_csv, get_model_quality,
)
from plotting import generate_efficient_frontier_chart, generate_stock_chart
from ui import setup_ui
from workers import DataFetchWorker, PortfolioWorker, PredictionWorker

_IMAGES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'images')


# ---------------------------------------------------------------------------
# Memory management (inlined – no separate file needed)
# ---------------------------------------------------------------------------

def _image_to_base64(filename: str) -> str | None:
    path = os.path.join(_IMAGES_DIR, filename)
    if not os.path.exists(path):
        logger.warning("Image not found: %s", path)
        return None
    try:
        ext = os.path.splitext(filename)[1].lower()
        mime = {'.png': 'image/png', '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml'}.get(ext, 'image/png')
        with open(path, 'rb') as f:
            data = base64.b64encode(f.read()).decode('utf-8')
        return f"data:{mime};base64,{data}"
    except Exception as e:
        logger.error("Error encoding image %s: %s", filename, e)
        return None


class DataManager:
    """Manages stock data and predictions with memory-safe operations."""

    MAX_TICKERS = 10

    def __init__(self):
        self.current_data: dict[str, pd.DataFrame] = {}
        self.predictions: dict = {}
        self._cache = WeakValueDictionary()

    def set_data(self, new_data: dict, new_tickers: list) -> list:
        if len(new_tickers) > self.MAX_TICKERS:
            raise ValueError(f"Máximo {self.MAX_TICKERS} tickers permitidos.")
        self.clear_all()
        self.current_data = new_data
        return new_tickers

    def set_predictions(self, preds: dict) -> None:
        self.predictions.clear()
        self.predictions = preds
        gc.collect()

    def optimize_dataframes(self) -> None:
        """Downcast float64 → float32 to halve memory usage."""
        for ticker, df in list(self.current_data.items()):
            try:
                df_opt = df.copy()
                for col in df_opt.select_dtypes('float64').columns:
                    df_opt[col] = df_opt[col].astype('float32')
                if df_opt.index.duplicated().any():
                    df_opt = df_opt[~df_opt.index.duplicated(keep='first')]
                self.current_data[ticker] = df_opt
            except Exception as e:
                logger.warning("Could not optimize %s: %s", ticker, e)

    def get_memory_mb(self) -> float:
        total = sum(df.memory_usage(deep=True).sum() for df in self.current_data.values())
        for pred in self.predictions.values():
            for key in ('forecast', 'lower_bound', 'upper_bound'):
                arr = pred.get(key)
                if arr is not None:
                    total += arr.nbytes
        return total / (1024 ** 2)

    def clear_all(self) -> None:
        self.current_data.clear()
        self.predictions.clear()
        self._cache.clear()
        gc.collect()


# ---------------------------------------------------------------------------
# Main application window
# ---------------------------------------------------------------------------

class MultiStockApp(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle('DMAPP')
        self.setGeometry(100, 100, 1200, 800)
        self.setWindowIcon(QIcon(os.path.join(_IMAGES_DIR, 'ICON.png')))

        self.data_manager = DataManager()
        self.tickers: list[str] = []
        self.use_base100 = True

        self.data_worker: DataFetchWorker | None = None
        self.prediction_worker: PredictionWorker | None = None
        self.portfolio_worker: PortfolioWorker | None = None

        self.color_schemes = COLOR_SCHEMES
        self.ticker_color_pairs = TICKER_COLOR_PAIRS
        self.confidence_colors = CONFIDENCE_COLORS
        self.current_color_scheme = 'UDD'

        self.background_image = _image_to_base64('DMAC.png')

        setup_ui(self)
        self._connect_signals()

    # ------------------------------------------------------------------
    # Signal wiring
    # ------------------------------------------------------------------

    def _connect_signals(self):
        self.start_button.clicked.connect(self._show_main)
        self.exit_button.clicked.connect(self.close)
        self.back_button.clicked.connect(self._show_welcome)

        self.btn.clicked.connect(self.ejecutar)
        self.btn_download.clicked.connect(self.descargar_csv)
        self.btn_predict.clicked.connect(self.generar_prediccion)
        self.btn_optimize.clicked.connect(self.optimizar_cartera)

        self.color_input.currentTextChanged.connect(self._on_color_changed)
        self.base100_checkbox.checkStateChanged.connect(self._on_base100_changed)
        self.auto_arima_radio.toggled.connect(self._on_arima_mode_toggled)
        self.confidence_checkbox.stateChanged.connect(self._on_confidence_toggled)

    # ------------------------------------------------------------------
    # Navigation
    # ------------------------------------------------------------------

    def _show_main(self):
        self.init_screen.hide()
        self.main_screen.show()

    def _show_welcome(self):
        self.main_screen.hide()
        self.init_screen.show()

    # ------------------------------------------------------------------
    # UI helpers
    # ------------------------------------------------------------------

    def _set_message(self, msg: str, error: bool = True):
        color = '#D8000C' if error else '#4F8A10'
        self.message_label.setText(msg)
        self.message_label.setStyleSheet(f'color: {color}; padding: 5px;')

    def _set_ui_enabled(self, enabled: bool):
        for widget in (
            self.btn, self.btn_predict, self.btn_optimize, self.btn_download,
            self.ticker_input, self.period_input, self.freq_input, self.horizon_input,
            self.auto_arima_radio, self.manual_arima_radio,
            self.p_input, self.d_input, self.q_input, self.rf_rate_input,
        ):
            widget.setEnabled(enabled)

    # ------------------------------------------------------------------
    # UI event handlers
    # ------------------------------------------------------------------

    def _on_base100_changed(self, state):
        self.use_base100 = (state == Qt.CheckState.Checked)
        if self.data_manager.current_data and len(self.tickers) > 1:
            self._render_chart()
            label = 'Base 100' if self.use_base100 else 'Valores absolutos'
            self._set_message(f'Escala cambiada a {label}', error=False)

    def _on_arima_mode_toggled(self):
        manual = self.manual_arima_radio.isChecked()
        for w in (self.p_label, self.p_input, self.d_label, self.d_input, self.q_label, self.q_input):
            w.setVisible(manual)

    def _on_confidence_toggled(self):
        if self.data_manager.predictions:
            self._render_chart()

    def _on_color_changed(self, scheme_name: str):
        self.current_color_scheme = 'UDD' if scheme_name == 'Colores Club' else 'default'
        if self.data_manager.current_data and self.tickers:
            self._render_chart()
            self._set_message('Esquema de colores actualizado.', error=False)

    # ------------------------------------------------------------------
    # Data loading
    # ------------------------------------------------------------------

    def ejecutar(self):
        raw = self.ticker_input.text().strip().upper()
        tickers = [t.strip().strip("'\"") for t in raw.split(',') if t.strip().strip("'\\'")]
        # Remove blank entries that could slip through
        tickers = [t for t in tickers if t]

        if not tickers:
            self._set_message("Ingrese al menos un ticker.")
            return
        if len(tickers) > DataManager.MAX_TICKERS:
            self._set_message(f"Máximo {DataManager.MAX_TICKERS} tickers.")
            return

        self.data_manager.clear_all()
        self.tickers = []

        multi = len(tickers) > 1
        self.base100_checkbox.setVisible(multi)
        self.info_label.setVisible(multi)
        if multi:
            self.info_label.setText('<b>Base 100:</b> Normaliza todos los tickers a 100 para comparación.')

        self._set_ui_enabled(False)
        self._set_message(f'Descargando {len(tickers)} ticker(s)…', error=False)

        self.data_worker = DataFetchWorker(tickers, self.period_input.currentText(), self.freq_input.currentText())
        self.data_worker.progress.connect(lambda m: self._set_message(m, error=False))
        self.data_worker.finished.connect(self._on_data_loaded)
        self.data_worker.start()

    def _on_data_loaded(self, current_data, valid_tickers, errors):
        self._set_ui_enabled(True)
        if not current_data:
            self._set_message("No se obtuvieron datos.")
            self.webview.setHtml("<h2>No se encontraron datos</h2>")
            return
        try:
            self.tickers = self.data_manager.set_data(current_data, valid_tickers)
            self.data_manager.optimize_dataframes()
        except ValueError as e:
            self._set_message(str(e))
            return

        self._render_chart()
        mem = self.data_manager.get_memory_mb()
        msg = f"Gráfico listo — {len(self.tickers)} ticker(s), {mem:.1f} MB en memoria."
        if errors:
            msg += f" ({len(errors)} error(es))"
        self._set_message(msg, error=False)

    # ------------------------------------------------------------------
    # ARIMA prediction
    # ------------------------------------------------------------------

    def generar_prediccion(self):
        if not self.data_manager.current_data:
            self._set_message("Cargue datos primero.")
            return

        horizon = int(self.horizon_input.currentText().split()[0])
        freq_map = {'1d': 'D', '1wk': 'W', '1mo': 'ME'}
        freq_str = freq_map.get(self.freq_input.currentText(), 'D')

        self._set_ui_enabled(False)
        self._set_message(f"Generando predicciones para {len(self.tickers)} ticker(s)…", error=False)

        self.prediction_worker = PredictionWorker(
            self.data_manager.current_data, self.tickers, horizon, freq_str,
            self.auto_arima_radio.isChecked(),
            (self.p_input.value(), self.d_input.value(), self.q_input.value()),
        )
        self.prediction_worker.progress.connect(
            lambda msg, cur, tot: self._set_message(f"{msg} ({cur}/{tot})", error=False)
        )
        self.prediction_worker.finished.connect(self._on_predictions_ready)
        self.prediction_worker.start()

    def _on_predictions_ready(self, predictions, errors):
        self._set_ui_enabled(True)
        self.data_manager.set_predictions(predictions)
        if self.data_manager.predictions:
            self._render_chart()
            mem = self.data_manager.get_memory_mb()
            msg = f"Predicciones listas — {len(predictions)} ticker(s), {mem:.1f} MB."
            if errors:
                msg += f" ({len(errors)} fallaron)"
            self._set_message(msg, error=False)
        else:
            self._set_message(f"Sin predicciones. Errores: {', '.join(errors)}")

    # ------------------------------------------------------------------
    # Chart rendering
    # ------------------------------------------------------------------

    def _render_chart(self):
        self._set_message("Generando gráfico…", error=False)
        html = generate_stock_chart(
            self.data_manager.current_data, self.tickers, self.data_manager.predictions,
            self.color_schemes, self.ticker_color_pairs, self.confidence_colors,
            self.current_color_scheme, self.use_base100,
            self.confidence_checkbox.isChecked(),
            get_model_quality, self.background_image,
        )
        self.webview.setHtml(html)
        self._set_message("Gráfico actualizado.", error=False)

    # ------------------------------------------------------------------
    # CSV export
    # ------------------------------------------------------------------

    def descargar_csv(self):
        filename, err = export_to_csv(
            self.data_manager.current_data, self.tickers, self.data_manager.predictions
        )
        if err:
            self._set_message(err)
        else:
            self._set_message(f"Guardado en Descargas: {filename}", error=False)

    # ------------------------------------------------------------------
    # Portfolio optimization
    # ------------------------------------------------------------------

    def optimizar_cartera(self):
        if not self.data_manager.current_data:
            self._set_message("Cargue datos primero.")
            return
        if len(self.tickers) < 2:
            self._set_message("Se necesitan al menos 2 tickers.")
            return
        try:
            rf = float(self.rf_rate_input.text().strip()) / 100.0
        except ValueError:
            self._set_message("Tasa libre de riesgo inválida. Use formato: 3.0 para 3%")
            return

        self._set_ui_enabled(False)
        self._set_message(f"Optimizando cartera con {len(self.tickers)} activos…", error=False)

        self.portfolio_worker = PortfolioWorker(self.data_manager.current_data, self.tickers, rf)
        self.portfolio_worker.progress.connect(lambda m: self._set_message(m, error=False))
        self.portfolio_worker.finished.connect(self._on_portfolio_ready)
        self.portfolio_worker.start()

    def _on_portfolio_ready(self, portfolio_data, error):
        self._set_ui_enabled(True)
        if error:
            self._set_message(f"Error en optimización: {error}")
            return
        html = generate_efficient_frontier_chart(portfolio_data, self.tickers, self.background_image)
        self.webview.setHtml(html)
        r = portfolio_data['optimal_return'] * 100
        s = portfolio_data['optimal_std'] * 100
        sh = portfolio_data['optimal_sharpe']
        self._set_message(
            f"Cartera óptima — Retorno: {r:.2f}%, Riesgo: {s:.2f}%, Sharpe: {sh:.2f}",
            error=False,
        )

    # ------------------------------------------------------------------
    # Cleanup
    # ------------------------------------------------------------------

    def closeEvent(self, event):
        for worker in (self.data_worker, self.prediction_worker, self.portfolio_worker):
            if worker and worker.isRunning():
                worker.terminate()
                worker.wait()
        self.data_manager.clear_all()
        event.accept()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == '__main__':
    app = QApplication(sys.argv)
    window = MultiStockApp()
    window.show()
    sys.exit(app.exec())
