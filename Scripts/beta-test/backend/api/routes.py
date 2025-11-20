from flask import Blueprint, request, jsonify
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
from scipy.optimize import minimize
import traceback

api_bp = Blueprint('api', __name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Helper Functions (Your Improved Logic) ---

def calculate_returns(prices_dict):
    """
    Calculate daily returns from price DataFrames.
    
    Args:
        prices_dict: Dict of {ticker: DataFrame} with 'Close' column
    
    Returns:
        DataFrame with returns for each ticker
    """
    returns_data = {}
    
    for ticker, df in prices_dict.items():
        # Ensure 'Close' is numeric and handle potential missing values
        close_prices = pd.to_numeric(df['Close'], errors='coerce')
        returns = close_prices.pct_change().dropna()
        returns_data[ticker] = returns
    
    returns_df = pd.DataFrame(returns_data)
    returns_df = returns_df.dropna()
    
    return returns_df

def portfolio_stats(weights, mean_returns, cov_matrix, rf_rate):
    """
    Calculate portfolio statistics.
    
    Returns:
        tuple: (annual_return, annual_volatility, sharpe_ratio)
    """
    portfolio_return = np.sum(mean_returns * weights) * 252  # Annualized
    portfolio_std = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights))) * np.sqrt(252)
    sharpe_ratio = (portfolio_return - rf_rate) / portfolio_std if portfolio_std > 0 else 0
    
    return portfolio_return, portfolio_std, sharpe_ratio

def negative_sharpe(weights, mean_returns, cov_matrix, rf_rate):
    """Negative Sharpe ratio for minimization"""
    return -portfolio_stats(weights, mean_returns, cov_matrix, rf_rate)[2]

def optimize_portfolio_weights(mean_returns, cov_matrix, rf_rate):
    """
    Find optimal portfolio weights (maximize Sharpe ratio).
    Renamed from optimize_portfolio to avoid conflict with route logic.
    
    Returns:
        np.array: Optimal weights
    """
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

def generate_random_portfolios(mean_returns, cov_matrix, rf_rate, num_portfolios=5000):
    """
    Generate random portfolios for efficient frontier visualization.
    
    Returns:
        np.array: Shape (3, num_portfolios) with [volatility, return, sharpe]
    """
    num_assets = len(mean_returns)
    results = np.zeros((3, num_portfolios))
    
    for i in range(num_portfolios):
        weights = np.random.random(num_assets)
        weights /= np.sum(weights)
        
        portfolio_return, portfolio_std, sharpe = portfolio_stats(
            weights, mean_returns, cov_matrix, rf_rate
        )
        
        results[0, i] = portfolio_std
        results[1, i] = portfolio_return
        results[2, i] = sharpe
    
    return results

def run_portfolio_optimization(current_data, tickers, rf_rate):
    """
    Main function to run portfolio optimization.
    
    Args:
        current_data: Dict of {ticker: DataFrame}
        tickers: List of ticker symbols
        rf_rate: Risk-free rate (e.g., 0.03 for 3%)
    
    Returns:
        dict: Contains optimal_weights, stats, random_portfolios, etc.
        str: Error message if failed
    """
    try:
        if len(tickers) < 2:
            return None, "Se necesitan al menos 2 tickers para optimización de cartera"
        
        # Calculate returns
        returns_df = calculate_returns(current_data)
        
        if returns_df.empty:
            return None, "No hay suficientes datos para calcular retornos"
        
        # Calculate statistics
        mean_returns = returns_df.mean().values
        cov_matrix = returns_df.cov().values
        
        # Optimize portfolio
        optimal_weights = optimize_portfolio_weights(mean_returns, cov_matrix, rf_rate)
        optimal_return, optimal_std, optimal_sharpe = portfolio_stats(
            optimal_weights, mean_returns, cov_matrix, rf_rate
        )
        
        # Generate random portfolios for frontier
        random_portfolios = generate_random_portfolios(
            mean_returns, cov_matrix, rf_rate, num_portfolios=2000 # Reduced for faster API response
        )
        
        # Calculate individual asset stats
        asset_stats = []
        for i, ticker in enumerate(tickers):
            asset_return = mean_returns[i] * 252
            asset_std = np.sqrt(cov_matrix[i, i]) * np.sqrt(252)
            asset_stats.append({
                'ticker': ticker,
                'return': asset_return,
                'volatility': asset_std
            })
        
        # Prepare result for JSON response (convert numpy types to native python types)
        # Random portfolios need to be converted to list of dicts for the frontend chart
        frontier_data = []
        for i in range(random_portfolios.shape[1]):
             frontier_data.append({
                'x': random_portfolios[0, i] * 100,  # Risk %
                'y': random_portfolios[1, i] * 100,  # Return %
                'z': random_portfolios[2, i],        # Sharpe
                'id': i
            })

        result = {
            'optimal': {
                'x': optimal_std * 100,
                'y': optimal_return * 100,
                'z': optimal_sharpe,
                'weights': optimal_weights.tolist()
            },
            'frontier': frontier_data,
            'asset_stats': asset_stats,
            'tickers': tickers # Pass back to align weights
        }
        
        return result, None
        
    except Exception as e:
        traceback.print_exc()
        return None, f"Error en optimización: {str(e)}"

def fetch_stock_data_df(ticker, period="2y", interval="1d"):
    """
    Fetches stock data and returns a pandas DataFrame compatible with your logic.
    """
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period=period, interval=interval)
        
        if hist.empty:
            return None
        
        # Keep index as Date for calculation logic, but ensure it's datetime
        return hist[['Close']]
    except Exception as e:
        logger.error(f"Error fetching {ticker}: {str(e)}")
        return None

# --- Routes ---

@api_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'online', 'timestamp': datetime.now().isoformat()})

@api_bp.route('/market-data', methods=['POST'])
def get_market_data():
    """
    Expects JSON: { "tickers": ["AAPL", "MSFT"], "period": "1y" }
    """
    req_data = request.get_json()
    tickers = req_data.get('tickers', [])
    period = req_data.get('period', '1y')
    
    if not tickers:
        return jsonify({'error': 'No tickers provided'}), 400
    
    results = {}
    for ticker in tickers:
        # Use the fetch function that returns a list of dicts for the frontend chart
        # Re-implementing simple fetch for visualization here to avoid conflict
        try:
            stock = yf.Ticker(ticker)
            hist = stock.history(period=period, interval="1d")
            if not hist.empty:
                hist = hist.reset_index()
                data = []
                for _, row in hist.iterrows():
                    date_str = row['Date'].strftime('%Y-%m-%d')
                    data.append({'date': date_str, 'price': row['Close']})
                results[ticker] = data
            else:
                results[ticker] = {'error': 'Failed to fetch data'}
        except Exception as e:
            results[ticker] = {'error': str(e)}
            
    return jsonify(results)

@api_bp.route('/optimize', methods=['POST'])
def optimize_portfolio_route():
    """
    Expects JSON: { "tickers": ["AAPL", "MSFT"], "rf_rate": 0.03 }
    Uses the improved logic functions.
    """
    req_data = request.get_json()
    tickers = req_data.get('tickers', [])
    rf_rate = req_data.get('rf_rate', 0.03)
    
    # 1. Prepare Data Dictionary for Logic
    current_data = {}
    valid_tickers = []
    
    for t in tickers:
        df = fetch_stock_data_df(t)
        if df is not None and not df.empty:
            current_data[t] = df
            valid_tickers.append(t)
            
    if len(valid_tickers) < 2:
        return jsonify({'error': 'Need at least 2 valid tickers for optimization'}), 400
    
    # 2. Run Optimization Logic
    result, error = run_portfolio_optimization(current_data, valid_tickers, rf_rate)
    
    if error:
        return jsonify({'error': error}), 500
        
    return jsonify(result)

@api_bp.route('/forecast', methods=['POST'])
def forecast_arima():
    """
    Expects JSON: { "ticker": "AAPL", "order": [1,1,1], "seasonal": [0,1,1,12] }
    """
    req_data = request.get_json()
    ticker = req_data.get('ticker')
    
    return jsonify({
        'message': f'SARIMAX calculation for {ticker} received',
        'status': 'processing_simulated' 
    })
