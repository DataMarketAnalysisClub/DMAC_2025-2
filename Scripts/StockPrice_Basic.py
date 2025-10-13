# StockPrice.py: Script interactivo para graficar velas japonesas con plotly
import sys
import pandas as pd
import warnings
warnings.filterwarnings("ignore")

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

def main():
	print("--- Gráfico de velas japonesas de un ticker ---")
	ticker = input("Ingrese el ticker (obligatorio): ").strip()
	if not ticker:
		print("Error: Debe ingresar un ticker.")
		return

	period = input("Ingrese el periodo (default: 5y): ").strip() or "5y"
	interval = input("Ingrese la frecuencia (default: 1wk): ").strip() or "1wk"

	try:
		valid_intervals = ["1d", "1wk", "1mo"]
		if interval not in valid_intervals:
			raise ValueError(f"Frecuencia '{interval}' no válida. Opciones: {valid_intervals}")

		print(f"Descargando datos de {ticker} periodo={period} frecuencia={interval}...")
		df = yf.download(ticker, period=period, interval=interval, progress=False)
		df = df.xs(ticker, axis=1, level=1).dropna()

		if df.empty:
			print(f"No se obtuvieron datos para el ticker '{ticker}'.")
			return
		# Graficar velas japonesas con plotly
		fig = go.Figure(data=[
			go.Candlestick(
				x=df.index,
				open=df['Open'],
				high=df['High'],
				low=df['Low'],
				close=df['Close'],
				name='Precio'
			)
		])
		fig.update_layout(
			title=f'Gráfico de velas japonesas para {ticker}',
			xaxis_title='Fecha',
			yaxis_title='Precio',
			xaxis_rangeslider_visible=False
		)
		fig.show()
	except Exception as e:
		print(f"Error: {e}")

if __name__ == "__main__":
	main()
