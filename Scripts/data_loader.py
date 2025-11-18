import pandas as pd
import yfinance as yf

def data_loader(ticker, start_date, end_date):
    """
    Load historical stock data for a given ticker symbol from Yahoo Finance.

    Parameters:
    ticker (str): The stock ticker symbol.
    start_date (str): The start date for the data in 'YYYY-MM-DD' format.
    end_date (str): The end date for the data in 'YYYY-MM-DD' format.

    Returns:
    pd.DataFrame: A DataFrame containing the historical stock data.
    """
    data = yf.download(ticker, start=start_date, end=end_date, auto_adjust=False)
    return data

def data_marketcap(ticker):
    """
    Load market capitalization data for a given ticker symbol from Yahoo Finance.

    Parameters:
    ticker (str): The stock ticker symbol.

    Returns:
    pd.DataFrame: A DataFrame containing the market capitalization data.
    """
    stock = yf.Ticker(ticker)
    stocks = stock.history(period="max")
    shares_outstanding = stock.info.get('sharesOutstanding', None)
    market_cap = stocks['Close'] * shares_outstanding
    df = market_cap.reset_index()
    df.columns = ['Date', 'Market Cap']
    df['Date'] = df['Date'].dt.strftime('%Y-%m-%d')

    return df

def data_dividends(ticker, start_date, end_date):
    """
    Load dividend data for a given ticker symbol from Yahoo Finance.

    Parameters:
    ticker (str): The stock ticker symbol.
    start_date (str): The start date for the data in 'YYYY-MM-DD' format.
    end_date (str): The end date for the data in 'YYYY-MM-DD' format.

    Returns:
    pd.DataFrame: A DataFrame containing the dividend data.
    """
    stock = yf.Ticker(ticker)
    dividends = stock.dividends[start_date:end_date]
    df = dividends.reset_index()
    df.columns = ['Date', 'Dividends']
    df['Date'] = df['Date'].dt.strftime('%Y-%m-%d')
    return df

def data_freefloats(ticker):
    stock = yf.Ticker(ticker)

    # 1. Datos actuales
    # Obtenemos los floats actuales de la información de la empresa a través del tiempo en formato YYYY-MM-DD
    info = stock.info
    free_float = info.get('floatShares', None)
    shares_outstanding = info.get('sharesOutstanding', None)
    df = pd.DataFrame({'Date': [pd.Timestamp.today().strftime('%Y-%m-%d')],
                       'Free Float': [free_float],
                       'Shares Outstanding': [shares_outstanding]})
    return df

def data_splits(ticker):
    """
    Load stock split data for a given ticker symbol from Yahoo Finance.

    Parameters:
    ticker (str): The stock ticker symbol.

    Returns:
    pd.DataFrame: A DataFrame containing the stock split data.
    """
    stock = yf.Ticker(ticker)
    splits = stock.splits
    df = splits.reset_index()
    # Date in YYYY-MM-DD format


    df.columns = ['Date', 'Stock Splits']
    df['Date'] = df['Date'].dt.strftime('%Y-%m-%d')
    return df