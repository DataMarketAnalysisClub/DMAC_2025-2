"""
Endpoints REST de la API.
Cada vista es una función simple — sin estado, sin sesiones.
Para migrar a async: decorar con @sync_to_async o mover lógica a Celery tasks.
"""
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .data import fetch_ticker, fetch_close_series
from .forecast import run_forecast
from .portfolio import run_optimization


FREQ_MAP = {'1d': 'D', '1wk': 'W', '1mo': 'ME'}


@api_view(['GET'])
def health(request):
    return Response({'status': 'ok'})


@api_view(['POST'])
def market_data(request):
    """
    Body: { tickers: ["AAPL","MSFT"], period: "1y", interval: "1d" }
    Response: { AAPL: { dates, open, high, low, close, volume }, ... }
    """
    tickers  = request.data.get('tickers', [])
    period   = request.data.get('period', '1y')
    interval = request.data.get('interval', '1d')

    if not tickers:
        return Response({'error': 'Se requiere al menos un ticker.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(tickers) > 10:
        return Response({'error': 'Máximo 10 tickers.'}, status=status.HTTP_400_BAD_REQUEST)

    results = {}
    errors  = []
    for ticker in tickers:
        data = fetch_ticker(ticker.upper(), period, interval)
        if data:
            results[ticker.upper()] = data
        else:
            errors.append(ticker.upper())

    if not results:
        return Response({'error': f'No se encontraron datos para: {errors}'}, status=status.HTTP_404_NOT_FOUND)

    return Response({'data': results, 'errors': errors})


@api_view(['POST'])
def forecast(request):
    """
    Body: {
        ticker: "AAPL",
        period: "2y",
        interval: "1d",
        horizon: 30,
        auto: true,
        order: [1, 1, 1]   # solo si auto=false
    }
    """
    ticker   = request.data.get('ticker', '').upper()
    period   = request.data.get('period', '2y')
    interval = request.data.get('interval', '1d')
    horizon  = int(request.data.get('horizon', 30))
    auto     = bool(request.data.get('auto', True))
    order    = tuple(request.data.get('order', [1, 1, 1]))
    freq     = FREQ_MAP.get(interval, 'D')

    if not ticker:
        return Response({'error': 'Se requiere ticker.'}, status=status.HTTP_400_BAD_REQUEST)

    series = fetch_close_series(ticker, period, interval)
    if series is None:
        return Response({'error': f'No se encontraron datos para {ticker}.'}, status=status.HTTP_404_NOT_FOUND)

    try:
        result = run_forecast(series, horizon, freq, auto, order)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({'ticker': ticker, **result})


@api_view(['POST'])
def optimize(request):
    """
    Body: { tickers: ["AAPL","MSFT"], period: "2y", interval: "1d", rf: 0.03 }
    """
    tickers  = request.data.get('tickers', [])
    period   = request.data.get('period', '2y')
    interval = request.data.get('interval', '1d')
    rf       = float(request.data.get('rf', 0.03))

    if len(tickers) < 2:
        return Response({'error': 'Se necesitan al menos 2 tickers.'}, status=status.HTTP_400_BAD_REQUEST)

    close_dict = {}
    errors = []
    for ticker in tickers:
        s = fetch_close_series(ticker.upper(), period, interval)
        if s is not None:
            close_dict[ticker.upper()] = s
        else:
            errors.append(ticker.upper())

    if len(close_dict) < 2:
        return Response({'error': f'Datos insuficientes. Fallaron: {errors}'}, status=status.HTTP_404_NOT_FOUND)

    try:
        result = run_optimization(close_dict, rf)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({**result, 'errors': errors})
