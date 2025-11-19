import data_loader as dl

import data_cleaning as dc
import pandas as pd

def FFAF(free_float_col, shares_outstanding_col):
    """
    Versión vectorizada para columnas pandas.
    """
    ff = pd.to_numeric(free_float_col, errors="coerce")
    so = pd.to_numeric(shares_outstanding_col, errors="coerce")
    return ff / so


def adjusted_MarketCap (price, shares_outstanding, FFAF):
    """
    Calculate the adjusted market capitalization.

    Parameters:
    price (float): The stock price.
    shares_outstanding (int): The number of shares outstanding.

    Returns:
    float: The adjusted market capitalization.
    """
    return price * shares_outstanding * FFAF

# Creamos la función que recibe una lista de tickers y obtiene todo para crear el IPSA

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

import pandas as pd

def build_ipsa_index(index_data: dict, base_value: float = 1000.0):
    """
    Construye un índice tipo IPSA a partir de un diccionario de DataFrames,
    donde cada DataFrame tiene una columna 'Adjusted Market Cap'.

    Parameters
    ----------
    index_data : dict
        Diccionario {ticker: DataFrame}, donde cada DataFrame tiene:
        - index: Date (DatetimeIndex o algo convertible)
        - columna: 'Adjusted Market Cap'
    base_value : float
        Valor base del índice en la primera fecha (ej: 1000).

    Returns
    -------
    index_df : pd.DataFrame
        Una columna 'IPSA' con el valor del índice en el tiempo.
    mc_df : pd.DataFrame
        Market Cap ajustado por free float por fecha y ticker.
    weights : pd.DataFrame
        Pesos de cada acción en el índice por fecha.
    """

    mc_frames = []

    for ticker, df in index_data.items():
        # Nos aseguramos de que el índice sea datetime
        tmp = df.copy()
        tmp.index = pd.to_datetime(tmp.index)

        # Nos quedamos solo con la columna de Market Cap y la renombramos al ticker
        tmp = tmp[["Adjusted Market Cap"]].rename(
            columns={"Adjusted Market Cap": ticker}
        )

        mc_frames.append(tmp)

    # Unimos todo por fecha; por defecto es outer join, puedes cambiar a 'inner' si quieres solo intersección
    mc_df = pd.concat(mc_frames, axis=1).sort_index()

    # Opcional: eliminar fechas donde todo es NaN
    mc_df = mc_df.dropna(how="all")

    # Capitalización total del índice por fecha
    total_mc = mc_df.sum(axis=1)

    # Índice con base 'base_value' en la primera fecha
    index_series = total_mc / total_mc.iloc[0] * base_value
    index_df = index_series.to_frame(name="IPSA")

    # Pesos de cada acción
    weights = mc_df.div(total_mc, axis=0)

    return index_df, mc_df, weights
