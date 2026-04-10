# CLAUDE.md — DMAC Stock App

## Contexto del Proyecto

Repositorio del **Data Market Analysis Club (DMAC) UDD**. Contiene una app de visualización de acciones con predicción de series temporales (ARIMA/SARIMAX).

Hay **dos versiones activas** de la app:
- `Scripts/StockApp/` — App de escritorio en **PyQt5** (más madura y completa)
- `Scripts/beta-test/` — App web **React + Flask** (en desarrollo)

Leer `ESTADO_PROYECTO.md` para el diagnóstico completo.

---

## Reglas de Trabajo

### General
- El proyecto usa **Python** para backend/lógica y **JavaScript/React** para la UI web
- El entorno virtual está en `dmac/` — no modificar ni referenciar archivos dentro de él
- Los datos de acciones se obtienen via **yFinance** (`yf.download()` o `yf.Ticker()`)
- El modelo de predicción usa solo **variables endógenas** (historial de precios) — ARIMA puro en StockApp, SARIMAX en beta-test

### StockApp (PyQt5)
- Entry point: `Scripts/StockApp/main.py`
- La lógica de UI está en `ui_setup.py`, NO en `main.py`
- Las operaciones lentas (fetch, predicción, optimización) corren en **QThread workers** (`worker_threads.py`)
- El gráfico se genera en `plotting.py` y se renderiza via `QWebEngineView` como HTML de Plotly
- `DataManager` en `memory_management.py` controla el caché y límite de memoria (max 10 tickers)

### beta-test (React + Flask)
- Backend entry point: `Scripts/beta-test/backend/app.py` (puerto 5000)
- Frontend entry point: `Scripts/beta-test/src/App.js` (puerto 3000)
- Los endpoints están en `Scripts/beta-test/backend/api/routes.py`
- La lógica SARIMAX está en `Scripts/beta-test/backend/api/sarimax.py`

---

## Convenciones de Código

- Python: sin type hints en código existente — no agregar si no se pide
- No hay tests — no crear archivos de test a menos que se pida explícitamente
- No agregar manejo de errores especulativo — solo en boundaries reales (entrada del usuario, llamadas a yFinance)
- Los `print(f"DEBUG ...")` en `main.py` son deuda técnica conocida — eliminarlos si se tocan esas funciones

---

## Dependencias Clave

**StockApp:**
```
yfinance, plotly, PyQt5, PyQtWebEngine, statsmodels, pmdarima, scipy, numpy, pandas
```
(ver `Scripts/StockApp/requirements.txt`)

**beta-test backend:**
```
flask, flask-cors, yfinance, pandas, numpy, statsmodels, pmdarima, scipy
```
(sin requirements.txt — pendiente crearlo)

---

## Archivos que NO deben versionarse
- `dmac/` (venv)
- `debug_chart.html`
- `__pycache__/`, `*.pyc`
- `.claude/` (configuración de Claude Code)
