import pandas as pd
from . import data_loader as dl
from . import data_cleaning as dc


def FFAF(free_float_col, shares_outstanding_col):
    ff = pd.to_numeric(free_float_col, errors="coerce")
    so = pd.to_numeric(shares_outstanding_col, errors="coerce")
    return ff / so


def adjusted_MarketCap(price, shares_outstanding, ffaf):
    return price * shares_outstanding * ffaf


def get_index_data(tickers, start_date, end_date):
    index_data = {}

    for ticker in tickers:
        df = dl.data_loader(ticker, start_date, end_date)
        df = dc.clean_market_data(df)

        free_float_df = dl.data_freefloats(ticker)
        free_float = free_float_df['Free Float'].iloc[0]
        shares_outstanding = free_float_df['Shares Outstanding'].iloc[0]

        ffaf_value = FFAF(free_float, shares_outstanding)
        df['Adjusted Market Cap'] = adjusted_MarketCap(df['Close'], shares_outstanding, ffaf_value)

        index_data[ticker] = df

    return index_data


def build_ipsa_index(index_data: dict, base_value: float = 1000.0):
    mc_frames = []

    for ticker, df in index_data.items():
        tmp = df.copy()
        tmp.index = pd.to_datetime(tmp.index)
        tmp = tmp[["Adjusted Market Cap"]].rename(columns={"Adjusted Market Cap": ticker})
        mc_frames.append(tmp)

    mc_df = pd.concat(mc_frames, axis=1).sort_index()
    mc_df = mc_df.dropna(how="all")

    total_mc = mc_df.sum(axis=1)
    index_series = total_mc / total_mc.iloc[0] * base_value
    index_df = index_series.to_frame(name="IPSA")
    weights = mc_df.div(total_mc, axis=0)

    return index_df, mc_df, weights
