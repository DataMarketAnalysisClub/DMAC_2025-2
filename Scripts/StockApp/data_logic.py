import pandas as pd
import yfinance as yf
import os
import datetime

def fetch_stock_data(tickers, period, interval):
    """
    Descarga datos de yfinance para una lista de tickers.
    """
    current_data = {}
    valid_tickers = []
    errors = []

    for ticker in tickers:
        try:
            df = yf.download(ticker, period=period, interval=interval, progress=False)
            
            if df.empty:
                errors.append(f"No se obtuvieron datos para '{ticker}'.")
                continue
            
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.droplevel(1)
            
            df = df[['Open', 'High', 'Low', 'Close']].dropna()
            
            if not df.empty:
                current_data[ticker] = df
                valid_tickers.append(ticker)
            else:
                errors.append(f"Datos vacíos para '{ticker}' después de limpiar.")
        
        except Exception as e:
            errors.append(f"Error con '{ticker}': {e}.")
            continue
            
    return current_data, valid_tickers, errors

def export_to_csv(current_data, tickers, predictions):
    """
    Guarda los datos históricos y de predicción en un archivo CSV.
    """
    if not current_data or not tickers:
        return None, "No hay datos para descargar."

    try:
        downloads_path = os.path.join(os.path.expanduser("~"), "Downloads")
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        
        if len(tickers) == 1:
            ticker = tickers[0]
            df = current_data[ticker]
            
            if ticker in predictions:
                pred_data = predictions[ticker]
                pred_df = pd.DataFrame({
                    'Close': pred_data['forecast'],
                    'Lower_95': pred_data['lower_bound'],
                    'Upper_95': pred_data['upper_bound']
                }, index=pred_data['dates'])
                pred_df['Open'] = pred_df['Close']
                pred_df['High'] = pred_df['Upper_95']
                pred_df['Low'] = pred_df['Lower_95']
                pred_df['Prediccion'] = True
                
                df_copy = df.copy()
                df_copy['Prediccion'] = False
                df_copy['Lower_95'] = pd.NA
                df_copy['Upper_95'] = pd.NA
                
                combined_df = pd.concat([df_copy, pred_df])
                filename = f"{ticker}_data_con_prediccion_{timestamp}.csv"
            else:
                combined_df = df
                filename = f"{ticker}_data_{timestamp}.csv"

            filepath = os.path.join(downloads_path, filename)
            combined_df.to_csv(filepath)
            
        else: # Múltiples tickers
            all_dates = set()
            for df in current_data.values():
                all_dates.update(df.index)
            for ticker in tickers:
                if ticker in predictions:
                    all_dates.update(predictions[ticker]['dates'])
            
            all_dates = sorted(all_dates)
            
            columns = ['Fecha']
            for ticker in tickers:
                columns.extend([f'{ticker}_Apertura', f'{ticker}_Máximo', 
                                f'{ticker}_Mínimo', f'{ticker}_Cierre', 
                                f'{ticker}_Prediccion', f'{ticker}_IC95_Inferior', 
                                f'{ticker}_IC95_Superior'])
            
            rows = []
            for date in all_dates:
                row = [date.strftime('%Y-%m-%d')]
                for ticker in tickers:
                    if date in current_data.get(ticker, {}):
                        data = current_data[ticker].loc[date]
                        row.extend([data['Open'], data['High'], data['Low'], data['Close'], 
                                    'No', pd.NA, pd.NA])
                    elif ticker in predictions and date in predictions[ticker]['dates']:
                        pred_idx = list(predictions[ticker]['dates']).index(date)
                        pred_val = predictions[ticker]['forecast'][pred_idx]
                        lower_val = predictions[ticker]['lower_bound'][pred_idx]
                        upper_val = predictions[ticker]['upper_bound'][pred_idx]
                        row.extend([pred_val, upper_val, lower_val, pred_val, 
                                    'Sí', lower_val, upper_val])
                    else:
                        row.extend([pd.NA] * 7)
                rows.append(row)
            
            result_df = pd.DataFrame(rows, columns=columns)
            filename = f"multiple_tickers_con_prediccion_{timestamp}.csv"
            filepath = os.path.join(downloads_path, filename)
            result_df.to_csv(filepath, index=False)

        return filename, None

    except Exception as e:
        return None, f"Error al guardar CSV: {e}"
