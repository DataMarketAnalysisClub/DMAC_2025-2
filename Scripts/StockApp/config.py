# Esquemas de colores para los gráficos
COLOR_SCHEMES = {
    'default': {
        'increasing': {'line': {'color': '#00FF00'}, 'fillcolor': 'rgba(0,255,0,0.5)'},
        'decreasing': {'line': {'color': '#FF0000'}, 'fillcolor': 'rgba(255,0,0,0.5)'}
    },
    'UDD': {
        'increasing': {'line': {'color': '#005293'}, 'fillcolor': 'rgba(65,123,171,1)'},
        'decreasing': {'line': {'color': '#6E7b8b'}, 'fillcolor': 'rgba(147,148,149,0.82)'}
    }
}

# Paleta de colores para múltiples tickers
TICKER_COLOR_PAIRS = [
    {'increasing': {'line': {'color': '#005293'}, 'fillcolor': 'rgba(0, 82, 147, 0.5)'}, 
     'decreasing': {'line': {'color': '#6E7b8b'}, 'fillcolor': 'rgba(110, 123, 139, 0.5)'},
     'line_color': '#005293'},
    {'increasing': {'line': {'color': '#00A651'}, 'fillcolor': 'rgba(0, 166, 81, 0.5)'}, 
     'decreasing': {'line': {'color': '#E63946'}, 'fillcolor': 'rgba(230, 57, 70, 0.5)'},
     'line_color': '#00A651'},
    {'increasing': {'line': {'color': '#F26419'}, 'fillcolor': 'rgba(242, 100, 25, 0.5)'}, 
     'decreasing': {'line': {'color': '#662E9B'}, 'fillcolor': 'rgba(102, 46, 155, 0.5)'},
     'line_color': '#F26419'},
    # ... (puedes añadir los demás colores que tenías)
]

# Colores para las bandas de confianza
CONFIDENCE_COLORS = [
    'rgba(0, 82, 147, 0.2)',
    'rgba(0, 166, 81, 0.2)',
    'rgba(242, 100, 25, 0.2)',
    'rgba(26, 188, 156, 0.2)',
    'rgba(244, 208, 63, 0.2)',
]
