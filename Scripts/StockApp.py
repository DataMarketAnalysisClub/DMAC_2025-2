import sys
import os
import pandas as pd
import datetime
import subprocess

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
    from PyQt5.QtWidgets import (QApplication, QWidget, QVBoxLayout, QHBoxLayout, 
                                 QLabel, QLineEdit, QPushButton, QComboBox, QCheckBox)
    from PyQt5.QtWebEngineWidgets import QWebEngineView
    from PyQt5.QtCore import Qt
except ImportError:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'PyQt5', 'PyQtWebEngine'])
    from PyQt5.QtWidgets import (QApplication, QWidget, QVBoxLayout, QHBoxLayout, 
                                 QLabel, QLineEdit, QPushButton, QComboBox, QCheckBox)
    from PyQt5.QtWebEngineWidgets import QWebEngineView
    from PyQt5.QtCore import Qt


class MultiStockApp(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle('Comparador de Tickers (Plotly + PyQt5)')
        self.setGeometry(100, 100, 1100, 700)
        
        # Datos actuales para múltiples tickers
        self.current_data = {}
        self.tickers = []
        self.use_base100 = True  # Por defecto usar Base 100
        
        # Esquemas de colores para múltiples tickers
        self.color_schemes = {
            'default': {
                'increasing': {'line': {'color': 'rgba(0,255,0,1)'}, 'fillcolor': 'rgba(0,255,0,0.5)'},
                'decreasing': {'line': {'color': 'rgba(255,0,0,1)'}, 'fillcolor': 'rgba(255,0,0,0.5)'}
            },
            'UDD': {
                'increasing': {'line': {'color': '#005293'}, 'fillcolor': '#417babff'},
                'decreasing': {'line': {'color': '#6E7b8b'}, 'fillcolor': '#939495d2'}
            }
        }
        
        self.current_color_scheme = 'UDD'
        
        # Pares de colores para cada ticker
        self.ticker_color_pairs = [
            {'increasing': {'line': {'color': '#005293'}, 'fillcolor': 'rgba(0, 82, 147, 0.5)'}, 
             'decreasing': {'line': {'color': '#6E7b8b'}, 'fillcolor': 'rgba(110, 123, 139, 0.5)'}},
            {'increasing': {'line': {'color': '#00A651'}, 'fillcolor': 'rgba(0, 166, 81, 0.5)'}, 
             'decreasing': {'line': {'color': '#E63946'}, 'fillcolor': 'rgba(230, 57, 70, 0.5)'}},
            {'increasing': {'line': {'color': '#F26419'}, 'fillcolor': 'rgba(242, 100, 25, 0.5)'}, 
             'decreasing': {'line': {'color': '#662E9B'}, 'fillcolor': 'rgba(102, 46, 155, 0.5)'}},
            {'increasing': {'line': {'color': '#1ABC9C'}, 'fillcolor': 'rgba(26, 188, 156, 0.5)'}, 
             'decreasing': {'line': {'color': '#8C4A2F'}, 'fillcolor': 'rgba(140, 74, 47, 0.5)'}},
            {'increasing': {'line': {'color': '#F4D03F'}, 'fillcolor': 'rgba(244, 208, 63, 0.5)'}, 
             'decreasing': {'line': {'color': '#34495E'}, 'fillcolor': 'rgba(52, 73, 94, 0.5)'}},
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
        
        info_label = QLabel('Compare hasta 5 acciones simultáneamente')
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
        
        # Inputs
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
        
        # Segunda fila de inputs
        input_layout2 = QHBoxLayout()
        self.main_layout_main_screen.addLayout(input_layout2)
        
        self.color_label = QLabel('Colores:')
        input_layout2.addWidget(self.color_label)
        self.color_input = QComboBox()
        self.color_input.addItems(['Verde/Rojo (Clásico)', 'Colores Club'])
        self.color_input.setCurrentText('Colores Club')
        self.color_input.currentTextChanged.connect(self.change_color_scheme)
        input_layout2.addWidget(self.color_input)
        
        # Checkbox para Base 100
        self.base100_checkbox = QCheckBox('Usar Base 100')
        self.base100_checkbox.setChecked(True)
        self.base100_checkbox.stateChanged.connect(self.toggle_base100)
        self.base100_checkbox.hide()  # Oculto por defecto, se muestra con múltiples tickers
        input_layout2.addWidget(self.base100_checkbox)
        
        input_layout2.addStretch()
        
        self.btn = QPushButton('Ejecutar')
        self.btn.clicked.connect(self.ejecutar)
        input_layout2.addWidget(self.btn)
        
        self.btn_download = QPushButton('Descargar CSV')
        self.btn_download.clicked.connect(self.descargar_csv)
        input_layout2.addWidget(self.btn_download)
        
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
        
        # Dividir por comas y limpiar
        tickers = [t.strip() for t in ticker_input.split(',') if t.strip()]
        
        if not tickers:
            self.set_message("Debe ingresar al menos un ticker.")
            return
        
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
            # Limpiar datos anteriores
            self.current_data = {}
            self.tickers = []
            
            # Obtener datos para cada ticker
            for ticker in tickers:
                try:
                    df = yf.download(ticker, period=periodo, interval=frecuencia, progress=False)
                    
                    if df.empty:
                        self.set_message(f"No se obtuvieron datos para '{ticker}'. Continuando...")
                        continue
                    
                    # Limpiar columnas si es necesario
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
            
            # Crear gráfico
            self.create_chart()
            self.set_message(f"Gráfico generado correctamente para {len(self.tickers)} ticker(s).", False)
        
        except Exception as e:
            self.set_message(f"Error: {e}")
            self.webview.setHtml("")
    
    def create_chart(self):
        if not self.current_data or not self.tickers:
            return
        
        # Crear trazas para cada ticker
        traces = []
        
        # Determinar si usar Base 100
        use_base100 = len(self.tickers) > 1 and self.use_base100
        
        # Obtener valores base para normalización
        first_values = {}
        if use_base100:
            for ticker in self.tickers:
                df = self.current_data[ticker]
                first_values[ticker] = df['Close'].iloc[0]
        
        # Crear traza para cada ticker
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
            
            # Seleccionar colores
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
                decreasing=colors['decreasing']
            )
            traces.append(trace)
        
        # Título dinámico
        if len(self.tickers) == 1:
            title = f'Gráfico de velas japonesas para {self.tickers[0]}'
        else:
            scale_type = '(Base 100)' if use_base100 else '(Valores absolutos)'
            title = f'Gráfico comparativo {scale_type}: {", ".join(self.tickers)}'
        
        # Layout
        fig = go.Figure(data=traces)
        fig.update_layout(
            title=title,
            xaxis_title='Fecha',
            yaxis_title='Precio (Base 100)' if use_base100 else 'Precio',
            xaxis_rangeslider_visible=False,
            showlegend=len(self.tickers) > 1,
            legend=dict(x=0, y=1, orientation='h'),
            height=500
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
                # CSV simple para un ticker
                ticker = self.tickers[0]
                df = self.current_data[ticker]
                filename = f"{ticker}_data_{timestamp}.csv"
                filepath = os.path.join(downloads_path, filename)
                df.to_csv(filepath)
            else:
                # CSV combinado para múltiples tickers
                # Crear DataFrame con todas las fechas
                all_dates = set()
                for df in self.current_data.values():
                    all_dates.update(df.index)
                all_dates = sorted(all_dates)
                
                # Crear columnas
                columns = ['Fecha']
                for ticker in self.tickers:
                    columns.extend([f'{ticker}_Apertura', f'{ticker}_Máximo', 
                                  f'{ticker}_Mínimo', f'{ticker}_Cierre'])
                
                # Crear filas
                rows = []
                for date in all_dates:
                    row = [date.strftime('%Y-%m-%d')]
                    for ticker in self.tickers:
                        df = self.current_data[ticker]
                        if date in df.index:
                            row.extend([df.loc[date, 'Open'], df.loc[date, 'High'],
                                      df.loc[date, 'Low'], df.loc[date, 'Close']])
                        else:
                            row.extend(['', '', '', ''])
                    rows.append(row)
                
                # Crear DataFrame y guardar
                result_df = pd.DataFrame(rows, columns=columns)
                filename = f"multiple_tickers_data_{timestamp}.csv"
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
