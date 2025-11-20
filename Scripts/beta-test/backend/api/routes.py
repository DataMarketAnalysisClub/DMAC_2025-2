from flask import Blueprint, request, jsonify
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
from scipy.optimize import minimize
import traceback

# Import the new SARIMAX logic
from api.sarimax import fit_sarimax

api_bp = Blueprint('api', __name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Data Fetching Helpers ---

def fetch_stock_data_list(ticker, period="2y", interval="1d"):
    """
    Fetches stock data and returns a list of dictionaries.
    Useful for frontend charts and SARIMAX logic.
    """
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period=period, interval=interval)
        
        if hist.empty:
            return None
        
        hist = hist.reset_index()
        data = []
        for _, row in hist.iterrows():
            date_val = row['Date']
            if isinstance(date_val, pd.Timestamp):
                date_str = date_val.strftime('%Y-%m-%d')
            else:
                date_str = str(date_val).split(' ')[0]

            data.append({
                'date': date_str,
                'price': row['Close']
            })
        return data
    except Exception as e:
        logger.error(f"Error fetching list for {ticker}: {str(e)}")
        return None

def fetch_stock_data_df(ticker, period="2y", interval="1d"):
    """
    Fetches stock data and returns a pandas DataFrame.
    Useful for Portfolio Optimization math.
    """
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period=period, interval=interval)
        
        if hist.empty:
            return None
        
        return hist[['Close']]
    except Exception as e:
        logger.error(f"Error fetching DF for {ticker}: {str(e)}")
        return None

# --- Optimization Logic ---

def calculate_returns(prices_dict):
    returns_data = {}
    for ticker, df in prices_dict.items():
        close_prices = pd.to_numeric(df['Close'], errors='coerce')
        returns = close_prices.pct_change().dropna()
        returns_data[ticker] = returns
    
    returns_df = pd.DataFrame(returns_data)
    returns_df = returns_df.dropna()
    return returns_df

def portfolio_stats(weights, mean_returns, cov_matrix, rf_rate):
    portfolio_return = np.sum(mean_returns * weights) * 252
    portfolio_std = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights))) * np.sqrt(252)
    if portfolio_std == 0:
        return 0, 0, 0
    sharpe_ratio = (portfolio_return - rf_rate) / portfolio_std
    return portfolio_return, portfolio_std, sharpe_ratio

def negative_sharpe(weights, mean_returns, cov_matrix, rf_rate):
    return -portfolio_stats(weights, mean_returns, cov_matrix, rf_rate)[2]

def optimize_portfolio_weights(mean_returns, cov_matrix, rf_rate):
    num_assets = len(mean_returns)
    constraints = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1})
    bounds = tuple((0, 1) for _ in range(num_assets))
    initial_guess = num_assets * [1. / num_assets]
    
    result = minimize(
        negative_sharpe, 
        initial_guess,
        args=(mean_returns, cov_matrix, rf_rate),
        method='SLSQP', 
        bounds=bounds, 
        constraints=constraints
    )
    if not result.success:
        raise ValueError(f"Optimization failed: {result.message}")
    return result.x

def generate_random_portfolios(mean_returns, cov_matrix, rf_rate, num_portfolios=2000):
    num_assets = len(mean_returns)
    results = np.zeros((3, num_portfolios))
    
    for i in range(num_portfolios):
        weights = np.random.random(num_assets)
        weights /= np.sum(weights)
        p_ret, p_std, p_sharpe = portfolio_stats(weights, mean_returns, cov_matrix, rf_rate)
        results[0, i] = p_std
        results[1, i] = p_ret
        results[2, i] = p_sharpe
    return results

def run_portfolio_optimization(current_data, tickers, rf_rate):
    try:
        returns_df = calculate_returns(current_data)
        if returns_df.empty:
            return None, "Insufficient data for returns calculation"
        
        mean_returns = returns_df.mean().values
        cov_matrix = returns_df.cov().values
        
        optimal_weights = optimize_portfolio_weights(mean_returns, cov_matrix, rf_rate)
        opt_ret, opt_std, opt_sharpe = portfolio_stats(optimal_weights, mean_returns, cov_matrix, rf_rate)
        
        random_portfolios = generate_random_portfolios(mean_returns, cov_matrix, rf_rate)
        
        asset_stats = []
        for i, ticker in enumerate(tickers):
            asset_ret = mean_returns[i] * 252
            asset_std = np.sqrt(cov_matrix[i, i]) * np.sqrt(252)
            asset_stats.append({
                'ticker': ticker,
                'return': asset_ret,
                'volatility': asset_std
            })
            
        frontier_data = []
        for i in range(random_portfolios.shape[1]):
             frontier_data.append({
                'x': random_portfolios[0, i] * 100,
                'y': random_portfolios[1, i] * 100,
                'z': random_portfolios[2, i],
                'id': i
            })

        result = {
            'optimal': {
                'x': opt_std * 100,
                'y': opt_ret * 100,
                'z': opt_sharpe,
                'weights': optimal_weights.tolist()
            },
            'frontier': frontier_data,
            'asset_stats': asset_stats,
            'tickers': tickers
        }
        return result, None
    except Exception as e:
        traceback.print_exc()
        return None, str(e)


# --- API Endpoints ---

@api_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'online'})

@api_bp.route('/market-data', methods=['POST'])
def get_market_data():
    req = request.get_json()
    tickers = req.get('tickers', [])
    period = req.get('period', '2y')
    interval = req.get('interval', '1d')
    
    results = {}
    for t in tickers:
        data = fetch_stock_data_list(t, period, interval)
        if data:
            results[t] = data
        else:
            results[t] = {'error': 'Failed to fetch'}
            
    return jsonify(results)

@api_bp.route('/optimize', methods=['POST'])
def optimize_route():
    req = request.get_json()
    tickers = req.get('tickers', [])
    rf_rate = req.get('rf_rate', 0.03)
    period = req.get('period', '2y')
    
    current_data = {}
    valid_tickers = []
    
    for t in tickers:
        df = fetch_stock_data_df(t, period=period)
        if df is not None and not df.empty:
            current_data[t] = df
            valid_tickers.append(t)
            
    if len(valid_tickers) < 2:
        return jsonify({'error': 'Need at least 2 valid tickers'}), 400
        
    result, error = run_portfolio_optimization(current_data, valid_tickers, rf_rate)
    if error:
        return jsonify({'error': error}), 500
        
    return jsonify(result)

@api_bp.route('/forecast', methods=['POST'])
def forecast_route():
    """
    Runs SARIMAX forecast with optional Auto-ARIMA and Exogenous variables.
    Expects: { 
        "ticker": "AAPL", 
        "exog_tickers": ["SPY", "USO"], 
        "auto_fit": true,
        "p": 1, "d": 1, "q": 1, ... 
    }
    """
    req = request.get_json()
    ticker = req.get('ticker')
    exog_tickers = req.get('exog_tickers', []) # List of strings
    auto_fit = req.get('auto_fit', False)
    
    # ARIMA Order
    p = int(req.get('p', 1))
    d = int(req.get('d', 1))
    q = int(req.get('q', 1))
    
    # Seasonal Order
    P = int(req.get('P', 0))
    D = int(req.get('D', 1))
    Q = int(req.get('Q', 1))
    s = int(req.get('s', 12))
    
    period = req.get('period', '2y')
    
    # 1. Fetch Target Data
    history_data = fetch_stock_data_list(ticker, period=period)
    
    if not history_data:
        return jsonify({'error': f'Could not fetch data for {ticker}'}), 404
        
    # 2. Fetch Exogenous Data
    exog_data_list = []
    if exog_tickers:
        # We need to fetch all exog data and align it by date
        # First, get dict of {ticker: [{date, price}, ...]}
        raw_exog = {}
        for et in exog_tickers:
            edata = fetch_stock_data_list(et, period=period)
            if edata:
                # Convert to simple dict {date: price} for easier merging
                raw_exog[et] = {d['date']: d['price'] for d in edata}
        
        # Now merge into a single list of dicts aligned with history_data dates or union of dates
        # fit_sarimax handles alignment via Pandas, so we just need a list of dicts
        # containing {'date': '...', 'SPY': 100, 'USO': 50}
        
        # Get all unique dates from all exog sources
        all_dates = set()
        for et in raw_exog:
            all_dates.update(raw_exog[et].keys())
            
        for date_str in sorted(all_dates):
            row = {'date': date_str}
            has_data = False
            for et in exog_tickers:
                if et in raw_exog and date_str in raw_exog[et]:
                    row[et] = raw_exog[et][date_str]
                    has_data = True
                else:
                    row[et] = None # Pandas will handle missing or we fill later
            if has_data:
                exog_data_list.append(row)

    # 3. Fit SARIMAX
    result = fit_sarimax(
        history_data, 
        exog_data=exog_data_list,
        order=(p, d, q), 
        seasonal_order=(P, D, Q, s),
        forecast_steps=15,
        auto_fit=auto_fit
    )
    
    if not result:
        return jsonify({'error': 'Model fitting failed. Check logs.'}), 500
        
    return jsonify({
        'history': history_data,
        'forecast': result['forecast'],
        'lower_ci': result['lower_ci'],
        'upper_ci': result['upper_ci'],
        'dates': result['dates'],
        'metrics': result['metrics'],
        'params': result.get('params', {}) # Return best params if auto_fit used
    })
