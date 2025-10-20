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
    from PyQt5.QtCore import QUrl
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'PyQt5', 'PyQtWebEngine'])
    from PyQt5.QtWidgets import QApplication, QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit, QPushButton
    from PyQt5.QtWebEngineWidgets import QWebEngineView

class StockApp(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle('Gráficos Ticker (Plotly + PyQt5)')
        self.setGeometry(100, 100, 900, 600)
        self.layout = QVBoxLayout()
        self.setLayout(self.layout)
        self.df_actual = None
        # Inputs
        input_layout = QHBoxLayout()
        self.layout.addLayout(input_layout)

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

        self.btn2 = QPushButton('Descargar')
        self.btn2.clicked.connect(self.descargar)
        input_layout.addWidget(self.btn2)

        # Web view para mostrar el gráfico
        self.webview = QWebEngineView()
        self.layout.addWidget(self.webview)

    def ejecutar(self):
        ticker = self.ticker_input.text().strip()
        periodo = self.period_input.text().strip() or '5y'
        frecuencia = self.freq_input.text().strip() or '1wk'
        valid_intervals = ['1d', '1wk', '1mo']
        if not ticker:
            return
        if frecuencia not in valid_intervals:
            self.webview.setHtml(f"<h2>Frecuencia '{frecuencia}' no válida. Opciones: {valid_intervals}</h2>")
            return
        try:
            df = yf.download(ticker, period=periodo, interval=frecuencia, progress=False)
            if df.empty:
                self.webview.setHtml(f"<h2>No se obtuvieron datos para el ticker '{ticker}'.</h2>")
                return
            df = df[['Open', 'High', 'Low', 'Close']].dropna().reset_index()
            df = df.xs(ticker, axis=1, level=1).dropna()
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
        except Exception as e:
            self.webview.setHtml(f"<h2>Error: {e}</h2>")
    def descargar(self):
        if self.df_actual is None:
            self.webview.setHtml("<h2>No hay datos para descargar. Ejecute primero la consulta.</h2>")
            return
        try:
            directory = os.path.expanduser('~/Downloads')
            filename = f"{self.ticker_input.text().strip()}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}_data.csv"
            self.df_actual.to_csv(os.path.join(directory, filename), index=True)
            self.webview.setHtml(f"<h2>Datos descargados exitosamente como '{filename}'.</h2>")
        except Exception as e:
            self.webview.setHtml(f"<h2>Error al descargar los datos: {e}</h2>")

if __name__ == '__main__':
    app = QApplication(sys.argv)
    window = StockApp()
    window.show()
    sys.exit(app.exec_())