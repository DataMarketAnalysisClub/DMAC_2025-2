import pandas as pd
import yfinance as yf


def fetch_stock_data(tickers, period, interval):
    current_data = {}
    valid_tickers = []
    errors = []

    for ticker in tickers:
        try:
            df = yf.download(ticker, period=period, interval=interval, progress=False)

            if df.empty:
                errors.append(f"No data for '{ticker}'.")
                continue

            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.droplevel(1)

            df = df[['Open', 'High', 'Low', 'Close']].dropna()

            if not df.empty:
                current_data[ticker] = df
                valid_tickers.append(ticker)
            else:
                errors.append(f"Empty data for '{ticker}' after cleaning.")

        except Exception as e:
            errors.append(f"Error with '{ticker}': {e}.")
            continue

    return current_data, valid_tickers, errors
