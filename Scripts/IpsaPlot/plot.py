import pandas as pd
import matplotlib.pyplot as plt

# Ruta de tu CSV
ruta = '/home/brunoc/Documents/Universidad/2025/3er Trimestre/Business Intelligence/Class1811/pipeline/ipsa_index.csv'

# 1. Cargar CSV
ipsa_index = pd.read_csv(ruta)

# 2. Verificar que la columna correcta exista
if 'Date' not in ipsa_index.columns:
    raise ValueError("El archivo CSV debe contener la columna 'Date'.")

# Identificar la columna del índice
index_cols = [col for col in ipsa_index.columns if col != 'Date']

if len(index_cols) != 1:
    raise ValueError(f"Se esperaba 1 columna de índice, encontradas: {index_cols}")

index_col = index_cols[0]

# 3. Convertir Date a datetime
ipsa_index['Date'] = pd.to_datetime(ipsa_index['Date'])

# 4. Establecer Date como índice
ipsa_index.set_index('Date', inplace=True)

# 5. Graficar
plt.figure(figsize=(12, 6))
plt.plot(ipsa_index.index, ipsa_index[index_col], label='IPSA Ajustado', linewidth=2)

plt.title('Índice IPSA Ajustado (Free Float Weighted)')
plt.xlabel('Fecha')
plt.ylabel('Valor del Índice IPSA')
plt.grid(True, linestyle='--', alpha=0.6)
plt.legend()
plt.tight_layout()
plt.savefig("ipsa_plot.png", dpi=300, bbox_inches='tight')

