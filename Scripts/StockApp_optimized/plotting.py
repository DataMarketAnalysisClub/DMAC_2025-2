"""
Chart generation using Plotly. Returns self-contained HTML strings.
"""
import plotly.graph_objects as go


# ---------------------------------------------------------------------------
# Shared layout helpers
# ---------------------------------------------------------------------------

def _axis_style():
    return dict(
        showline=True, linecolor='black',
        showgrid=True, gridcolor='lightgray',
        zerolinecolor='black',
    )


def _base_layout(title, height=550, extra_margin_r=200):
    return dict(
        title=title,
        height=height,
        plot_bgcolor='white',
        paper_bgcolor='white',
        font=dict(color='black'),
        showlegend=True,
        legend=dict(x=0, y=1, orientation='h'),
        margin=dict(r=extra_margin_r),
        xaxis=dict(**_axis_style(), rangeslider=dict(visible=False)),
        yaxis=_axis_style(),
    )


def _watermark(image_b64, sizex=1.2, sizey=1.2, opacity=0.10):
    if not image_b64:
        return []
    return [dict(
        source=image_b64, xref='paper', yref='paper',
        x=0.5, y=0.5, sizex=sizex, sizey=sizey,
        xanchor='center', yanchor='middle',
        opacity=opacity, layer='below',
    )]


# ---------------------------------------------------------------------------
# Stock chart (candlestick + ARIMA forecast)
# ---------------------------------------------------------------------------

def generate_stock_chart(current_data, tickers, predictions,
                         color_schemes, ticker_color_pairs, confidence_colors,
                         current_color_scheme, use_base100, show_confidence,
                         get_model_quality_func, background_image=None):
    if not current_data or not tickers:
        return go.Figure().to_html(include_plotlyjs='cdn')

    is_base100 = len(tickers) > 1 and use_base100
    first_values = {t: current_data[t]['Close'].iloc[0] for t in tickers if t in current_data} if is_base100 else {}

    traces = []
    for idx, ticker in enumerate(tickers):
        if ticker not in current_data:
            continue
        df = current_data[ticker]

        if is_base100 and ticker in first_values:
            base = first_values[ticker]
            o, h, lo, c = (df[col] / base * 100 for col in ('Open', 'High', 'Low', 'Close'))
        else:
            o, h, lo, c = df['Open'], df['High'], df['Low'], df['Close']

        colors = ticker_color_pairs[idx % len(ticker_color_pairs)] if len(tickers) > 1 else color_schemes[current_color_scheme]
        traces.append(go.Candlestick(
            x=df.index, open=o, high=h, low=lo, close=c,
            name=ticker, legendgroup=ticker,
            increasing=colors['increasing'], decreasing=colors['decreasing'],
        ))

        if ticker not in predictions:
            continue
        pred = predictions[ticker]
        fc = pred['forecast'].copy()
        lb = pred['lower_bound'].copy()
        ub = pred['upper_bound'].copy()
        if is_base100 and ticker in first_values:
            base = first_values[ticker]
            fc, lb, ub = fc / base * 100, lb / base * 100, ub / base * 100

        line_color = ticker_color_pairs[idx % len(ticker_color_pairs)]['line_color'] if len(tickers) > 1 else '#2196F3'
        traces.append(go.Scatter(
            x=pred['dates'], y=fc, mode='lines',
            name=f'{ticker} Predicción', legendgroup=ticker,
            line=dict(dash='dash', width=2, color=line_color),
        ))
        if show_confidence:
            traces.append(go.Scatter(
                x=pred['dates'], y=ub, mode='lines',
                line=dict(width=0), showlegend=False, legendgroup=ticker, hoverinfo='skip',
            ))
            traces.append(go.Scatter(
                x=pred['dates'], y=lb, mode='lines',
                line=dict(width=0),
                fill='tonexty', fillcolor=confidence_colors[idx % len(confidence_colors)],
                name=f'{ticker} IC 95%', legendgroup=ticker,
            ))

    # Title
    if len(tickers) == 1:
        title = f'Gráfico de velas para {tickers[0]}'
    else:
        scale = '(Base 100)' if is_base100 else '(Valores absolutos)'
        title = f'Comparativo {scale}: {", ".join(tickers)}'

    # ARIMA metric annotations
    annotations = []
    y_pos = 0.98
    for ticker in tickers:
        if ticker not in predictions:
            continue
        pred = predictions[ticker]
        quality, q_color = get_model_quality_func(pred['mape'])
        text = f"<b>{ticker}</b> | ARIMA{pred['order']}<br><b style='color:{q_color}'>● {quality}</b>"
        if pred['mape'] is not None:
            text += f" (MAPE: {pred['mape']:.2f}%)"
        if pred['mae_percent'] is not None:
            text += f"<br>Error Rel. (MAE): {pred['mae_percent']:.1f}%"
        annotations.append(dict(
            x=1.02, y=y_pos, xref='paper', yref='paper',
            text=text, showarrow=False, align='left',
            bgcolor='rgba(255,255,255,0.95)',
            bordercolor=q_color, borderwidth=2, borderpad=8,
            font=dict(size=10),
        ))
        y_pos -= 0.15

    layout = _base_layout(title)
    layout['yaxis_title'] = 'Precio (Base 100)' if is_base100 else 'Precio'
    layout['annotations'] = annotations
    layout['images'] = _watermark(background_image)

    fig = go.Figure(data=traces)
    fig.update_layout(**layout)
    return fig.to_html(include_plotlyjs='cdn')


# ---------------------------------------------------------------------------
# Efficient frontier chart
# ---------------------------------------------------------------------------

def generate_efficient_frontier_chart(portfolio_data, tickers, background_image=None):
    rp = portfolio_data['random_portfolios']
    opt_ret = portfolio_data['optimal_return']
    opt_std = portfolio_data['optimal_std']
    opt_sharpe = portfolio_data['optimal_sharpe']
    asset_stats = portfolio_data['asset_stats']
    opt_w = portfolio_data['optimal_weights']

    fig = go.Figure()

    fig.add_trace(go.Scatter(
        x=rp[0, :], y=rp[1, :], mode='markers',
        marker=dict(size=4, color=rp[2, :], colorscale='Viridis',
                    showscale=True, colorbar=dict(title='Sharpe Ratio', x=1.15), opacity=0.6),
        name='Carteras Aleatorias',
        hovertemplate='<b>Riesgo:</b> %{x:.2%}<br><b>Retorno:</b> %{y:.2%}<extra></extra>',
    ))

    fig.add_trace(go.Scatter(
        x=[s['volatility'] for s in asset_stats],
        y=[s['return'] for s in asset_stats],
        mode='markers+text',
        text=[s['ticker'] for s in asset_stats],
        textposition='top center',
        textfont=dict(size=12, color='red', family='Arial Black'),
        marker=dict(size=15, color='red', symbol='diamond', line=dict(width=2, color='black')),
        name='Activos Individuales',
        hovertemplate='<b>%{text}</b><br>Riesgo: %{x:.2%}<br>Retorno: %{y:.2%}<extra></extra>',
    ))

    fig.add_trace(go.Scatter(
        x=[opt_std], y=[opt_ret], mode='markers+text',
        text=['OPTIMA'], textposition='top center',
        textfont=dict(size=14, color='#00FF00', family='Arial Black'),
        marker=dict(size=25, color='#00FF00', symbol='star', line=dict(width=3, color='black')),
        name='Cartera Optima',
        hovertemplate=(f'<b>Cartera Optima</b><br>Riesgo: %{{x:.2%}}<br>'
                       f'Retorno: %{{y:.2%}}<br>Sharpe: {opt_sharpe:.2f}<extra></extra>'),
    ))

    weights_text = '<b>Pesos Optimos:</b><br>' + ''.join(
        f'{t}: {w * 100:.1f}%<br>' for t, w in zip(tickers, opt_w)
    )
    annotations = [
        dict(x=0.02, y=0.98, xref='paper', yref='paper', text=weights_text,
             showarrow=False, align='left',
             bgcolor='rgba(255,255,255,0.8)', bordercolor='black',
             borderwidth=1, borderpad=10, font=dict(size=11, color='black')),
        dict(x=0.02, y=0.78, xref='paper', yref='paper',
             text=(f'<b>Retorno Esperado:</b> {opt_ret * 100:.2f}%<br>'
                   f'<b>Volatilidad:</b> {opt_std * 100:.2f}%<br>'
                   f'<b>Sharpe Ratio:</b> {opt_sharpe:.2f}'),
             showarrow=False, align='left',
             bgcolor='rgba(255,255,255,0.8)', bordercolor='black',
             borderwidth=1, borderpad=10, font=dict(size=11, color='black')),
    ]

    layout = _base_layout('Frontera Eficiente - Optimización de Cartera (Markowitz)')
    layout['xaxis_title'] = 'Volatilidad Anual (Riesgo)'
    layout['yaxis_title'] = 'Retorno Anual Esperado'
    layout['xaxis'].update(tickformat='.1%')
    layout['yaxis'].update(tickformat='.1%')
    layout['hovermode'] = 'closest'
    layout['annotations'] = annotations
    layout['images'] = _watermark(background_image, sizex=0.6, sizey=0.6)

    fig.update_layout(**layout)
    return fig.to_html(
        include_plotlyjs='cdn',
        config={
            'displayModeBar': True,
            'toImageButtonOptions': {
                'format': 'png',
                'filename': f'efficient_frontier_{"_".join(tickers)}',
                'height': 1080, 'width': 1920, 'scale': 2,
            },
        },
    )
