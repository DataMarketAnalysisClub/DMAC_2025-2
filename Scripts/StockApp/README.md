# DMAPP - Stock Analysis Application

A desktop application for multi-ticker stock analysis with ARIMA forecasting and
Markowitz portfolio optimization, built with PyQt6 and Plotly.

## Features

- **Multi-ticker Candlestick Charts**: Load up to 10 stock tickers simultaneously using yfinance.
- **Base 100 Normalization**: Compare tickers on a common scale.
- **ARIMA Forecasting**: Automatic (via pmdarima/auto_arima) or manual parameter mode.
  - Confidence intervals (95%) displayed on chart.
  - Model quality metrics: MAPE, MAE%, RMSE%.
- **Markowitz Portfolio Optimization**: Efficient frontier visualization, optimal Sharpe ratio weights.
- **CSV Export**: Download historical data and predictions.
- **Color Schemes**: Classic green/red or DMAC club colors.

## Installation

### Requirements

- Python 3.11+
- Windows (primary target; PyInstaller EXE build via GitHub Actions)

### Steps

```bash
# Clone the repository
git clone <repo-url>
cd Scripts/StockApp

# Install dependencies
pip install -r requirements.txt
```

### Running

```bash
python main.py
```

## Usage

1. **Welcome screen**: Click "Iniciar" to open the main screen.
2. **Load data**: Enter ticker symbols (comma-separated, e.g. `AAPL,MSFT,GOOGL`),
   select frequency and period, then click "Ejecutar".
3. **ARIMA forecast**: Select automatic or manual mode, set the horizon,
   then click "Generar Predicción".
4. **Portfolio optimization**: Requires at least 2 tickers loaded. Set the risk-free
   rate (e.g. `3.0` for 3%), then click "Optimizar Cartera".
5. **Export**: Click "Descargar CSV" to save data to your Downloads folder.

## Project Structure

```
Scripts/StockApp/
├── main.py              # Application entry point; MultiStockApp controller
├── ui_setup.py          # All PyQt6 widget construction
├── config.py            # Color schemes and constants
├── worker_threads.py    # QThread workers: DataFetch, Prediction, Portfolio
├── analysis_logic.py    # ARIMA forecasting logic
├── data_logic.py        # yfinance data fetching and CSV export
├── portfolio_logic.py   # Markowitz optimization (scipy)
├── plotting.py          # Plotly chart generation (stock + efficient frontier)
├── memory_management.py # DataManager class and memory utilities
├── requirements.txt     # Runtime dependencies
├── requirements-dev.txt # Development/test dependencies
├── images/
│   ├── DMAC.png         # Watermark logo
│   └── ICON.ico         # Window icon
└── tests/
    ├── conftest.py
    ├── test_analysis_logic.py
    ├── test_portfolio_logic.py
    ├── test_data_logic.py
    ├── test_memory_management.py
    └── test_integration.py
```

## Development

### Running Tests

```bash
pip install -r requirements-dev.txt
pytest tests/ -v
pytest tests/ --cov=. --cov-report=html   # With coverage report
```

## Building the Executable

The GitHub Actions workflow automatically builds a Windows EXE using PyInstaller on
every push to `Scripts/StockApp/**`.

To build locally:

```bash
pip install pyinstaller
pyinstaller --onefile --name=StockApp --add-data="images;images" --console main.py
```

## Architecture Notes

- **MVC-like separation**: `main.py` acts as controller; `ui_setup.py` is the view;
  logic modules (`analysis_logic`, `portfolio_logic`, `data_logic`) are the model.
- **Threading**: All network calls and heavy computation run in `QThread` workers
  to keep the UI responsive.
- **Memory management**: `DataManager` in `memory_management.py` enforces the 10-ticker
  limit, downcasts float64→float32, and forces `gc.collect()` on data replacement.
- **Logging**: All debug output uses Python's `logging` module.
  Set log level via `logging.basicConfig(level=logging.DEBUG)` in `main.py`.
