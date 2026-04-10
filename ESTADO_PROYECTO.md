# Estado del Proyecto — DMAC Stock App
_Generado el 2026-04-10_

---

## Contexto

Este repositorio pertenece al **Data Market Analysis Club (DMAC) UDD**. Su propósito es documentar talleres de análisis financiero con Python y desarrollar una aplicación de visualización de acciones con predicción de series temporales.

---

## Estructura del Repositorio

```
_DMAC/
├── AccionesDeInteres/         # Notebook de exploración de acciones de interés
│   ├── Stock_Prices.ipynb
│   └── tickers.txt
├── Documentaciones/           # Docs del club
│   └── GitHub.md
├── Forms/                     # Formularios / encuestas (vacío actualmente)
├── imagenes/                  # Assets visuales (logo DMAC, etc.)
├── Pruebas/                   # Notebooks y datos de prueba
│   ├── Code.ipynb
│   ├── Data/
│   ├── Images/
│   └── Informe/
├── Scripts/                   # Código fuente principal
│   ├── StockApp/              # ★ App de escritorio PyQt5 (más madura)
│   ├── WebApp/                # Versión JS pura (sin backend)
│   ├── beta-test/             # ★ App web React + Flask (en desarrollo)
│   ├── IpsaPlot/              # Script standalone para IPSA
│   ├── Portfolio_optimizer/   # Scripts de optimización de cartera
│   └── JS_Class/              # Clase JS de utilidades
├── dmac/                      # Entorno virtual Python (NO debe estar en git)
├── tickers_chilenos_nombres.csv
├── tickers_extranjeros_nombres.csv
├── debug_chart.html            # Artefacto de debug (NO debe estar en git)
└── README.md
```

---

## Las Dos Versiones de la App

### 1. `Scripts/StockApp/` — App de Escritorio (PyQt5) ★ MÁS COMPLETA

**Tecnología:** Python + PyQt5 + Plotly + yFinance + statsmodels/pmdarima

**Estado: Funcional con bugs menores (debug prints activos)**

#### Funcionalidades implementadas:
| Feature | Estado |
|---|---|
| Multi-ticker (hasta 10) en una sola visualización | ✅ Funciona |
| Gráfico de velas (candlestick) con Plotly | ✅ Funciona |
| Normalización Base 100 para comparación multi-ticker | ✅ Funciona |
| Múltiples esquemas de color (UDD, default, etc.) | ✅ Funciona |
| Predicción ARIMA manual (p, d, q) | ✅ Funciona |
| Predicción Auto-ARIMA (grid search o pmdarima) | ✅ Funciona |
| Bandas de confianza 95% en predicciones | ✅ Funciona |
| Métricas de calidad del modelo (MAPE, RMSE, MAE) | ✅ Funciona |
| Optimización de cartera (Markowitz + Frontera eficiente) | ✅ Funciona |
| Exportar a CSV | ✅ Funciona |
| Worker threads (no bloquea UI) | ✅ Funciona |
| Gestión de memoria (DataManager) | ✅ Funciona |

#### Problemas conocidos:
- `main.py` tiene múltiples `print(f"DEBUG ...")` que deben eliminarse antes de producción
- `debug_chart.html` se genera en el directorio raíz del repo (no debería estar versionado)
- El modelo de predicción es solo **ARIMA endógeno** (usa únicamente el historial de precios, sin variables exógenas)

#### Arquitectura:
```
main.py            # Controlador principal (QWidget)
ui_setup.py        # Construcción de la interfaz
data_logic.py      # Carga de datos (yFinance) y exportación CSV
analysis_logic.py  # Lógica ARIMA + métricas
plotting.py        # Generación de gráficos Plotly
worker_threads.py  # Threads para descarga y predicción
portfolio_logic.py # Optimización Markowitz
memory_management.py # DataManager (caché, límites de memoria)
config.py          # Colores, constantes
```

---

### 2. `Scripts/beta-test/` — App Web (React + Flask) ★ EN DESARROLLO

**Tecnología:** React (Create React App) + Tailwind CSS + Flask + yFinance + statsmodels

**Estado: Prototipo funcional, más incompleto que la versión PyQt5**

#### Funcionalidades implementadas:
| Feature | Estado |
|---|---|
| Multi-ticker en visualización (Recharts) | ✅ Funciona |
| Backend Flask con API REST | ✅ Funciona |
| Optimización de cartera (endpoint `/api/optimize`) | ✅ Funciona |
| Predicción **SARIMAX** con parámetros estacionales | ✅ Backend listo |
| Auto-ARIMA con pmdarima | ✅ Backend listo |
| Soporte variables **exógenas** en SARIMAX | ✅ Backend listo (no expuesto en UI) |
| Candlestick charts | ❌ Usa `Line` charts (Recharts), sin candlestick nativo |
| Bandas de confianza en UI | ⚠️ Backend lo genera, falta integrar en frontend |
| Exportar CSV | ❌ No implementado |

#### Arquitectura:
```
backend/
  app.py             # Flask app factory
  api/
    routes.py        # Endpoints: /health, /market-data, /optimize, /forecast
    sarimax.py       # Lógica SARIMAX (más avanzada que StockApp)
src/
  App.js             # Toda la UI React en un solo archivo (~1000 líneas)
```

#### Deuda técnica:
- `App.js` es un monolito — toda la UI en un archivo, necesita refactoring en componentes
- La integración del endpoint `/forecast` con la UI es incompleta
- No hay manejo de errores consistente en el frontend

---

### 3. `Scripts/WebApp/` — Versión JS Pura (HTML + JS)

**Estado: Prototipo inicial, sin backend**

- Clase `StockApp` en JS que llama directamente a Yahoo Finance (probablemente con CORS issues)
- Tiene la lógica de Base 100 y esquemas de color portados del PyQt5
- Sin predicción real (marcado como "intento de series temporales con JS")

---

### 4. `Scripts/IpsaPlot/` — Script Standalone

Scripts Python para cargar y graficar el IPSA desde CSV. No es parte de la app principal.

---

## Diagnóstico General

### Fortalezas
- La versión **StockApp (PyQt5)** es la más robusta y completa
- La arquitectura está bien modularizada (separación de concerns)
- El sistema de predicción ARIMA funciona end-to-end con métricas de calidad
- La versión beta-test tiene una base sólida para evolucionar a web

### Debilidades / Deuda técnica
1. **debug_chart.html** commiteado (artefacto de desarrollo)
2. **dmac/** (entorno virtual) estaba excluido por `.gitignore` pero el venv está en la raíz del repo
3. Los `print(DEBUG ...)` en `main.py` deben eliminarse
4. La versión web (`beta-test`) tiene todo en `App.js` — necesita componentización
5. No hay tests automatizados en ninguna versión
6. El modelo de predicción en StockApp usa solo **variables endógenas** (ARIMA puro). La versión beta tiene SARIMAX con exógenas pero no está expuesto en la UI

### Próximos pasos sugeridos
- [ ] Limpiar `print(DEBUG...)` en `main.py` de StockApp
- [ ] Agregar `debug_chart.html` al `.gitignore` raíz
- [ ] Exponer el endpoint `/forecast` de beta-test en la UI React
- [ ] Componentizar `App.js` en componentes React separados
- [ ] Decidir si continuar con PyQt5 o migrar a la versión web

---

## Stack Técnico

| Componente | StockApp (PyQt5) | beta-test (Web) |
|---|---|---|
| UI | PyQt5 + WebEngine | React + Tailwind |
| Charts | Plotly (via WebView) | Recharts |
| Backend | N/A (monolítico) | Flask |
| Datos | yFinance | yFinance |
| Predicción | ARIMA (endógeno) | SARIMAX (endógeno + exógeno) |
| Optimización | Markowitz (SciPy) | Markowitz (SciPy) |
| Python deps | requirements.txt | (sin requirements.txt) |
