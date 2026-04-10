"""
Capa de datos: descarga de precios desde yFinance.
"""
import yfinance as yf
import pandas as pd


def fetch_ticker(ticker: str, period: str, interval: str) -> dict | None:
    """
    Descarga datos OHLCV para un ticker.
    Retorna dict con listas serializables a JSON, o None si falla.
    """
    try:
        df = yf.download(ticker, period=period, interval=interval, progress=False)
        if df.empty:
            return None

        # Aplanar MultiIndex si yfinance lo genera
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        df = df[['Open', 'High', 'Low', 'Close', 'Volume']].dropna()
        df.index = pd.to_datetime(df.index)

        return {
            'ticker': ticker,
            'dates': df.index.strftime('%Y-%m-%d').tolist(),
            'open':   df['Open'].round(4).tolist(),
            'high':   df['High'].round(4).tolist(),
            'low':    df['Low'].round(4).tolist(),
            'close':  df['Close'].round(4).tolist(),
            'volume': df['Volume'].tolist(),
        }
    except Exception:
        return None


def fetch_close_series(ticker: str, period: str, interval: str) -> pd.Series | None:
    """
    Descarga solo precios de cierre como pd.Series indexada por fecha.
    Usado por optimización de cartera y predicción.
    """
    try:
        df = yf.download(ticker, period=period, interval=interval, progress=False)
        if df.empty:
            return None

        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        series = df['Close'].dropna()
        series.index = pd.to_datetime(series.index)
        return series
    except Exception:
        return None
