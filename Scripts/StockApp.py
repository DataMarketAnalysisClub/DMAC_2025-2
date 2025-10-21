import sys
import os
import pandas as pd
import datetime
import subprocess
import warnings
warnings.filterwarnings('ignore')

# Instalar dependencias si no están disponibles
try:
    import yfinance as yf
except ImportError:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'yfinance'])
    import yfinance as yf

try:
    import plotly.graph_objects as go
except ImportError:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'plotly'])
    import plotly.graph_objects as go

try:
    from statsmodels.tsa.arima.model import ARIMA
    from statsmodels.tools.sm_exceptions import ConvergenceWarning
except ImportError:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'statsmodels'])
    from statsmodels.tsa.arima.model import ARIMA
    from statsmodels.tools.sm_exceptions import ConvergenceWarning

# Intentar importar pmdarima, pero no es crítico
try:
    from pmdarima import auto_arima
    PMDARIMA_AVAILABLE = True
except (ImportError, ValueError) as e:
    PMDARIMA_AVAILABLE = False
    auto_arima = None

try:
    from PyQt5.QtWidgets import (QApplication, QWidget, QVBoxLayout, QHBoxLayout, 
                                 QLabel, QLineEdit, QPushButton, QComboBox, QCheckBox,
                                 QRadioButton, QButtonGroup, QGroupBox, QSpinBox)
    from PyQt5.QtWebEngineWidgets import QWebEngineView
    from PyQt5.QtCore import Qt
except ImportError:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'PyQt5', 'PyQtWebEngine'])
    from PyQt5.QtWidgets import (QApplication, QWidget, QVBoxLayout, QHBoxLayout, 
                                 QLabel, QLineEdit, QPushButton, QComboBox, QCheckBox,
                                 QRadioButton, QButtonGroup, QGroupBox, QSpinBox)
    from PyQt5.QtWebEngineWidgets import QWebEngineView
    from PyQt5.QtCore import Qt

import numpy as np
from sklearn.metrics import mean_squared_error, mean_absolute_error


class MultiStockApp(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle('Comparador de Tickers con Predicciones ARIMA')
        self.setGeometry(100, 100, 1200, 800)
        
        # Datos actuales para múltiples tickers
        self.current_data = {}
        self.tickers = []
        self.use_base100 = True
        self.predictions = {}  # Guardar predicciones por ticker
        
        # Esquemas de colores
        self.color_schemes = {
            'default': {
                'increasing': {'line': {'color': '#00FF00'}, 'fillcolor': 'rgba(0,255,0,0.5)'},
                'decreasing': {'line': {'color': '#FF0000'}, 'fillcolor': 'rgba(255,0,0,0.5)'}
            },
            'UDD': {
                'increasing': {'line': {'color': '#005293'}, 'fillcolor': 'rgba(65,123,171,1)'},
                'decreasing': {'line': {'color': '#6E7b8b'}, 'fillcolor': 'rgba(147,148,149,0.82)'}
            }
        }
        
        self.current_color_scheme = 'UDD'
        
        self.ticker_color_pairs = [
            {'increasing': {'line': {'color': '#005293'}, 'fillcolor': 'rgba(0, 82, 147, 0.5)'}, 
             'decreasing': {'line': {'color': '#6E7b8b'}, 'fillcolor': 'rgba(110, 123, 139, 0.5)'},
             'line_color': '#005293'},
            {'increasing': {'line': {'color': '#00A651'}, 'fillcolor': 'rgba(0, 166, 81, 0.5)'}, 
             'decreasing': {'line': {'color': '#E63946'}, 'fillcolor': 'rgba(230, 57, 70, 0.5)'},
             'line_color': '#00A651'},
            {'increasing': {'line': {'color': '#F26419'}, 'fillcolor': 'rgba(242, 100, 25, 0.5)'}, 
             'decreasing': {'line': {'color': '#662E9B'}, 'fillcolor': 'rgba(102, 46, 155, 0.5)'},
             'line_color': '#F26419'},
            {'increasing': {'line': {'color': '#1ABC9C'}, 'fillcolor': 'rgba(26, 188, 156, 0.5)'}, 
             'decreasing': {'line': {'color': '#8C4A2F'}, 'fillcolor': 'rgba(140, 74, 47, 0.5)'},
             'line_color': '#1ABC9C'},
            {'increasing': {'line': {'color': '#F4D03F'}, 'fillcolor': 'rgba(244, 208, 63, 0.5)'}, 
             'decreasing': {'line': {'color': '#34495E'}, 'fillcolor': 'rgba(52, 73, 94, 0.5)'},
             'line_color': '#F4D03F'},
            {'increasing': {'line': {'color': '#E91E63'}, 'fillcolor': 'rgba(233, 30, 99, 0.5)'}, 
             'decreasing': {'line': {'color': '#7D8E2E'}, 'fillcolor': 'rgba(125, 142, 46, 0.5)'},
             'line_color': '#E91E63'},
            {'increasing': {'line': {'color': '#03A9F4'}, 'fillcolor': 'rgba(3, 169, 244, 0.5)'}, 
             'decreasing': {'line': {'color': '#7D1935'}, 'fillcolor': 'rgba(125, 25, 53, 0.5)'},
             'line_color': '#03A9F4'},
            {'increasing': {'line': {'color': '#CDDC39'}, 'fillcolor': 'rgba(205, 220, 57, 0.5)'}, 
             'decreasing': {'line': {'color': '#1A237E'}, 'fillcolor': 'rgba(26, 35, 126, 0.5)'},
             'line_color': '#CDDC39'},
        ]
        
        # Colores para las bandas de confianza
        self.confidence_colors = [
            'rgba(0, 82, 147, 0.2)',
            'rgba(0, 166, 81, 0.2)',
            'rgba(242, 100, 25, 0.2)',
            'rgba(26, 188, 156, 0.2)',
            'rgba(244, 208, 63, 0.2)',
        ]
        
        # Layout principal
        self.main_layout = QVBoxLayout()
        self.setLayout(self.main_layout)
        
        # Pantalla inicial
        self.init_screen = QWidget()
        self.init_layout = QVBoxLayout()
        self.init_screen.setLayout(self.init_layout)
        
        self.init_label = QLabel('Bienvenido al Comparador de Tickers')
        self.init_label.setAlignment(Qt.AlignCenter)
        self.init_label.setStyleSheet('font-size: 24px; font-weight: bold;')
        self.init_layout.addWidget(self.init_label)
        
        info_label = QLabel('Compare acciones y prediga con ARIMA')
        info_label.setAlignment(Qt.AlignCenter)
        info_label.setStyleSheet('font-size: 14px; color: #666; margin: 10px;')
        self.init_layout.addWidget(info_label)
        
        self.start_button = QPushButton('Iniciar')
        self.start_button.setStyleSheet('font-size: 18px; padding: 10px;')
        self.start_button.clicked.connect(self.show_main_screen)
        self.init_layout.addWidget(self.start_button)
        
        self.exit_button = QPushButton('Cerrar')
        self.exit_button.setStyleSheet('font-size: 18px; padding: 10px;')
        self.exit_button.clicked.connect(self.close)
        self.init_layout.addWidget(self.exit_button)
        
        self.main_layout.addWidget(self.init_screen)
        
        # Pantalla principal
        self.main_screen = QWidget()
        self.main_layout_main_screen = QVBoxLayout()
        self.main_screen.setLayout(self.main_layout_main_screen)
        
        # Inputs principales
        input_layout = QHBoxLayout()
        self.main_layout_main_screen.addLayout(input_layout)
        
        self.ticker_label = QLabel('Tickers:')
        input_layout.addWidget(self.ticker_label)
        self.ticker_input = QLineEdit()
        self.ticker_input.setPlaceholderText('Ej: AAPL,MSFT,GOOGL')
        input_layout.addWidget(self.ticker_input)
        
        help_label = QLabel('(separados por comas)')
        help_label.setStyleSheet('font-size: 11px; color: #666; font-style: italic;')
        input_layout.addWidget(help_label)
        
        self.freq_label = QLabel('Frecuencia:')
        input_layout.addWidget(self.freq_label)
        self.freq_input = QComboBox()
        self.freq_input.addItems(['1d', '1wk', '1mo'])
        self.freq_input.setCurrentText('1wk')
        input_layout.addWidget(self.freq_input)
        
        self.period_label = QLabel('Periodo:')
        input_layout.addWidget(self.period_label)
        self.period_input = QComboBox()
        self.period_input.addItems(['1mo', '6mo', '1y', '2y', '5y'])
        self.period_input.setCurrentText('5y')
        input_layout.addWidget(self.period_input)
        
        # Segunda fila
        input_layout2 = QHBoxLayout()
        self.main_layout_main_screen.addLayout(input_layout2)
        
        self.color_label = QLabel('Colores:')
        input_layout2.addWidget(self.color_label)
        self.color_input = QComboBox()
        self.color_input.addItems(['Verde/Rojo (Clásico)', 'Colores Club'])
        self.color_input.setCurrentText('Colores Club')
        self.color_input.currentTextChanged.connect(self.change_color_scheme)
        input_layout2.addWidget(self.color_input)
        
        self.base100_checkbox = QCheckBox('Usar Base 100')
        self.base100_checkbox.setChecked(True)
        self.base100_checkbox.stateChanged.connect(self.toggle_base100)
        self.base100_checkbox.hide()
        input_layout2.addWidget(self.base100_checkbox)
        
        input_layout2.addStretch()
        
        self.btn = QPushButton('Ejecutar')
        self.btn.clicked.connect(self.ejecutar)
        self.btn.setStyleSheet('background-color: #4CAF50; color: white; padding: 8px 16px; font-weight: bold;')
        input_layout2.addWidget(self.btn)
        
        self.btn_download = QPushButton('Descargar CSV')
        self.btn_download.clicked.connect(self.descargar_csv)
        input_layout2.addWidget(self.btn_download)
        
        # Panel de predicciones ARIMA
        self.prediction_group = QGroupBox("Predicciones ARIMA")
        self.prediction_group.setStyleSheet('QGroupBox { font-weight: bold; padding: 10px; }')
        prediction_layout = QVBoxLayout()
        
        # Fila 1: Modo de ARIMA
        arima_mode_layout = QHBoxLayout()
        
        mode_label = QLabel('Modo:')
        arima_mode_layout.addWidget(mode_label)
        
        self.arima_button_group = QButtonGroup()
        self.auto_arima_radio = QRadioButton('Automático (recomendado)')
        self.manual_arima_radio = QRadioButton('Manual (avanzado)')
        self.auto_arima_radio.setChecked(True)
        
        self.arima_button_group.addButton(self.auto_arima_radio)
        self.arima_button_group.addButton(self.manual_arima_radio)
        
        arima_mode_layout.addWidget(self.auto_arima_radio)
        arima_mode_layout.addWidget(self.manual_arima_radio)
        
        self.auto_arima_radio.toggled.connect(self.toggle_arima_mode)
        
        arima_mode_layout.addStretch()
        prediction_layout.addLayout(arima_mode_layout)
        
        # Fila 2: Parámetros manuales (ocultos por defecto)
        manual_params_layout = QHBoxLayout()
        
        self.p_label = QLabel('p:')
        manual_params_layout.addWidget(self.p_label)
        self.p_input = QSpinBox()
        self.p_input.setRange(0, 5)
        self.p_input.setValue(1)
        manual_params_layout.addWidget(self.p_input)
        
        self.d_label = QLabel('d:')
        manual_params_layout.addWidget(self.d_label)
        self.d_input = QSpinBox()
        self.d_input.setRange(0, 2)
        self.d_input.setValue(1)
        manual_params_layout.addWidget(self.d_input)
        
        self.q_label = QLabel('q:')
        manual_params_layout.addWidget(self.q_label)
        self.q_input = QSpinBox()
        self.q_input.setRange(0, 5)
        self.q_input.setValue(1)
        manual_params_layout.addWidget(self.q_input)
        
        # Ocultar por defecto
        self.p_label.hide()
        self.p_input.hide()
        self.d_label.hide()
        self.d_input.hide()
        self.q_label.hide()
        self.q_input.hide()
        
        manual_params_layout.addStretch()
        prediction_layout.addLayout(manual_params_layout)
        
        # Fila 3: Horizonte, intervalo de confianza y botón
        horizon_layout = QHBoxLayout()
        
        horizon_label = QLabel('Horizonte:')
        horizon_layout.addWidget(horizon_label)
        
        self.horizon_input = QComboBox()
        self.horizon_input.addItems(['7 días', '14 días', '30 días', '60 días', '90 días'])
        self.horizon_input.setCurrentText('30 días')
        horizon_layout.addWidget(self.horizon_input)
        
        # Checkbox para bandas de confianza
        self.confidence_checkbox = QCheckBox('Mostrar intervalo 95%')
        self.confidence_checkbox.setChecked(True)
        self.confidence_checkbox.stateChanged.connect(self.toggle_confidence_bands)
        horizon_layout.addWidget(self.confidence_checkbox)
        
        horizon_layout.addStretch()
        
        self.btn_predict = QPushButton('Generar Predicción')
        self.btn_predict.setStyleSheet('background-color: #2196F3; color: white; padding: 8px 16px; font-weight: bold;')
        self.btn_predict.clicked.connect(self.generar_prediccion)
        horizon_layout.addWidget(self.btn_predict)
        
        prediction_layout.addLayout(horizon_layout)
        
        # Advertencia
        warning_label = QLabel('⚠️ Las predicciones son estimaciones estadísticas y no garantías de rendimiento futuro.')
        warning_label.setStyleSheet('color: #FF9800; font-size: 11px; font-style: italic;')
        prediction_layout.addWidget(warning_label)
        
        self.prediction_group.setLayout(prediction_layout)
        self.main_layout_main_screen.addWidget(self.prediction_group)
        
        # Mensaje de info sobre Base 100
        self.info_label = QLabel()
        self.info_label.setStyleSheet('background-color: #f2f9ff; border: 1px solid #d0e3ff; '
                                     'border-radius: 4px; padding: 10px; font-size: 12px;')
        self.info_label.hide()
        self.main_layout_main_screen.addWidget(self.info_label)
        
        # Mensajes
        self.message_label = QLabel('')
        self.main_layout_main_screen.addWidget(self.message_label)
        
        # Web view para mostrar el gráfico
        self.webview = QWebEngineView()
        self.main_layout_main_screen.addWidget(self.webview)
        self.webview.setHtml("<h2>Ingrese uno o más tickers y presione 'Ejecutar'</h2>")
        
        # Botón para volver
        self.back_button = QPushButton('Volver')
        self.back_button.setStyleSheet('font-size: 18px; padding: 10px;')
        self.back_button.clicked.connect(self.show_init_screen)
        self.main_layout_main_screen.addWidget(self.back_button)
        
        self.main_screen.hide()
        self.main_layout.addWidget(self.main_screen)
    
    def auto_arima_grid_search(self, train_data, max_p=3, max_d=2, max_q=3):
        """
        Búsqueda automática de parámetros ARIMA usando grid search con statsmodels.
        Alternativa a pmdarima cuando no está disponible.
        """
        best_aic = np.inf
        best_order = None
        best_model = None
        
        # Grid search sobre diferentes combinaciones
        for p in range(max_p + 1):
            for d in range(max_d + 1):
                for q in range(max_q + 1):
                    try:
                        # Evitar combinaciones triviales
                        if p == 0 and d == 0 and q == 0:
                            continue
                        
                        model = ARIMA(train_data, order=(p, d, q))
                        with warnings.catch_warnings():
                            warnings.filterwarnings("ignore")
                            fitted = model.fit()
                        
                        if fitted.aic < best_aic:
                            best_aic = fitted.aic
                            best_order = (p, d, q)
                            best_model = fitted
                    
                    except Exception:
                        continue
        
        if best_order is None:
            # Fallback a un modelo simple
            best_order = (1, 1, 1)
        
        return best_order
    
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
        if self.current_data and len(self.tickers) > 1:
            self.create_chart()
            scale_type = 'Base 100' if self.use_base100 else 'Valores absolutos'
            self.set_message(f'Escala cambiada a {scale_type}', False)
    
    def toggle_arima_mode(self):
        is_manual = self.manual_arima_radio.isChecked()
        
        # Mostrar/ocultar campos manuales
        self.p_label.setVisible(is_manual)
        self.p_input.setVisible(is_manual)
        self.d_label.setVisible(is_manual)
        self.d_input.setVisible(is_manual)
        self.q_label.setVisible(is_manual)
        self.q_input.setVisible(is_manual)
    
    def toggle_confidence_bands(self):
        if self.predictions:
            self.create_chart()
    
    def change_color_scheme(self, scheme_name):
        if scheme_name == 'Verde/Rojo (Clásico)':
            self.current_color_scheme = 'default'
        else:
            self.current_color_scheme = 'UDD'
        
        if self.current_data and self.tickers:
            self.create_chart()
            self.set_message(f'Esquema de colores cambiado', False)
    
    def ejecutar(self):
        ticker_input = self.ticker_input.text().strip().upper()
        periodo = self.period_input.currentText()
        frecuencia = self.freq_input.currentText()
        
        tickers = [t.strip() for t in ticker_input.split(',') if t.strip()]
        
        if not tickers:
            self.set_message("Debe ingresar al menos un ticker.")
            return
        
        # Limpiar predicciones anteriores
        self.predictions = {}
        
        # Mostrar/ocultar opciones según cantidad de tickers
        if len(tickers) > 1:
            self.base100_checkbox.show()
            self.info_label.setText('<b>Base 100:</b> Todos los tickers se normalizan tomando '
                                   'el primer día como valor 100, facilitando la comparación '
                                   'de rendimiento porcentual.')
            self.info_label.show()
        else:
            self.base100_checkbox.hide()
            self.info_label.hide()
        
        self.set_message(f'Cargando datos para {len(tickers)} ticker(s)...', False)
        QApplication.processEvents()
        
        try:
            self.current_data = {}
            self.tickers = []
            
            for ticker in tickers:
                try:
                    df = yf.download(ticker, period=periodo, interval=frecuencia, progress=False)
                    
                    if df.empty:
                        self.set_message(f"No se obtuvieron datos para '{ticker}'. Continuando...")
                        continue
                    
                    if isinstance(df.columns, pd.MultiIndex):
                        df.columns = df.columns.droplevel(1)
                    
                    df = df[['Open', 'High', 'Low', 'Close']].dropna()
                    
                    if not df.empty:
                        self.current_data[ticker] = df
                        self.tickers.append(ticker)
                
                except Exception as e:
                    self.set_message(f"Error con '{ticker}': {e}. Continuando...")
                    continue
            
            if not self.current_data:
                self.set_message("No se obtuvieron datos para ningún ticker.")
                self.webview.setHtml("<h2>No se encontraron datos</h2>")
                return
            
            self.create_chart()
            self.set_message(f"Gráfico generado correctamente para {len(self.tickers)} ticker(s).", False)
        
        except Exception as e:
            self.set_message(f"Error: {e}")
            self.webview.setHtml("")
    
    def generar_prediccion(self):
        if not self.current_data or not self.tickers:
            self.set_message("Primero debe cargar datos de tickers.")
            return
        
        # Obtener horizonte
        horizon_text = self.horizon_input.currentText()
        horizon = int(horizon_text.split()[0])
        
        self.set_message(f"Generando predicciones para {len(self.tickers)} ticker(s)... Esto puede tomar unos minutos.", False)
        QApplication.processEvents()
        
        self.predictions = {}
        errors = []
        
        for ticker in self.tickers:
            try:
                df = self.current_data[ticker]
                close_prices = df['Close'].values
                
                print(f"\n=== Procesando {ticker} ===")
                print(f"Datos disponibles: {len(close_prices)} puntos")
                
                # Dividir en train/test (últimos 20% para test)
                train_size = int(len(close_prices) * 0.8)
                train, test = close_prices[:train_size], close_prices[train_size:]
                
                print(f"Train: {len(train)}, Test: {len(test)}")
                
                if self.auto_arima_radio.isChecked():
                    # Modo automático - usar pmdarima si está disponible, sino grid search
                    self.set_message(f"Buscando mejor modelo ARIMA para {ticker}...", False)
                    QApplication.processEvents()
                    
                    if PMDARIMA_AVAILABLE:
                        try:
                            print("Usando pmdarima...")
                            model_fit = auto_arima(train, 
                                                  seasonal=False,
                                                  stepwise=True,
                                                  suppress_warnings=True,
                                                  error_action='ignore',
                                                  max_p=5, max_q=5, max_d=2,
                                                  trace=False)
                            order = model_fit.order
                            print(f"Orden encontrado con pmdarima: {order}")
                        except Exception as e:
                            print(f"Error con pmdarima: {e}")
                            self.set_message(f"pmdarima falló, usando grid search...", False)
                            QApplication.processEvents()
                            order = self.auto_arima_grid_search(train)
                            print(f"Orden encontrado con grid search: {order}")
                    else:
                        print("pmdarima no disponible, usando grid search...")
                        # Usar grid search propio
                        order = self.auto_arima_grid_search(train)
                        print(f"Orden encontrado con grid search: {order}")
                    
                    # Re-entrenar con todos los datos
                    print(f"Entrenando modelo ARIMA{order} con todos los datos...")
                    final_model = ARIMA(close_prices, order=order)
                    with warnings.catch_warnings():
                        warnings.filterwarnings("ignore")
                        final_fit = final_model.fit()
                    print("Modelo entrenado exitosamente")
                    
                else:
                    # Modo manual
                    p = self.p_input.value()
                    d = self.d_input.value()
                    q = self.q_input.value()
                    order = (p, d, q)
                    
                    print(f"Usando parámetros manuales: ARIMA{order}")
                    with warnings.catch_warnings():
                        warnings.filterwarnings("ignore")
                        final_fit = ARIMA(close_prices, order=order).fit()
                    print("Modelo entrenado exitosamente")
                
                # Generar predicciones con intervalo de confianza
                print(f"Generando {horizon} predicciones...")
                forecast_result = final_fit.get_forecast(steps=horizon)
                forecast = forecast_result.predicted_mean
                forecast_ci = forecast_result.conf_int(alpha=0.05)  # 95% de confianza
                
                # Manejar forecast_ci como array o DataFrame
                if isinstance(forecast_ci, pd.DataFrame):
                    lower_bound = forecast_ci.iloc[:, 0].values
                    upper_bound = forecast_ci.iloc[:, 1].values
                elif isinstance(forecast_ci, np.ndarray):
                    lower_bound = forecast_ci[:, 0]
                    upper_bound = forecast_ci[:, 1]
                else:
                    # Fallback: usar predicción +/- 10%
                    lower_bound = forecast * 0.9
                    upper_bound = forecast * 1.1
                
                print(f"Predicciones generadas: {len(forecast)} valores")
                print(f"Primera predicción: {forecast[0]:.2f}, Última: {forecast[-1]:.2f}")
                print(f"IC 95%: [{lower_bound[0]:.2f}, {upper_bound[0]:.2f}]")
                
                # Calcular métricas en datos de test
                if len(test) > 0:
                    print("Calculando métricas en conjunto de test...")
                    test_predictions = final_fit.forecast(steps=len(test))
                    rmse = np.sqrt(mean_squared_error(test, test_predictions))
                    mae = mean_absolute_error(test, test_predictions)
                    print(f"RMSE: {rmse:.2f}, MAE: {mae:.2f}")
                else:
                    rmse, mae = None, None
                    print("No hay conjunto de test suficiente para métricas")
                
                # Generar fechas futuras
                last_date = df.index[-1]
                freq_map = {'1d': 'D', '1wk': 'W', '1mo': 'M'}
                freq_str = freq_map.get(self.freq_input.currentText(), 'D')
                
                future_dates = pd.date_range(start=last_date, periods=horizon+1, freq=freq_str)[1:]
                print(f"Fechas generadas: desde {future_dates[0]} hasta {future_dates[-1]}")
                
                self.predictions[ticker] = {
                    'forecast': forecast,
                    'dates': future_dates,
                    'order': order,
                    'rmse': rmse,
                    'mae': mae,
                    'lower_bound': lower_bound,
                    'upper_bound': upper_bound
                }
                
                print(f"✓ Predicción completada para {ticker}")
                
            except Exception as e:
                error_msg = f"Error al predecir {ticker}: {str(e)}"
                print(f"✗ {error_msg}")
                import traceback
                traceback.print_exc()
                errors.append(error_msg)
                continue
        
        if self.predictions:
            self.create_chart()
            msg = f"Predicciones generadas exitosamente para {len(self.predictions)} ticker(s)."
            if errors:
                msg += f" ({len(errors)} fallaron)"
            self.set_message(msg, False)
        else:
            error_detail = "\n".join(errors) if errors else "Error desconocido"
            self.set_message(f"No se pudieron generar predicciones. Errores: {error_detail}")
            print(f"\n=== RESUMEN DE ERRORES ===")
            for err in errors:
                print(f"  - {err}")
    
    def create_chart(self):
        if not self.current_data or not self.tickers:
            return
        
        traces = []
        
        use_base100 = len(self.tickers) > 1 and self.use_base100
        show_confidence = self.confidence_checkbox.isChecked()
        
        first_values = {}
        if use_base100:
            for ticker in self.tickers:
                df = self.current_data[ticker]
                first_values[ticker] = df['Close'].iloc[0]
        
        # Crear trazas de datos históricos
        for idx, ticker in enumerate(self.tickers):
            df = self.current_data[ticker]
            
            if use_base100 and ticker in first_values:
                base = first_values[ticker]
                open_vals = (df['Open'] / base * 100).tolist()
                high_vals = (df['High'] / base * 100).tolist()
                low_vals = (df['Low'] / base * 100).tolist()
                close_vals = (df['Close'] / base * 100).tolist()
            else:
                open_vals = df['Open'].tolist()
                high_vals = df['High'].tolist()
                low_vals = df['Low'].tolist()
                close_vals = df['Close'].tolist()
            
            if len(self.tickers) > 1:
                colors = self.ticker_color_pairs[idx % len(self.ticker_color_pairs)]
            else:
                colors = self.color_schemes[self.current_color_scheme]
            
            trace = go.Candlestick(
                x=df.index,
                open=open_vals,
                high=high_vals,
                low=low_vals,
                close=close_vals,
                name=ticker,
                increasing=colors['increasing'],
                decreasing=colors['decreasing'],
                legendgroup=ticker
            )
            traces.append(trace)
            
            # Agregar predicciones si existen
            if ticker in self.predictions:
                pred_data = self.predictions[ticker]
                forecast_vals = pred_data['forecast'].copy()
                lower_vals = pred_data['lower_bound'].copy()
                upper_vals = pred_data['upper_bound'].copy()
                
                if use_base100 and ticker in first_values:
                    base = first_values[ticker]
                    forecast_vals = forecast_vals / base * 100
                    lower_vals = lower_vals / base * 100
                    upper_vals = upper_vals / base * 100
                
                # Línea de predicción
                pred_trace = go.Scatter(
                    x=pred_data['dates'],
                    y=forecast_vals,
                    mode='lines',
                    name=f'{ticker} Predicción',
                    line=dict(
                        dash='dash', 
                        width=2,
                        color=self.ticker_color_pairs[idx % len(self.ticker_color_pairs)]['line_color'] if len(self.tickers) > 1 else '#2196F3'
                    ),
                    legendgroup=ticker,
                    showlegend=True
                )
                traces.append(pred_trace)
                
                # Bandas de confianza
                if show_confidence:
                    # Banda superior
                    upper_trace = go.Scatter(
                        x=pred_data['dates'],
                        y=upper_vals,
                        mode='lines',
                        line=dict(width=0),
                        showlegend=False,
                        legendgroup=ticker,
                        hoverinfo='skip'
                    )
                    traces.append(upper_trace)
                    
                    # Banda inferior con relleno
                    lower_trace = go.Scatter(
                        x=pred_data['dates'],
                        y=lower_vals,
                        mode='lines',
                        line=dict(width=0),
                        fillcolor=self.confidence_colors[idx % len(self.confidence_colors)],
                        fill='tonexty',
                        name=f'{ticker} IC 95%',
                        legendgroup=ticker,
                        showlegend=True
                    )
                    traces.append(lower_trace)
        
        # Título dinámico
        if len(self.tickers) == 1:
            title = f'Gráfico de velas japonesas para {self.tickers[0]}'
        else:
            scale_type = '(Base 100)' if use_base100 else '(Valores absolutos)'
            title = f'Gráfico comparativo {scale_type}: {", ".join(self.tickers)}'
        
        # Crear anotaciones con métricas
        annotations = []
        if self.predictions:
            y_position = 0.98
            for ticker in self.tickers:
                if ticker in self.predictions:
                    pred_data = self.predictions[ticker]
                    order = pred_data['order']
                    rmse = pred_data['rmse']
                    mae = pred_data['mae']
                    
                    metrics_text = f"<b>{ticker}</b><br>"
                    metrics_text += f"ARIMA{order}<br>"
                    if rmse is not None:
                        metrics_text += f"RMSE: {rmse:.2f}<br>"
                        metrics_text += f"MAE: {mae:.2f}"
                    
                    annotations.append(
                        dict(
                            x=1.02,
                            y=y_position,
                            xref='paper',
                            yref='paper',
                            text=metrics_text,
                            showarrow=False,
                            align='left',
                            bgcolor='rgba(255, 255, 255, 0.9)',
                            bordercolor='#cccccc',
                            borderwidth=1,
                            borderpad=5,
                            font=dict(size=10)
                        )
                    )
                    y_position -= 0.15
        
        # Layout
        fig = go.Figure(data=traces)
        fig.update_layout(
            title=title,
            xaxis_title='Fecha',
            yaxis_title='Precio (Base 100)' if use_base100 else 'Precio',
            xaxis_rangeslider_visible=False,
            showlegend=True,
            legend=dict(x=0, y=1, orientation='h'),
            height=550,
            annotations=annotations,
            margin=dict(r=150)  # Espacio para las métricas
        )
        
        html_str = fig.to_html(include_plotlyjs='cdn')
        self.webview.setHtml(html_str)
    
    def descargar_csv(self):
        if not self.current_data or not self.tickers:
            self.set_message("No hay datos para descargar. Primero ejecute una consulta válida.")
            return
        
        downloads_path = os.path.join(os.path.expanduser("~"), "Downloads")
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        
        try:
            if len(self.tickers) == 1:
                ticker = self.tickers[0]
                df = self.current_data[ticker]
                
                # Agregar predicciones si existen
                if ticker in self.predictions:
                    pred_data = self.predictions[ticker]
                    pred_df = pd.DataFrame({
                        'Close': pred_data['forecast'],
                        'Lower_95': pred_data['lower_bound'],
                        'Upper_95': pred_data['upper_bound']
                    }, index=pred_data['dates'])
                    pred_df['Open'] = pred_df['Close']
                    pred_df['High'] = pred_df['Upper_95']
                    pred_df['Low'] = pred_df['Lower_95']
                    pred_df['Prediccion'] = True
                    
                    df_copy = df.copy()
                    df_copy['Prediccion'] = False
                    df_copy['Lower_95'] = ''
                    df_copy['Upper_95'] = ''
                    
                    combined_df = pd.concat([df_copy, pred_df])
                    filename = f"{ticker}_data_con_prediccion_{timestamp}.csv"
                    filepath = os.path.join(downloads_path, filename)
                    combined_df.to_csv(filepath)
                else:
                    filename = f"{ticker}_data_{timestamp}.csv"
                    filepath = os.path.join(downloads_path, filename)
                    df.to_csv(filepath)
            else:
                all_dates = set()
                for df in self.current_data.values():
                    all_dates.update(df.index)
                
                # Agregar fechas de predicciones
                for ticker in self.tickers:
                    if ticker in self.predictions:
                        all_dates.update(self.predictions[ticker]['dates'])
                
                all_dates = sorted(all_dates)
                
                columns = ['Fecha']
                for ticker in self.tickers:
                    columns.extend([f'{ticker}_Apertura', f'{ticker}_Máximo', 
                                  f'{ticker}_Mínimo', f'{ticker}_Cierre', 
                                  f'{ticker}_Prediccion', f'{ticker}_IC95_Inferior', 
                                  f'{ticker}_IC95_Superior'])
                
                rows = []
                for date in all_dates:
                    row = [date.strftime('%Y-%m-%d')]
                    for ticker in self.tickers:
                        df = self.current_data[ticker]
                        
                        # Datos históricos
                        if date in df.index:
                            row.extend([df.loc[date, 'Open'], df.loc[date, 'High'],
                                      df.loc[date, 'Low'], df.loc[date, 'Close'], 
                                      'No', '', ''])
                        # Predicciones
                        elif ticker in self.predictions and date in self.predictions[ticker]['dates']:
                            pred_idx = list(self.predictions[ticker]['dates']).index(date)
                            pred_val = self.predictions[ticker]['forecast'][pred_idx]
                            lower_val = self.predictions[ticker]['lower_bound'][pred_idx]
                            upper_val = self.predictions[ticker]['upper_bound'][pred_idx]
                            row.extend([pred_val, upper_val, lower_val, pred_val, 
                                      'Sí', lower_val, upper_val])
                        else:
                            row.extend(['', '', '', '', '', '', ''])
                    rows.append(row)
                
                result_df = pd.DataFrame(rows, columns=columns)
                filename = f"multiple_tickers_con_prediccion_{timestamp}.csv"
                filepath = os.path.join(downloads_path, filename)
                result_df.to_csv(filepath, index=False)
            
            self.set_message(f"Datos guardados en '{filename}'", False)
        
        except Exception as e:
            self.set_message(f"Error al guardar CSV: {e}")


if __name__ == '__main__':
    app = QApplication(sys.argv)
    window = MultiStockApp()
    window.show()
    sys.exit(app.exec_())
