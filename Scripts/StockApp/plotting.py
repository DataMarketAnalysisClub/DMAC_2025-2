"""
Updated plotting.py to include background image in Plotly chart
"""
import plotly.graph_objects as go

def generate_stock_chart(current_data, tickers, predictions, 
                         color_schemes, ticker_color_pairs, confidence_colors,
                         current_color_scheme, use_base100, show_confidence,
                         get_model_quality_func, background_image=None):
    """
    Genera la figura de Plotly con los datos históricos y las predicciones.
    
    Args:
        background_image: Base64 encoded image string (optional)
    """
    if not current_data or not tickers:
        return go.Figure()

    traces = []
    
    # Determinar si usar Base 100
    is_base100 = len(tickers) > 1 and use_base100
    
    first_values = {}
    if is_base100:
        for ticker in tickers:
            if ticker in current_data:
                first_values[ticker] = current_data[ticker]['Close'].iloc[0]
    
    # Crear trazas de datos históricos
    for idx, ticker in enumerate(tickers):
        if ticker not in current_data:
            continue
            
        df = current_data[ticker]
        
        if is_base100 and ticker in first_values:
            base = first_values[ticker]
            open_vals = (df['Open'] / base * 100)
            high_vals = (df['High'] / base * 100)
            low_vals = (df['Low'] / base * 100)
            close_vals = (df['Close'] / base * 100)
        else:
            open_vals = df['Open']
            high_vals = df['High']
            low_vals = df['Low']
            close_vals = df['Close']
        
        if len(tickers) > 1:
            colors = ticker_color_pairs[idx % len(ticker_color_pairs)]
        else:
            colors = color_schemes[current_color_scheme]
        
        trace = go.Candlestick(
            x=df.index,
            open=open_vals, high=high_vals, low=low_vals, close=close_vals,
            name=ticker,
            increasing=colors['increasing'],
            decreasing=colors['decreasing'],
            legendgroup=ticker
        )
        traces.append(trace)
        
        # Agregar predicciones
        if ticker in predictions:
            pred_data = predictions[ticker]
            forecast_vals = pred_data['forecast'].copy()
            lower_vals = pred_data['lower_bound'].copy()
            upper_vals = pred_data['upper_bound'].copy()
            
            if is_base100 and ticker in first_values:
                base = first_values[ticker]
                forecast_vals = forecast_vals / base * 100
                lower_vals = lower_vals / base * 100
                upper_vals = upper_vals / base * 100
            
            # Línea de predicción
            pred_trace = go.Scatter(
                x=pred_data['dates'],
                y=forecast_vals,
                mode='lines',
                name=f'{ticker} Predicción',
                line=dict(
                    dash='dash', 
                    width=2,
                    color=ticker_color_pairs[idx % len(ticker_color_pairs)]['line_color'] if len(tickers) > 1 else '#2196F3'
                ),
                legendgroup=ticker,
                showlegend=True
            )
            traces.append(pred_trace)
            
            # Bandas de confianza
            if show_confidence:
                upper_trace = go.Scatter(
                    x=pred_data['dates'], y=upper_vals, mode='lines',
                    line=dict(width=0), showlegend=False, legendgroup=ticker, hoverinfo='skip'
                )
                traces.append(upper_trace)
                
                lower_trace = go.Scatter(
                    x=pred_data['dates'], y=lower_vals, mode='lines',
                    line=dict(width=0),
                    fillcolor=confidence_colors[idx % len(confidence_colors)],
                    fill='tonexty',
                    name=f'{ticker} IC 95%',
                    legendgroup=ticker,
                    showlegend=True
                )
                traces.append(lower_trace)

    # Título
    if len(tickers) == 1:
        title = f'Gráfico de velas japonesas para {tickers[0]}'
    else:
        scale_type = '(Base 100)' if is_base100 else '(Valores absolutos)'
        title = f'Gráfico comparativo {scale_type}: {", ".join(tickers)}'
    
    # Anotaciones de métricas
    annotations = []
    if predictions:
        y_position = 0.98
        for ticker in tickers:
            if ticker in predictions:
                pred_data = predictions[ticker]
                quality, quality_color = get_model_quality_func(pred_data['mape'])
                
                metrics_text = f"<b>{ticker}</b> | ARIMA{pred_data['order']}<br>"
                metrics_text += f"<b style='color:{quality_color}'>● {quality}</b>"
                if pred_data['mape'] is not None:
                     metrics_text += f" (MAPE: {pred_data['mape']:.2f}%)"
                
                if pred_data['rmse_percent'] is not None:
                    metrics_text += f"<br>Error Rel. (MAE): {pred_data['mae_percent']:.1f}%"

                annotations.append(
                    dict(
                        x=1.02, y=y_position, xref='paper', yref='paper',
                        text=metrics_text, showarrow=False, align='left',
                        bgcolor='rgba(255, 255, 255, 0.95)',
                        bordercolor=quality_color, borderwidth=2,
                        borderpad=8, font=dict(size=10)
                    )
                )
                y_position -= 0.15
    
    # Layout final
    fig = go.Figure(data=traces)
    
    layout_config = dict(
        title=title,
        xaxis_title='Fecha',
        yaxis_title='Precio (Base 100)' if is_base100 else 'Precio',
        xaxis_rangeslider_visible=False,
        showlegend=True,
        legend=dict(x=0, y=1, orientation='h'),
        height=550,
        annotations=annotations,
        margin=dict(r=200),

        xaxis=dict(
            showline=True,        # Show the main X-axis line
            linecolor='black',    # Color the line black
            showgrid=True,        # Show the grid
            gridcolor='lightgray', # Color the grid light gray
            zerolinecolor='black' # Make the zero line black
        ),
        yaxis=dict(
            showline=True,        # Show the main Y-axis line
            linecolor='black',    # Color the line black
            showgrid=True,        # Show the grid
            gridcolor='lightgray',    # Color the grid light grey
            zerolinecolor='black' # Make the zero line black
        ),
        plot_bgcolor='white',
        paper_bgcolor='white'
    )
    
    # Add background image if provided
    if background_image:
        layout_config['images'] = [dict(
            source=background_image,
            xref="paper",
            yref="paper",
            x=0.5,  # Center horizontally
            y=0.5,  # Center vertically
            sizex=1.2,  # Width (adjust between 0-1 for size)
            sizey=1.2,  # Height (adjust between 0-1 for size)
            xanchor="center",
            yanchor="middle",
            opacity=0.10,  # 15% opacity for subtle watermark
            layer="below"  # Place below traces
        )]
    
    fig.update_layout(**layout_config)
    
    return fig.to_html(include_plotlyjs='cdn')
