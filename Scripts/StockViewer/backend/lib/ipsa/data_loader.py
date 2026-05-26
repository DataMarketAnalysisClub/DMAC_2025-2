import pandas as pd
import yfinance as yf


def data_loader(ticker, start_date, end_date):
    data = yf.download(ticker, start=start_date, end=end_date, auto_adjust=False, progress=False)
    return data


def data_freefloats(ticker):
    stock = yf.Ticker(ticker)
    info = stock.info
    free_float = info.get('floatShares', None)
    shares_outstanding = info.get('sharesOutstanding', None)
    df = pd.DataFrame({
        'Date': [pd.Timestamp.today().strftime('%Y-%m-%d')],
        'Free Float': [free_float],
        'Shares Outstanding': [shares_outstanding],
    })
    return df
