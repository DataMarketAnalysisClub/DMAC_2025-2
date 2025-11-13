import sys
import pandas as pd
import warnings
from PyQt5.QtWidgets import QApplication, QWidget
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QIcon
import os

# Ignorar advertencias de statsmodels
warnings.filterwarnings('ignore')

# Importar nuestros módulos separados
from ui_setup import setup_ui
from data_logic import export_to_csv
from analysis_logic import get_model_quality
from plotting import generate_stock_chart
from config import COLOR_SCHEMES, TICKER_COLOR_PAIRS, CONFIDENCE_COLORS
from worker_threads import DataFetchWorker, PredictionWorker, PortfolioWorker
from memory_management import DataManager, get_image_base64

class MultiStockApp(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle('DMAPP')
        self.setGeometry(100, 100, 1200, 800)

        # Get the directory where this script is located
        script_dir = os.path.dirname(os.path.abspath(__file__))
        # Create the full path to the icon
        icon_path = os.path.join(script_dir, 'images', 'ICON.png')

        # Set the icon
        self.setWindowIcon(QIcon(icon_path))
        
        # Estado de la aplicación
        self.data_manager = DataManager(max_tickers=10)
        self.tickers = []
        self.use_base100 = True
        
        # Workers
        self.data_worker = None
        self.prediction_worker = None
        self.portfolio_worker = None
        
        # Portfolio data
        self.portfolio_data = None
        
        # Configuración de colores
        self.color_schemes = COLOR_SCHEMES
        self.ticker_color_pairs = TICKER_COLOR_PAIRS
        self.confidence_colors = CONFIDENCE_COLORS
        self.current_color_scheme = 'UDD'
        
        # Load background image once
        self.background_image = get_image_base64('DMAC.png')
        
        # Construir la UI desde el módulo ui_setup
        setup_ui(self)
        
        # Conectar señales
        self._connect_signals()

    def _connect_signals(self):
        """Conecta todos los botones y widgets a sus funciones."""
        self.start_button.clicked.connect(self.show_main_screen)
        self.exit_button.clicked.connect(self.close)
        self.back_button.clicked.connect(self.show_init_screen)
        
        self.btn.clicked.connect(self.ejecutar)
        self.btn_download.clicked.connect(self.descargar_csv)
        self.btn_predict.clicked.connect(self.generar_prediccion)
        self.btn_optimize.clicked.connect(self.optimizar_cartera)
        
        self.color_input.currentTextChanged.connect(self.change_color_scheme)
        self.base100_checkbox.stateChanged.connect(self.toggle_base100)
        self.auto_arima_radio.toggled.connect(self.toggle_arima_mode)
        self.confidence_checkbox.stateChanged.connect(self.toggle_confidence_bands)

    def _set_ui_enabled(self, enabled):
        """Enable/disable UI controls during processing"""
        self.btn.setEnabled(enabled)
        self.btn_predict.setEnabled(enabled)
        self.btn_optimize.setEnabled(enabled)
        self.btn_download.setEnabled(enabled)
        self.ticker_input.setEnabled(enabled)
        self.period_input.setEnabled(enabled)
        self.freq_input.setEnabled(enabled)
        self.horizon_input.setEnabled(enabled)
        self.auto_arima_radio.setEnabled(enabled)
        self.manual_arima_radio.setEnabled(enabled)
        self.p_input.setEnabled(enabled)
        self.d_input.setEnabled(enabled)
        self.q_input.setEnabled(enabled)
        self.rf_rate_input.setEnabled(enabled)

    # --- Funciones de Navegación y UI ---

    def show_main_screen(self):
        self.init_screen.hide()
        self.main_screen.show()
    
    def show_init_screen(self):
        self.main_screen.hide()
        self.init_screen.show()
    
    def set_message(self, msg, is_error=True):
        self.message_label.setText(msg)
        color = '#D8000C' if is_error else '#4F8A10'
        self.message_label.setStyleSheet(f'color: {color}; padding: 5px;')
    
    def toggle_base100(self, state):
        self.use_base100 = (state == Qt.Checked)
        if self.data_manager.current_data and len(self.tickers) > 1:
            self.create_chart()
            scale_type = 'Base 100' if self.use_base100 else 'Valores absolutos'
            self.set_message(f'Escala cambiada a {scale_type}', False)
    
    def toggle_arima_mode(self):
        is_manual = self.manual_arima_radio.isChecked()
        self.p_label.setVisible(is_manual)
        self.p_input.setVisible(is_manual)
        self.d_label.setVisible(is_manual)
        self.d_input.setVisible(is_manual)
        self.q_label.setVisible(is_manual)
        self.q_input.setVisible(is_manual)
    
    def toggle_confidence_bands(self):
        if self.data_manager.predictions:
            self.create_chart()
    
    def change_color_scheme(self, scheme_name):
        self.current_color_scheme = 'UDD' if scheme_name == 'Colores Club' else 'default'
        if self.data_manager.current_data and self.tickers:
            self.create_chart()
            self.set_message(f'Esquema de colores cambiado', False)

    # --- Funciones de Lógica Principal (Controlador) ---

    def ejecutar(self):
        ticker_input = self.ticker_input.text().strip().upper()
        periodo = self.period_input.currentText()
        frecuencia = self.freq_input.currentText()
        
        # Clean and parse tickers - remove quotes and extra whitespace
        tickers = []
        for t in ticker_input.split(','):
            # Remove quotes, apostrophes, and whitespace
            cleaned = t.strip().strip("'\"").strip()
            if cleaned:
                tickers.append(cleaned)
        
        print(f"DEBUG ejecutar: Raw input = {repr(ticker_input)}")
        print(f"DEBUG ejecutar: Parsed tickers = {tickers}")
        
        if not tickers:
            self.set_message("Debe ingresar al menos un ticker.")
            return
        
        # Verificar límite de tickers
        if len(tickers) > self.data_manager.max_tickers:
            self.set_message(f"Máximo {self.data_manager.max_tickers} tickers permitidos.")
            return
        
        # Limpiar datos previos (libera memoria)
        self.data_manager.clear_all()
        self.tickers = []
        
        # Mostrar/ocultar controles de Base 100
        if len(tickers) > 1:
            self.base100_checkbox.show()
            self.info_label.setText('<b>Base 100:</b> Normaliza todos los tickers a un valor inicial de 100 para comparación.')
            self.info_label.show()
        else:
            self.base100_checkbox.hide()
            self.info_label.hide()
        
        # Deshabilitar UI
        self._set_ui_enabled(False)
        self.set_message(f'Cargando datos para {len(tickers)} ticker(s)...', False)
        
        # Crear y ejecutar worker
        self.data_worker = DataFetchWorker(tickers, periodo, frecuencia)
        self.data_worker.progress.connect(lambda msg: self.set_message(msg, False))
        self.data_worker.finished.connect(self._on_data_loaded)
        self.data_worker.start()

    def _on_data_loaded(self, current_data, valid_tickers, errors):
        """Callback cuando termina la descarga de datos"""
        self._set_ui_enabled(True)
        
        print(f"DEBUG _on_data_loaded: Received {len(current_data)} tickers")
        print(f"DEBUG _on_data_loaded: current_data keys = {list(current_data.keys())}")
        print(f"DEBUG _on_data_loaded: valid_tickers = {valid_tickers}")
        
        if not current_data:
            self.set_message("No se obtuvieron datos para ningún ticker.")
            self.webview.setHtml("<h2>No se encontraron datos</h2>")
            return
        
        # Store data with proper memory management
        try:
            self.tickers = self.data_manager.set_data(current_data, valid_tickers)
            print(f"DEBUG after set_data: self.tickers = {self.tickers}")
            print(f"DEBUG after set_data: self.data_manager.current_data keys = {list(self.data_manager.current_data.keys())}")
            
            # Optimize DataFrames to reduce memory
            self.data_manager.optimize_dataframes()
            
            # Show memory usage (useful for debugging)
            mem_usage = self.data_manager.get_memory_usage()
            
        except ValueError as e:
            self.set_message(str(e))
            return
        
        self.create_chart()
        msg = f"Gráfico generado para {len(self.tickers)} ticker(s). Memoria: {mem_usage:.2f} MB"
        if errors:
            msg += f" ({len(errors)} errores)"
        self.set_message(msg, False)

    def generar_prediccion(self):
        if not self.data_manager.current_data or not self.tickers:
            self.set_message("Primero debe cargar datos de tickers.")
            return
        
        horizon = int(self.horizon_input.currentText().split()[0])
        is_auto = self.auto_arima_radio.isChecked()
        manual_order = (self.p_input.value(), self.d_input.value(), self.q_input.value())
        freq_map = {'1d': 'D', '1wk': 'W', '1mo': 'M'}
        freq_str = freq_map.get(self.freq_input.currentText(), 'D')
        
        # Deshabilitar UI
        self._set_ui_enabled(False)
        self.set_message(f"Iniciando predicciones para {len(self.tickers)} ticker(s)...", False)
        
        # Crear y ejecutar worker
        self.prediction_worker = PredictionWorker(
            self.data_manager.current_data, self.tickers, horizon, 
            freq_str, is_auto, manual_order
        )
        self.prediction_worker.progress.connect(self._on_prediction_progress)
        self.prediction_worker.finished.connect(self._on_predictions_ready)
        self.prediction_worker.start()

    def _on_prediction_progress(self, message, current, total):
        """Callback para actualizar progreso de predicciones"""
        self.set_message(f"{message} ({current}/{total})", False)

    def _on_predictions_ready(self, predictions, errors):
        """Callback cuando terminan las predicciones"""
        self._set_ui_enabled(True)
        
        # Store predictions with proper cleanup
        self.data_manager.set_predictions(predictions)
        
        if self.data_manager.predictions:
            self.create_chart()
            mem_usage = self.data_manager.get_memory_usage()
            msg = f"Predicciones generadas para {len(self.data_manager.predictions)} ticker(s). Memoria: {mem_usage:.2f} MB"
            if errors:
                msg += f" ({len(errors)} fallaron)"
            self.set_message(msg, False)
        else:
            self.set_message(f"No se pudieron generar predicciones. Errores: {', '.join(errors)}")

    def create_chart(self):
        self.set_message("Generando gráfico...", False)
        
        print("=" * 60)
        print("DEBUG create_chart CALLED")
        print(f"DEBUG create_chart: self.tickers = {self.tickers}")
        print(f"DEBUG create_chart: len(self.tickers) = {len(self.tickers)}")
        print(f"DEBUG create_chart: data_manager.current_data keys = {list(self.data_manager.current_data.keys())}")
        print(f"DEBUG create_chart: len(data_manager.current_data) = {len(self.data_manager.current_data)}")
        print(f"DEBUG create_chart: data_manager.predictions keys = {list(self.data_manager.predictions.keys())}")
        print("=" * 60)
        
        html_str = generate_stock_chart(
            self.data_manager.current_data, self.tickers, self.data_manager.predictions,
            self.color_schemes, self.ticker_color_pairs, self.confidence_colors,
            self.current_color_scheme, self.use_base100,
            self.confidence_checkbox.isChecked(),
            get_model_quality,
            self.background_image  # Pass background image
        )
        
        print("DEBUG: Chart HTML generated, length:", len(html_str))
        self.webview.setHtml(html_str)
        self.set_message("Gráfico actualizado.", False)
    
    def descargar_csv(self):
        filename, error = export_to_csv(
            self.data_manager.current_data, 
            self.tickers, 
            self.data_manager.predictions
        )
        
        if error:
            self.set_message(error, is_error=True)
        else:
            self.set_message(f"Datos guardados en '{filename}' (carpeta Descargas).", is_error=False)

    def optimizar_cartera(self):
        """Optimize portfolio using Markowitz"""
        if not self.data_manager.current_data or not self.tickers:
            self.set_message("Primero debe cargar datos de tickers.")
            return
        
        if len(self.tickers) < 2:
            self.set_message("Se necesitan al menos 2 tickers para optimización de cartera.")
            return
        
        # Get risk-free rate
        try:
            rf_rate_pct = float(self.rf_rate_input.text().strip())
            rf_rate = rf_rate_pct / 100.0  # Convert percentage to decimal
        except ValueError:
            self.set_message("Tasa libre de riesgo inválida. Use formato: 3.0 para 3%")
            return
        
        # Disable UI
        self._set_ui_enabled(False)
        self.set_message(f"Optimizando cartera con {len(self.tickers)} activos...", False)
        
        # Create and execute worker
        self.portfolio_worker = PortfolioWorker(
            self.data_manager.current_data,
            self.tickers,
            rf_rate
        )
        self.portfolio_worker.progress.connect(lambda msg: self.set_message(msg, False))
        self.portfolio_worker.finished.connect(self._on_portfolio_ready)
        self.portfolio_worker.start()

    def _on_portfolio_ready(self, portfolio_data, error):
        """Callback when portfolio optimization finishes"""
        self._set_ui_enabled(True)
        
        if error:
            self.set_message(f"Error en optimización: {error}")
            return
        
        self.portfolio_data = portfolio_data
        
        # Display efficient frontier
        from plotting import generate_efficient_frontier_chart
        html_str = generate_efficient_frontier_chart(
            portfolio_data,
            self.tickers,
            self.background_image
        )
        
        self.webview.setHtml(html_str)
        
        # Show summary message
        opt_return = portfolio_data['optimal_return'] * 100
        opt_std = portfolio_data['optimal_std'] * 100
        opt_sharpe = portfolio_data['optimal_sharpe']
        
        msg = f"Cartera óptima: Retorno {opt_return:.2f}%, Riesgo {opt_std:.2f}%, Sharpe {opt_sharpe:.2f}"
        self.set_message(msg, False)

    def closeEvent(self, event):
        """Cleanup workers and data on close"""
        if self.data_worker and self.data_worker.isRunning():
            self.data_worker.terminate()
            self.data_worker.wait()
        if self.prediction_worker and self.prediction_worker.isRunning():
            self.prediction_worker.terminate()
            self.prediction_worker.wait()
        
        # Clean up all data before exit
        self.data_manager.clear_all()
        event.accept()

if __name__ == '__main__':
    app = QApplication(sys.argv)
    window = MultiStockApp()
    window.show()
    sys.exit(app.exec_())
