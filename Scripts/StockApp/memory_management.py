"""
Memory management utilities for the stock app.
Prevents memory leaks by properly cleaning up data and cached objects.
"""
import gc
import pandas as pd
from weakref import WeakValueDictionary

class DataManager:
    """
    Manages stock data with memory-aware operations.
    Automatically cleans up old data when loading new data.
    """
    def __init__(self, max_tickers=10):
        self.current_data = {}
        self.predictions = {}
        self.max_tickers = max_tickers
        # Cache for plotly figures (weak references so they can be GC'd)
        self._figure_cache = WeakValueDictionary()
    
    def clear_all(self):
        """Complete cleanup of all data"""
        self.current_data.clear()
        self.predictions.clear()
        self._figure_cache.clear()
        gc.collect()  # Force garbage collection
    
    def clear_predictions(self):
        """Clear only prediction data"""
        self.predictions.clear()
        gc.collect()
    
    def set_data(self, new_data, new_tickers):
        """
        Replace current data with new data.
        Properly cleans up old DataFrames before assignment.
        """
        # Clear old data first
        old_tickers = set(self.current_data.keys())
        for ticker in old_tickers:
            if ticker in self.current_data:
                del self.current_data[ticker]
        
        # Clear predictions since data changed
        self.clear_predictions()
        
        # Assign new data
        self.current_data = new_data
        
        # Enforce max ticker limit
        if len(new_tickers) > self.max_tickers:
            raise ValueError(f"Máximo {self.max_tickers} tickers permitidos")
        
        gc.collect()
        return new_tickers
    
    def set_predictions(self, new_predictions):
        """Replace predictions with proper cleanup"""
        self.predictions.clear()
        self.predictions = new_predictions
        gc.collect()
    
    def get_memory_usage(self):
        """
        Calculate approximate memory usage in MB.
        Useful for debugging and user feedback.
        """
        total_bytes = 0
        
        # Data memory
        for df in self.current_data.values():
            total_bytes += df.memory_usage(deep=True).sum()
        
        # Predictions memory (approximate)
        for pred in self.predictions.values():
            if 'forecast' in pred:
                total_bytes += pred['forecast'].nbytes
            if 'lower_bound' in pred:
                total_bytes += pred['lower_bound'].nbytes
            if 'upper_bound' in pred:
                total_bytes += pred['upper_bound'].nbytes
        
        return total_bytes / (1024 * 1024)  # Convert to MB
    
    def optimize_dataframes(self):
        """
        Reduce DataFrame memory footprint by downcasting numeric types.
        Call this after loading data.
        """
        for ticker, df in self.current_data.items():
            # Downcast float64 to float32 (sufficient precision for prices)
            float_cols = df.select_dtypes(include=['float64']).columns
            df[float_cols] = df[float_cols].astype('float32')
            
            # Remove any duplicate indices
            if df.index.duplicated().any():
                df = df[~df.index.duplicated(keep='first')]
                self.current_data[ticker] = df


def cleanup_dataframe(df):
    """
    Utility to properly delete a DataFrame and free memory.
    """
    if df is not None:
        del df
        gc.collect()


def get_dataframe_memory_usage(df):
    """Get readable memory usage of a DataFrame"""
    bytes_used = df.memory_usage(deep=True).sum()
    if bytes_used < 1024:
        return f"{bytes_used} bytes"
    elif bytes_used < 1024**2:
        return f"{bytes_used/1024:.2f} KB"
    elif bytes_used < 1024**3:
        return f"{bytes_used/(1024**2):.2f} MB"
    else:
        return f"{bytes_used/(1024**3):.2f} GB"
