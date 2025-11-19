

import data_loader as dl

ticker = 'LTM.SN'
start_date = '2020-01-01'
end_date = '2025-01-01'

df = dl.data_loader(ticker, start_date, end_date)


market_cap_df = dl.data_marketcap("LTM.SN")
dividends_df = dl.data_dividends(ticker, start_date, end_date)
free_float_df = dl.data_freefloats(ticker)
splits_df = dl.data_splits(ticker)

df.columns = [col[0] for col in df.columns]

FFAF = free_float_df['Free Float'].iloc[0]/free_float_df['Shares Outstanding'].iloc[0]
MKADJ = df['Close'] * FFAF * free_float_df['Shares Outstanding'].iloc[0]


print(MKADJ)
print(FFAF)


import pandas as pd

ruta = r'/home/brunoc/Documents/Universidad/2025/3er Trimestre/Business Intelligence/Class1811/pipeline/ipsa_index.csv'

ipsa_index = pd.read_csv(ruta)
import matplotlib.pyplot as plt
ipsa_index['Date'] = pd.to_datetime(ipsa_index['Date'])
ipsa_index.set_index('Date', inplace=True)
ipsa_index.plot(title='Índice IPSA Ajustado', figsize=(12, 6))
#         - columna 'Adjusted Market Cap': float
#     base_value : float, optional
#         Valor base del índice, por defecto 1000.0.
#
#     Returns
#     -------
#     pd.DataFrame
#         DataFrame con la columna 'IPSA' representando el valor del índice en el tiempo.
#     """
plt.xlabel('Fecha')
plt.ylabel('Valor del Índice IPSA')
plt.grid()
plt.show()
