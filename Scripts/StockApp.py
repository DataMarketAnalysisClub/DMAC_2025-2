# Ejemplo de app con PyQt5 y Plotly, mostrando el gráfico HTML embebido
import sys
import os
import pandas as pd
import datetime

# Instalar yfinance si no está disponible
try:
    import yfinance as yf
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'yfinance'])
    import yfinance as yf

# Instalar plotly si no está disponible
try:
    import plotly.graph_objects as go
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'plotly'])
    import plotly.graph_objects as go

# Instalar PyQt5 si no está disponible
try:
    from PyQt5.QtWidgets import QApplication, QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit, QPushButton
    from PyQt5.QtWebEngineWidgets import QWebEngineView
    from PyQt5.QtCore import QUrl, Qt
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'PyQt5', 'PyQtWebEngine'])
    from PyQt5.QtWidgets import QApplication, QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit, QPushButton
    from PyQt5.QtWebEngineWidgets import QWebEngineView
    from PyQt5.QtCore import QUrl, Qt

class StockApp(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle('Gráficos Ticker (Plotly + PyQt5)')
        self.setGeometry(100, 100, 900, 600)

        # Layout principal
        self.main_layout = QVBoxLayout()
        self.setLayout(self.main_layout)

        # Pantalla inicial
        self.init_screen = QWidget()
        self.init_layout = QVBoxLayout()
        self.init_screen.setLayout(self.init_layout)

        self.init_label = QLabel('Bienvenido a la App de Gráficos Ticker')
        self.init_label.setAlignment(Qt.AlignCenter)
        self.init_label.setStyleSheet('font-size: 24px; font-weight: bold;')
        self.init_layout.addWidget(self.init_label)

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

        self.ticker_label = QLabel('Ticker:')
        input_layout.addWidget(self.ticker_label)
        self.ticker_input = QLineEdit()
        input_layout.addWidget(self.ticker_input)

        self.freq_label = QLabel('Frecuencia:')
        input_layout.addWidget(self.freq_label)
        self.freq_input = QLineEdit()
        self.freq_input.setText('1wk')
        input_layout.addWidget(self.freq_input)

        self.period_label = QLabel('Periodo:')
        input_layout.addWidget(self.period_label)
        self.period_input = QLineEdit()
        self.period_input.setText('5y')
        input_layout.addWidget(self.period_input)

        self.btn = QPushButton('Ejecutar')
        self.btn.clicked.connect(self.ejecutar)
        input_layout.addWidget(self.btn)

        self.btn_download = QPushButton('Descargar CSV')
        self.btn_download.clicked.connect(self.descargar_csv)
        input_layout.addWidget(self.btn_download)

        # Mensajes
        self.message_label = QLabel('')
        self.main_layout_main_screen.addWidget(self.message_label)

        # Web view para mostrar el gráfico
        self.webview = QWebEngineView()
        self.main_layout_main_screen.addWidget(self.webview)
        self.webview.setHtml("<h2>Ingrese un ticker y presione 'Ejecutar'</h2>")

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

    def set_message(self, msg):
        self.message_label.setText(msg)

    def ejecutar(self):
        ticker = self.ticker_input.text().strip()
        periodo = self.period_input.text().strip() or '5y'
        frecuencia = self.freq_input.text().strip() or '1wk'
        valid_intervals = ['1d', '1wk', '1mo']
        if not ticker:
            self.set_message("Debe ingresar un ticker.")
            return
        if frecuencia not in valid_intervals:
            self.set_message(f"Frecuencia '{frecuencia}' no válida. Opciones: {valid_intervals}")
            self.webview.setHtml("")
            return
        try:
            df = yf.download(ticker, period=periodo, interval=frecuencia, progress=False)
            if df.empty:
                self.set_message(f"No se obtuvieron datos para el ticker '{ticker}'.")
                self.webview.setHtml("")
                return
            df.columns = df.columns.droplevel(1)  # Elimina el nivel del ticker en las columnas
            df = df[['Open', 'High', 'Low', 'Close']].dropna()  # Selecciona las columnas necesarias
            self.df_actual = df
            fig = go.Figure(data=[
                go.Candlestick(
                    x=df.index,
                    open=df['Open'],
                    high=df['High'],
                    low=df['Low'],
                    close=df['Close'],
                    name='Precio')
            ])
            fig.update_layout(
                title=f'Gráfico de velas japonesas para {ticker}',
                xaxis_title='Fecha',
                yaxis_title='Precio',
                xaxis_rangeslider_visible=False
            )
            html_str = fig.to_html(include_plotlyjs='cdn')
            self.webview.setHtml(html_str)
            self.set_message("Gráfico generado correctamente.")
        except Exception as e:
            self.set_message(f"Error: {e}")
            self.webview.setHtml("")

    def descargar_csv(self):
        if self.df_actual is None or self.df_actual.empty:
            self.set_message("No hay datos para descargar. Primero ejecute una consulta válida.")
            return
        ticker = self.ticker_input.text().strip()
        filename = f"{ticker}_data_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        downloads_path = os.path.join(os.path.expanduser("~"), "Downloads")
        try:
            self.df_actual.to_csv(os.path.join(downloads_path, filename), index=True)
            self.set_message(f"Datos guardados en '{os.path.abspath(os.path.join(downloads_path, filename))}'")
        except Exception as e:
            self.set_message(f"Error al guardar CSV: {e}")

if __name__ == '__main__':
    app = QApplication(sys.argv)
    window = StockApp()
    window.show()
    sys.exit(app.exec_())