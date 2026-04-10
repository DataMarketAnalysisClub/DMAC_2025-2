# DMAC StockApp v2

App de visualización de acciones con predicción ARIMA y optimización de cartera.

**Stack:** Django REST Framework · React · Plotly.js · yFinance

---

## Levantar en desarrollo

### Backend (Django)
```bash
cd backend
pip install -r requirements.txt
python manage.py runserver
# → http://localhost:8000
```

### Frontend (React)
```bash
cd frontend
npm install
npm start
# → http://localhost:3000
```

El frontend tiene `"proxy": "http://localhost:8000"` en `package.json`, por lo que
todas las llamadas a `/api/*` se redirigen automáticamente al backend.

---

## Endpoints disponibles

| Método | URL | Descripción |
|---|---|---|
| GET  | `/api/health/` | Estado del servidor |
| POST | `/api/market-data/` | Precios OHLCV por ticker |
| POST | `/api/forecast/` | Predicción ARIMA para un ticker |
| POST | `/api/optimize/` | Optimización de cartera Markowitz |

---

## Migración a async (cuando se necesite)

1. Instalar: `pip install celery redis`
2. Crear `config/celery.py` con la app Celery
3. Mover `run_forecast()` y `run_optimization()` a tasks Celery
4. Cambiar los views para retornar un `task_id` y agregar endpoint de polling `/api/status/<task_id>/`
5. El código interno de `forecast.py` y `portfolio.py` **no cambia**

---

## Estructura

```
backend/
  config/          Django settings y URLs raíz
  api/
    views.py       Endpoints REST
    data.py        Descarga de datos (yFinance)
    forecast.py    Lógica ARIMA
    portfolio.py   Lógica Markowitz
  requirements.txt

frontend/
  src/
    api/client.js          Cliente HTTP centralizado
    components/
      TickerInput.jsx      Formulario de búsqueda
      StockChart.jsx       Gráfico candlestick (Plotly.js)
      ForecastPanel.jsx    Controles ARIMA + métricas
      PortfolioPanel.jsx   Controles optimización + resultado
      EfficientFrontierChart.jsx  Frontera eficiente (Plotly.js)
    App.jsx                Ensamblado principal
```
