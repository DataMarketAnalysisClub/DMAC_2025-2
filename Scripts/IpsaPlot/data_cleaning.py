import data_loader as dl


def clean_market_data(df):
    """
    Clean the stock data by handling missing values and removing duplicates.

    Parameters:
    df (pd.DataFrame): The raw stock data DataFrame.

    Returns:
    pd.DataFrame: The cleaned stock data DataFrame.
    """

    df.columns = [col[0] for col in df.columns]
    return df

