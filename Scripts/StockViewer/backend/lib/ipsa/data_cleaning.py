def clean_market_data(df):
    df.columns = [col[0] for col in df.columns]
    return df
