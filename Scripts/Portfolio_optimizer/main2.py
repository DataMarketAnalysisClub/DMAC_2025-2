import numpy as np
import pandas as pd
import yfinance as yf
import plotly.graph_objects as go
from scipy.optimize import minimize
from datetime import datetime, timedelta

def get_data(tickers, period='1y'):
    """Download historical data for given tickers"""
    print(f"Downloading data for: {', '.join(tickers)}")
    data = yf.download(tickers, period=period, progress=False)
    
    # Get Adj Close prices
    if 'Adj Close' in data.columns.get_level_values(0):
        prices = data['Adj Close']
    else:
        prices = data['Close']
    
    # Handle single ticker case
    if len(tickers) == 1:
        prices = prices.to_frame()
        prices.columns = tickers
    
    # Remove tickers with no data
    if isinstance(prices, pd.DataFrame):
        prices = prices.dropna(axis=1, how='all')
        valid_tickers = prices.columns.tolist()
        failed = set(tickers) - set(valid_tickers)
        if failed:
            print(f"WARNING: Failed to download data for: {', '.join(failed)}")
        if len(valid_tickers) < 2:
            raise ValueError(f"Need at least 2 valid tickers. Only got: {valid_tickers}")
        return prices, valid_tickers
    
    return prices, tickers

def calculate_returns(prices):
    """Calculate daily returns"""
    returns = prices.pct_change(fill_method=None).dropna()
    return returns

def portfolio_stats(weights, mean_returns, cov_matrix, rf_rate=0.03):
    """Calculate portfolio statistics"""
    portfolio_return = np.sum(mean_returns * weights) * 252
    portfolio_std = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights))) * np.sqrt(252)
    sharpe_ratio = (portfolio_return - rf_rate) / portfolio_std
    return portfolio_return, portfolio_std, sharpe_ratio

def negative_sharpe(weights, mean_returns, cov_matrix, rf_rate=0.03):
    """Negative Sharpe ratio for minimization"""
    return -portfolio_stats(weights, mean_returns, cov_matrix, rf_rate)[2]

def optimize_portfolio(mean_returns, cov_matrix, rf_rate=0.03):
    """Find optimal portfolio (max Sharpe ratio)"""
    num_assets = len(mean_returns)
    constraints = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1})
    bounds = tuple((0, 1) for _ in range(num_assets))
    initial_guess = num_assets * [1. / num_assets]
    
    result = minimize(negative_sharpe, initial_guess, 
                     args=(mean_returns, cov_matrix, rf_rate),
                     method='SLSQP', bounds=bounds, constraints=constraints)
    
    return result.x

def generate_random_portfolios(mean_returns, cov_matrix, num_portfolios=5000, rf_rate=0.03):
    """Generate random portfolios for efficient frontier"""
    num_assets = len(mean_returns)
    results = np.zeros((3, num_portfolios))
    
    for i in range(num_portfolios):
        weights = np.random.random(num_assets)
        weights /= np.sum(weights)
        
        portfolio_return, portfolio_std, sharpe = portfolio_stats(weights, mean_returns, cov_matrix, rf_rate)
        results[0, i] = portfolio_std
        results[1, i] = portfolio_return
        results[2, i] = sharpe
    
    return results

def plot_efficient_frontier(results, optimal_return, optimal_std, tickers, 
                           mean_returns, cov_matrix):
    """Plot efficient frontier and optimal portfolio using Plotly"""
    fig = go.Figure()
    
    # Random portfolios (efficient frontier cloud)
    fig.add_trace(go.Scatter(
        x=results[0, :],
        y=results[1, :],
        mode='markers',
        marker=dict(
            size=4,
            color=results[2, :],
            colorscale='Viridis',
            showscale=True,
            colorbar=dict(title="Sharpe Ratio"),
            opacity=0.5
        ),
        name='Random Portfolios',
        hovertemplate='<b>Risk:</b> %{x:.2%}<br><b>Return:</b> %{y:.2%}<extra></extra>'
    ))
    
    # Individual assets
    asset_std = []
    asset_return = []
    for i, ticker in enumerate(tickers):
        std = np.sqrt(cov_matrix[i, i]) * np.sqrt(252)
        ret = mean_returns[i] * 252
        asset_std.append(std)
        asset_return.append(ret)
    
    fig.add_trace(go.Scatter(
        x=asset_std,
        y=asset_return,
        mode='markers+text',
        marker=dict(size=15, color='red', symbol='diamond', 
                   line=dict(width=2, color='black')),
        text=tickers,
        textposition='top center',
        textfont=dict(size=12, color='red'),
        name='Individual Assets',
        hovertemplate='<b>%{text}</b><br>Risk: %{x:.2%}<br>Return: %{y:.2%}<extra></extra>'
    ))
    
    # Optimal portfolio
    fig.add_trace(go.Scatter(
        x=[optimal_std],
        y=[optimal_return],
        mode='markers+text',
        marker=dict(size=25, color='lime', symbol='star', 
                   line=dict(width=3, color='black')),
        text=['OPTIMAL'],
        textposition='top center',
        textfont=dict(size=14, color='lime', family='Arial Black'),
        name='Optimal Portfolio',
        hovertemplate='<b>Optimal Portfolio</b><br>Risk: %{x:.2%}<br>Return: %{y:.2%}<extra></extra>'
    ))
    
    fig.update_layout(
        title='Efficient Frontier - Markowitz Portfolio Optimization',
        xaxis_title='Annual Volatility (Risk)',
        yaxis_title='Expected Annual Return',
        xaxis=dict(tickformat='.1%'),
        yaxis=dict(tickformat='.1%'),
        hovermode='closest',
        template='plotly_dark',
        width=1200,
        height=700,
        showlegend=True,
        legend=dict(x=0.01, y=0.99)
    )
    
    fig.show()

def main():
    """Main execution function"""
    print("=" * 60)
    print("MARKOWITZ PORTFOLIO OPTIMIZER")
    print("=" * 60)
    
    # Input tickers
    print("\nEnter 5 stock tickers (press Enter for defaults: AAPL, GOOGL, MSFT, JPM, JNJ):")
    user_input = input("Tickers (comma-separated): ").strip()
    
    if user_input:
        tickers = [t.strip().upper() for t in user_input.split(',')]
        if len(tickers) != 5:
            print("Warning: Expected 5 tickers. Using defaults instead.")
            tickers = ['AAPL', 'GOOGL', 'MSFT', 'NVDA', 'BRK-A']
    else:
        tickers = ['AAPL', 'GOOGL', 'MSFT', 'NVDA', 'BRK-A']
    
    print(f"\nAnalyzing portfolio: {', '.join(tickers)}")
    
    # Download data
    try:
        prices, valid_tickers = get_data(tickers, period='1y')
        
        if len(valid_tickers) < len(tickers):
            print(f"\nContinuing with {len(valid_tickers)} valid tickers: {', '.join(valid_tickers)}")
            tickers = valid_tickers
        
        returns = calculate_returns(prices)
        
        # Calculate statistics
        mean_returns = returns.mean().values
        cov_matrix = returns.cov().values
        
        # Optimize portfolio
        print("\nOptimizing portfolio...")
        optimal_weights = optimize_portfolio(mean_returns, cov_matrix)
        optimal_return, optimal_std, optimal_sharpe = portfolio_stats(
            optimal_weights, mean_returns, cov_matrix)
        
        # Generate random portfolios for frontier
        print("Generating efficient frontier...")
        results = generate_random_portfolios(mean_returns, cov_matrix)
        
        # Display results
        print("\n" + "=" * 60)
        print("OPTIMAL PORTFOLIO RESULTS")
        print("=" * 60)
        print(f"\nExpected Annual Return: {optimal_return*100:.2f}%")
        print(f"Annual Volatility (Risk): {optimal_std*100:.2f}%")
        print(f"Sharpe Ratio: {optimal_sharpe:.2f}")
        
        print("\nOptimal Weights:")
        print("-" * 40)
        for ticker, weight in zip(tickers, optimal_weights):
            print(f"{ticker:>8}: {weight*100:>6.2f}%")
        print("-" * 40)
        print(f"{'TOTAL':>8}: {np.sum(optimal_weights)*100:>6.2f}%")
        
        print("\nIndividual Asset Statistics:")
        print("-" * 60)
        for i, ticker in enumerate(tickers):
            asset_return = mean_returns[i] * 252 * 100
            asset_std = np.sqrt(cov_matrix[i, i]) * np.sqrt(252) * 100
            print(f"{ticker:>8}: Return = {asset_return:>6.2f}%  |  Risk = {asset_std:>6.2f}%")
        
        # Plot
        print("\nGenerating plot...")
        plot_efficient_frontier(results, optimal_return, optimal_std, 
                               tickers, mean_returns, cov_matrix)
        
    except Exception as e:
        print(f"\nError: {e}")
        print("Please check ticker symbols and try again.")

if __name__ == "__main__":
    main()
