import React, { useState } from 'react';
import { 
  Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  ScatterChart, Scatter, LineChart
} from 'recharts';
import { 
  Calculator, TrendingUp, PieChart, 
  Search, AlertCircle, Calendar, Clock, Activity
} from 'lucide-react';

// --- API UTILITIES ---

const API_BASE_URL = "http://localhost:5000/api";

// Fetch real market data from Python backend
// Updated to accept period and interval
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
          period,     // Pass period to optimization route if needed by backend logic
          interval    // Pass interval to optimization route if needed
      })
    });
    if (!response.ok) throw new Error('Optimization failed');
    return await response.json();
  } catch (error) {
    console.error("Optimization error:", error);
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
        // 2. Fetch Historical Data for Charting
        // Pass period and interval here
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

        // 3. Run Optimization (Python Side)
        // Pass period and interval here as well so the backend optimizes on the same data view
        const optResponse = await fetchOptimization(tickerList, rfRate, period, interval);
        
        if (optResponse && optResponse.frontier) {
            setFrontierData(optResponse.frontier);
            setOptimalPortfolio(optResponse.optimal);
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
      {/* Controls */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <PieChart className="w-6 h-6 text-indigo-600" />
              Markowitz Portfolio Optimization
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Configure your portfolio analysis parameters.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
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
        </div>

        {/* Input Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        
        <div className="mt-4 pt-4 border-t border-slate-100">
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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Historical Performance */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[500px] flex flex-col">
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
                   <Tooltip contentStyle={{borderRadius: '8px'}} />
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
                  Enter tickers and click "Run Analysis" to load data from backend.
               </div>
             )}
          </div>
        </div>

        {/* Chart 2: Efficient Frontier */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[500px] flex flex-col">
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
                    label={{ value: 'Risk (σ)', position: 'insideBottom', offset: -10, fill: '#64748b' }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name="Return" 
                    unit="%" 
                    tick={{fill: '#94a3b8', fontSize: 12}}
                    label={{ value: 'Return', angle: -90, position: 'insideLeft', fill: '#64748b' }}
                  />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{borderRadius: '8px'}}/>
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

      </div>
    </div>
  );
};

const SarimaxForecaster = () => {
  // Placeholder for now - keeping the layout consistent
  return (
    <div className="p-10 text-center bg-white rounded-xl shadow-sm">
        <h3 className="text-lg font-bold text-slate-700">SARIMAX Module</h3>
        <p className="text-slate-500">Backend integration coming in next step...</p>
    </div>
  )
}

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
                <p>© 2025 QuantClub UDD. All rights reserved.</p>
                <p>v2.0.2 • React + Flask</p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default App;
