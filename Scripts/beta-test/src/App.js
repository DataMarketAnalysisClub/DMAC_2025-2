import React, { useState } from 'react';
import { 
  Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  ScatterChart, Scatter, Area, ComposedChart, LineChart
} from 'recharts';
import { 
  Calculator, TrendingUp, PieChart, 
  Search, AlertCircle, Calendar, Clock, Activity, Layers, Settings
} from 'lucide-react';

// --- API UTILITIES ---

const API_BASE_URL = "http://localhost:5000/api";

// Fetch real market data from Python backend
const fetchMarketData = async (tickers, period="2y", interval="1d") => {
  try {
    const response = await fetch(`${API_BASE_URL}/market-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        tickers: Array.isArray(tickers) ? tickers : [tickers], 
        period,
        interval
      })
    });
    
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch market data:", error);
    return null;
  }
};

// Call optimization endpoint
const fetchOptimization = async (tickers, rfRate, period="2y", interval="1d") => {
  try {
    const response = await fetch(`${API_BASE_URL}/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
          tickers, 
          rf_rate: rfRate / 100,
          period,     
          interval    
      })
    });
    if (!response.ok) throw new Error('Optimization failed');
    return await response.json();
  } catch (error) {
    console.error("Optimization error:", error);
    return null;
  }
};

// Call Forecast endpoint
const fetchForecast = async (payload) => {
    try {
      const response = await fetch(`${API_BASE_URL}/forecast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Forecast failed');
      return await response.json();
    } catch (error) {
      console.error("Forecast error:", error);
      return null;
    }
  };

// --- COMPONENTS ---

const PortfolioOptimizer = () => {
  const [tickers, setTickers] = useState('AAPL, MSFT, GOOGL, AMZN');
  const [rfRate, setRfRate] = useState(3.0);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [frontierData, setFrontierData] = useState([]);
  const [optimalPortfolio, setOptimalPortfolio] = useState(null);
  const [assetStats, setAssetStats] = useState([]);
  
  // New State for Time Parameters
  const [period, setPeriod] = useState('2y');
  const [interval, setInterval] = useState('1d');
  
  // Visualization state
  const [marketData, setMarketData] = useState([]);
  const [viewMode, setViewMode] = useState('normalized'); 
  const [errorMsg, setErrorMsg] = useState(null);

  const handleOptimize = async () => {
    setIsOptimizing(true);
    setErrorMsg(null);
    
    const tickerList = tickers.split(',').map(t => t.trim().toUpperCase()).filter(t => t.length > 0);
    
    if (tickerList.length < 2) {
        setErrorMsg("Please enter at least 2 valid tickers.");
        setIsOptimizing(false);
        return;
    }
    
    try {
        // 1. Fetch Historical Data
        const dataResponse = await fetchMarketData(tickerList, period, interval);
        
        if (dataResponse) {
            const processedData = [];
            const refTicker = tickerList[0]; 
            
            if (dataResponse[refTicker] && !dataResponse[refTicker].error) {
                dataResponse[refTicker].forEach((point, idx) => {
                    const mergedPoint = { date: point.date };
                    
                    tickerList.forEach(t => {
                        const tData = dataResponse[t];
                        if (tData && !tData.error && tData[idx]) {
                           mergedPoint[t] = tData[idx].price;
                        }
                    });
                    processedData.push(mergedPoint);
                });
                setMarketData(processedData);
            }
        }

        // 2. Run Optimization
        const optResponse = await fetchOptimization(tickerList, rfRate, period, interval);
        
        if (optResponse && optResponse.frontier) {
            setFrontierData(optResponse.frontier);
            setOptimalPortfolio(optResponse.optimal);
            if (optResponse.tickers && optResponse.optimal.weights) {
                const stats = optResponse.tickers.map((t, i) => ({
                    ticker: t,
                    weight: optResponse.optimal.weights[i] * 100
                })).sort((a, b) => b.weight - a.weight); 
                setAssetStats(stats);
            }
        } else {
            setErrorMsg("Optimization failed. Check backend logs.");
        }

    } catch (err) {
        setErrorMsg("An unexpected error occurred.");
    } finally {
        setIsOptimizing(false);
    }
  };

  // Helper to normalize data for the view
  const getDisplayData = () => {
      if (viewMode === 'absolute') return marketData;
      
      if (marketData.length === 0) return [];
      const firstPoint = marketData[0];
      
      return marketData.map(pt => {
          const newPt = { date: pt.date };
          Object.keys(pt).forEach(key => {
              if (key !== 'date' && typeof pt[key] === 'number') {
                  const startPrice = firstPoint[key];
                  newPt[key] = startPrice ? (pt[key] / startPrice) * 100 : 0;
              }
          });
          return newPt;
      });
  };

  const displayData = getDisplayData();

  return (
    <div className="space-y-6">
      {/* Controls Panel */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <PieChart className="w-6 h-6 text-indigo-600" />
              Markowitz Portfolio Optimization
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Configure parameters to analyze performance and optimize allocation.
            </p>
          </div>
          
          <button 
            onClick={handleOptimize}
            disabled={isOptimizing}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 text-white ${isOptimizing ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {isOptimizing ? (
              <span className="animate-spin">↻</span> 
            ) : (
              <Calculator className="w-4 h-4" />
            )}
            {isOptimizing ? 'Calculating...' : 'Run Analysis'}
          </button>
        </div>

        {/* Input Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-2">
             <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Tickers (comma sep)</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    value={tickers}
                    onChange={(e) => setTickers(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
             </div>
             
             <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Period
                </label>
                <select 
                    value={period} 
                    onChange={(e) => setPeriod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                    <option value="1mo">1 Month</option>
                    <option value="3mo">3 Months</option>
                    <option value="6mo">6 Months</option>
                    <option value="1y">1 Year</option>
                    <option value="2y">2 Years</option>
                    <option value="5y">5 Years</option>
                    <option value="10y">10 Years</option>
                    <option value="max">Max</option>
                </select>
             </div>

             <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Interval
                </label>
                <select 
                    value={interval} 
                    onChange={(e) => setInterval(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                    <option value="1d">Daily</option>
                    <option value="1wk">Weekly</option>
                    <option value="1mo">Monthly</option>
                </select>
             </div>
        </div>
        
        <div className="pt-4 border-t border-slate-100">
             <div className="w-32">
                <label className="block text-xs font-medium text-slate-500 mb-1">Risk Free Rate (%)</label>
                <input 
                  type="number" 
                  value={rfRate}
                  onChange={(e) => setRfRate(parseFloat(e.target.value))}
                  step="0.1"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
             </div>
        </div>

        {errorMsg && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {errorMsg}
            </div>
        )}
      </div>

      {/* Section 1: Wide Historical Performance Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[450px] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-slate-700">Historical Performance</h3>
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button 
              onClick={() => setViewMode('normalized')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'normalized' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
            >
              Base 100
            </button>
            <button 
               onClick={() => setViewMode('absolute')}
               className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'absolute' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
            >
              Absolute ($)
            </button>
          </div>
        </div>
        
        <div className="flex-1">
           {displayData.length > 0 ? (
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={displayData}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                 <XAxis dataKey="date" tick={{fontSize: 10}} minTickGap={30} />
                 <YAxis domain={['auto', 'auto']} tick={{fontSize: 10}} />
                 <Tooltip 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    formatter={(value) => [value.toFixed(2), '']}
                 />
                 <Legend />
                 {Object.keys(displayData[0]).filter(k => k !== 'date').map((ticker, idx) => (
                   <Line 
                      key={ticker} 
                      type="monotone" 
                      dataKey={ticker} 
                      stroke={`hsl(${idx * 60 + 200}, 70%, 50%)`} 
                      strokeWidth={2}
                      dot={false} 
                   />
                 ))}
               </LineChart>
             </ResponsiveContainer>
           ) : (
             <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                Enter tickers and click "Run Analysis" to visualize data.
             </div>
           )}
        </div>
      </div>

      {/* Section 2: Portfolio Optimization Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Col: Efficient Frontier Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[450px] flex flex-col">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Efficient Frontier</h3>
          <div className="flex-1">
            {frontierData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name="Volatility" 
                    unit="%" 
                    tick={{fill: '#94a3b8', fontSize: 12}}
                    tickFormatter={(value) => value.toFixed(1)}
                    label={{ value: 'Risk (σ)', position: 'insideBottom', offset: -10, fill: '#64748b' }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name="Return" 
                    unit="%" 
                    tick={{fill: '#94a3b8', fontSize: 12}}
                    tickFormatter={(value) => value.toFixed(1)}
                    label={{ value: 'Return', angle: -90, position: 'insideLeft', fill: '#64748b' }}
                  />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }} 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    formatter={(value) => [value.toFixed(2) + '%', '']}
                  />
                  <Scatter name="Portfolios" data={frontierData} fill="#818cf8" opacity={0.4} />
                  {optimalPortfolio && (
                    <Scatter name="Optimal" data={[optimalPortfolio]} fill="#10b981" shape="star" r={12} />
                  )}
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
               <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  Waiting for optimization data...
               </div>
            )}
          </div>
        </div>

        {/* Right Col: Optimal Portfolio Statistics */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[450px] overflow-y-auto">
            <h3 className="text-sm font-semibold text-slate-700 mb-6 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Optimal Portfolio Stats
            </h3>

            {optimalPortfolio ? (
                <div className="space-y-6">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Exp. Return</span>
                            <div className="text-xl font-mono font-bold text-emerald-600 mt-1">
                                {optimalPortfolio.y.toFixed(2)}%
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Risk (Std Dev)</span>
                            <div className="text-xl font-mono font-bold text-amber-600 mt-1">
                                {optimalPortfolio.x.toFixed(2)}%
                            </div>
                        </div>
                        <div className="col-span-2 p-4 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center">
                            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Sharpe Ratio</span>
                            <div className="text-2xl font-mono font-bold text-slate-800">
                                {optimalPortfolio.z.toFixed(2)}
                            </div>
                        </div>
                    </div>

                    {/* Composition Table */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 border-b border-slate-100 pb-2">
                            Portfolio Composition
                        </h4>
                        <div className="space-y-3">
                            {assetStats.map((asset) => (
                                <div key={asset.ticker} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1">
                                        <span className="font-semibold text-slate-700 w-12">{asset.ticker}</span>
                                        <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                            <div 
                                                className="bg-indigo-500 h-full rounded-full" 
                                                style={{ width: `${asset.weight}%` }}
                                            />
                                        </div>
                                    </div>
                                    <span className="text-sm font-mono font-medium text-slate-600 ml-4 w-16 text-right">
                                        {asset.weight.toFixed(2)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm italic">
                    <PieChart className="w-8 h-8 mb-2 opacity-20" />
                    <p>Run optimization to see results...</p>
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

const SarimaxForecaster = () => {
    const [targetTicker, setTargetTicker] = useState('AAPL');
    const [exogTickers, setExogTickers] = useState('SPY, ^VIX');
    const [autoFit, setAutoFit] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [forecastResults, setForecastResults] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    
    // SARIMA Parameters
    const [params, setParams] = useState({ p: 1, d: 1, q: 1, P: 0, D: 1, Q: 1, s: 12 });
  
    const handleForecast = async () => {
      setIsProcessing(true);
      setErrorMsg(null);
      
      const exogList = exogTickers.split(',').map(t => t.trim().toUpperCase()).filter(t => t.length > 0);
      
      const payload = {
          ticker: targetTicker.trim().toUpperCase(),
          exog_tickers: exogList,
          auto_fit: autoFit,
          p: params.p, d: params.d, q: params.q,
          P: params.P, D: params.D, Q: params.Q, s: params.s,
          period: "2y" // Default period for fitting
      };
  
      const result = await fetchForecast(payload);
      
      if (result && !result.error) {
          // Format for chart
          const chartData = [];
          
          // Add history
          result.history.forEach(h => {
              chartData.push({
                  date: h.date,
                  actual: h.price,
                  forecast: null,
                  upperCI: null,
                  lowerCI: null
              });
          });
          
          // Add forecast
          result.dates.forEach((date, idx) => {
              chartData.push({
                  date: date,
                  actual: null,
                  forecast: result.forecast[idx],
                  upperCI: result.upper_ci[idx],
                  lowerCI: result.lower_ci[idx]
              });
          });
          
          setForecastResults({ ...result, chartData });
      } else {
          setErrorMsg(result?.error || "Forecasting failed");
      }
      
      setIsProcessing(false);
    };
  
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Model Configuration
            </h3>
            
            <div className="space-y-4">
              {/* Tickers */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Target Ticker (Y)</label>
                <input 
                  value={targetTicker} 
                  onChange={(e) => setTargetTicker(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Exogenous (X) (comma sep)</label>
                <input 
                  value={exogTickers} 
                  onChange={(e) => setExogTickers(e.target.value)}
                  placeholder="e.g. SPY, ^VIX"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Model uses lagged values (t-1) for prediction</p>
              </div>

              {/* Auto Fit Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                 <span className="text-xs font-bold text-slate-500">Auto-Fit Parameters</span>
                 <button 
                    onClick={() => setAutoFit(!autoFit)}
                    className={`w-10 h-5 rounded-full p-1 transition-colors ${autoFit ? 'bg-indigo-600' : 'bg-slate-300'}`}
                 >
                    <div className={`bg-white w-3 h-3 rounded-full shadow-sm transform transition-transform ${autoFit ? 'translate-x-5' : ''}`} />
                 </button>
              </div>
  
              {/* Manual Params */}
              <div className={`pt-2 space-y-3 transition-opacity ${autoFit ? 'opacity-50 pointer-events-none' : ''}`}>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">ARIMA Order (p,d,q)</label>
                    <div className="flex gap-2">
                        {['p', 'd', 'q'].map(k => (
                        <input 
                            key={k} type="number" placeholder={k}
                            value={params[k]}
                            onChange={e => setParams({...params, [k]: parseInt(e.target.value)})}
                            className="w-full px-2 py-1 text-center border border-slate-200 rounded text-sm"
                        />
                        ))}
                    </div>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Seasonal (P,D,Q,s)</label>
                    <div className="grid grid-cols-4 gap-2">
                        {['P', 'D', 'Q', 's'].map(k => (
                        <input 
                            key={k} type="number" placeholder={k}
                            value={params[k]}
                            onChange={e => setParams({...params, [k]: parseInt(e.target.value)})}
                            className="w-full px-1 py-1 text-center border border-slate-200 rounded text-sm"
                        />
                        ))}
                    </div>
                 </div>
              </div>
  
              <button 
                  onClick={handleForecast}
                  disabled={isProcessing}
                  className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                  {isProcessing ? <span className="animate-spin">↻</span> : <TrendingUp className="w-4 h-4" />}
                  Run SARIMAX
              </button>
              
              {errorMsg && (
                <div className="mt-2 p-2 bg-red-50 text-red-600 text-xs rounded flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errorMsg}
                </div>
              )}
            </div>
          </div>

          {/* Metrics */}
          {forecastResults && (
             <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
               <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Performance</h3>
               <div className="grid grid-cols-2 gap-3">
                 <div className="p-3 bg-slate-50 rounded border border-slate-100">
                    <div className="text-xs text-slate-400">AIC</div>
                    <div className="font-mono font-bold text-slate-700">{forecastResults.metrics.aic}</div>
                 </div>
                 <div className="p-3 bg-slate-50 rounded border border-slate-100">
                    <div className="text-xs text-slate-400">MAPE</div>
                    <div className="font-mono font-bold text-emerald-600">{forecastResults.metrics.mape}%</div>
                 </div>
                 <div className="p-3 bg-slate-50 rounded border border-slate-100 col-span-2">
                    <div className="text-xs text-slate-400">MAE</div>
                    <div className="font-mono font-bold text-amber-600">{forecastResults.metrics.mae}</div>
                 </div>
               </div>
             </div>
          )}
        </div>
  
        {/* Forecast Chart */}
        <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[600px]">
           <div className="flex justify-between items-center mb-4">
               <div>
                <h2 className="text-xl font-bold text-slate-800 mb-1">Forecast: {targetTicker}</h2>
                {forecastResults?.params && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Layers className="w-3 h-3" />
                        Order: {JSON.stringify(forecastResults.params.order)} x {JSON.stringify(forecastResults.params.seasonal_order)}
                    </div>
                )}
               </div>
           </div>
           
           <ResponsiveContainer width="100%" height="90%">
              {forecastResults ? (
                  <ComposedChart data={forecastResults.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCi" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{fontSize: 10}} minTickGap={30} />
                      <YAxis domain={['auto', 'auto']} tick={{fontSize: 10}} />
                      <Tooltip contentStyle={{ borderRadius: '8px' }}/>
                      <Legend />
                      
                      <Line type="monotone" dataKey="actual" name="Historical" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      
                      {/* Confidence Interval Area */}
                      <Area type="monotone" dataKey="upperCI" stroke="none" fill="url(#colorCi)" name="95% CI" />
                      
                      {/* We draw a second invisible area for the lower bound to create the 'band' effect visually using a clever trick or just rely on the single area if it fills from 0. 
                          Better approach for bands in Recharts is separate Area with range, but Area only supports 1 value. 
                          Standard hack: Draw Area for Upper, and overlay white Area for Lower? No.
                          Best Recharts way: Use 'range' in Area if supported or just fill from 0.
                          Simpler Visual: Just lines for CI bounds + Line for forecast.
                      */}
                      <Line type="monotone" dataKey="upperCI" stroke="#10b981" strokeWidth={1} strokeDasharray="3 3" dot={false} name="Upper Bound" />
                      <Line type="monotone" dataKey="lowerCI" stroke="#10b981" strokeWidth={1} strokeDasharray="3 3" dot={false} name="Lower Bound" />
                      
                      <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#10b981" strokeWidth={3} dot={{r:3}} />
                  </ComposedChart>
              ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                      Configure model and run forecast to see results
                  </div>
              )}
           </ResponsiveContainer>
        </div>
      </div>
    );
  };

const App = () => {
  const [activeTab, setActiveTab] = useState('portfolio');

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-2 rounded-lg shadow-sm">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 leading-none">DMAPP</h1>
                <span className="text-[11px] font-medium text-slate-500 tracking-wide">QUANT ANALYTICS SUITE</span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full border border-slate-200">
               <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
               <span className="text-xs font-medium text-slate-600">System Operational</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <nav className="md:w-64 flex-shrink-0 space-y-2">
            <button 
              onClick={() => setActiveTab('portfolio')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'portfolio' ? 'bg-white text-indigo-600 shadow-md border border-indigo-100' : 'text-slate-600 hover:bg-white hover:shadow-sm'}`}
            >
              <PieChart className="w-5 h-5" />
              Portfolio Optimization
            </button>
            <button 
              onClick={() => setActiveTab('forecasting')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'forecasting' ? 'bg-white text-indigo-600 shadow-md border border-indigo-100' : 'text-slate-600 hover:bg-white hover:shadow-sm'}`}
            >
              <TrendingUp className="w-5 h-5" />
              SARIMAX Forecasting
            </button>
          </nav>

          <main className="flex-1 min-w-0">
            {activeTab === 'portfolio' ? <PortfolioOptimizer /> : <SarimaxForecaster />}
            
            <div className="mt-8 pt-6 border-t border-slate-200 flex justify-between items-center text-xs text-slate-400">
                <p>© 2025 DMAC UDD. All rights reserved.</p>
                <p>v2.0.3 • React + Flask</p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default App;
