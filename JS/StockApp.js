/**
 * StockApp.js - Aplicación de visualización de gráficos de acciones
 * Versión JavaScript de StockApp.py
 */

// Clase principal para la aplicación de acciones
class StockApp {
    constructor(config = {}) {
        this.currentData = {};  // Objeto para almacenar datos de múltiples tickers
        this.tickers = [];      // Lista de tickers actualmente visualizados
        // Ya no necesitamos API key para Yahoo Finance
        this.useYahooFinance = true;
        
        // Configuración para visualización de múltiples tickers
        // Por defecto, usar Base 100 a menos que se especifique lo contrario
        const savedPreference = localStorage.getItem('stockapp_use_base100');
        this.useBase100 = config.useBase100 !== undefined ? config.useBase100 : 
                         savedPreference === null ? true : savedPreference !== 'false';
        console.log(`Inicializando con Base 100: ${this.useBase100}`);

        // Esquemas de colores predeterminados para las velas
        this.colorSchemes = {
            default: {
                increasing: {line: {color: 'rgba(0,255,0,1)'}, fillcolor: 'rgba(0,255,0,0.5)'},
                decreasing: {line: {color: 'rgba(255,0,0,1)'}, fillcolor: 'rgba(255,0,0,0.5)'}
            },
            UDD: {
                increasing: {line: {color: '#005293'}, fillcolor: '#417babff'}, // Azul para velas alcistas
                decreasing: {line: {color: '#6E7b8b'}, fillcolor: '#939495d2'}  // Morado para velas bajistas
            },
            orangeTeal: {
                increasing: {line: {color: '#1ABC9C'}, fillcolor: '#A3E4D7'}, // Verde-azulado para velas alcistas
                decreasing: {line: {color: '#E67E22'}, fillcolor: '#F5CBA7'}  // Naranja para velas bajistas
            },
            monochrome: {
                increasing: {line: {color: '#212F3D'}, fillcolor: '#D5D8DC'}, // Gris oscuro para velas alcistas
                decreasing: {line: {color: '#17202A'}, fillcolor: '#85929E'}  // Negro para velas bajistas
            },
            pastel: {
                increasing: {line: {color: '#58D68D'}, fillcolor: '#ABEBC6'}, // Verde pastel para velas alcistas
                decreasing: {line: {color: '#EC7063'}, fillcolor: '#F5B7B1'}  // Rojo pastel para velas bajistas
            }
        };
        
        // Cargar esquema de color guardado o usar el valor por defecto
        this.currentColorScheme = config.colorScheme || localStorage.getItem('stockapp_color_scheme') || 'UDD';
        
        this.initApp();
        
        console.log('Usando Yahoo Finance API para obtener datos de acciones');
    }

    /**
     * Inicializa la aplicación y configura los elementos de la interfaz
     */
    initApp() {
        // Crear la estructura de la aplicación
        document.body.innerHTML = `
            <div id="app-container">
                <!-- Pantalla Inicial -->
                <div id="init-screen">
                    <h1>Bienvenido a la App de Gráficos Ticker</h1>
                    
                    <div class="api-info-panel">
                        <p>Esta aplicación utiliza Yahoo Finance para obtener datos de acciones en tiempo real.</p>
                        <p>No se requiere configuración de API Key.</p>
                    </div>
                    
                    <div class="button-container">
                        <button id="start-button" class="action-button">Iniciar</button>
                        <button id="exit-button" class="action-button">Cerrar</button>
                    </div>
                </div>

                <!-- Pantalla Principal -->
                <div id="main-screen" style="display:none;">
                    <div class="input-container">
                        <div class="input-group">
                            <label for="ticker-input">Tickers:</label>
                            <input type="text" id="ticker-input" placeholder="Ej: AAPL,MSFT,GOOGL">
                            <span class="input-help">(Separados por comas)</span>
                        </div>
                        <div class="input-group">
                            <label for="freq-input">Frecuencia:</label>
                            <select id="freq-input">
                                <option value="1d">Diario</option>
                                <option value="1wk" selected>Semanal</option>
                                <option value="1mo">Mensual</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <label for="period-input">Periodo:</label>
                            <select id="period-input">
                                <option value="1mo">1 mes</option>
                                <option value="6mo">6 meses</option>
                                <option value="1y">1 año</option>
                                <option value="2y">2 años</option>
                                <option value="5y" selected>5 años</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <label for="color-scheme">Colores:</label>
                            <select id="color-scheme">
                                <option value="default">Verde/Rojo (Clásico)</option>
                                <option value="UDD" selected>Colores Club</option>
                                <option value="orangeTeal">Naranja/Turquesa</option>
                                <option value="monochrome">Monocromático</option>
                                <option value="pastel">Colores Pastel</option>
                            </select>
                        </div>
                        <div class="input-group" id="scale-option-container" style="display:none;">
                            <label for="scale-type">Escala:</label>
                            <select id="scale-type">
                                <option value="base100" selected>Base 100</option>
                                <option value="absolute">Valores absolutos</option>
                            </select>
                        </div>
                        <button id="execute-button" class="action-button">Ejecutar</button>
                        <button id="download-button" class="action-button">Descargar CSV</button>
                    </div>
                    
                    <div id="message-container"></div>
                    
                    <div class="scale-info-panel" id="scale-info-panel" style="display:none;">
                        <p><strong>Escala Base 100:</strong> Todos los tickers se normalizan tomando el primer día como valor 100, lo que facilita comparar el rendimiento porcentual relativo a lo largo del tiempo.</p>
                    </div>
                    
                    <div id="chart-container">
                        <div id="stock-chart">
                            <h2>Ingrese un ticker y presione 'Ejecutar'</h2>
                        </div>
                    </div>
                    
                    <button id="back-button" class="action-button">Volver</button>
                </div>
            </div>

            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                    background-color: #f5f5f5;
                }
                
                #app-container {
                    max-width: 1000px;
                    margin: 0 auto;
                    padding: 20px;
                }
                
                #init-screen {
                    text-align: center;
                    padding: 50px 0;
                }
                
                #init-screen h1 {
                    font-size: 28px;
                    margin-bottom: 30px;
                }
                
                .button-container {
                    display: flex;
                    justify-content: center;
                    gap: 20px;
                }
                
                .action-button {
                    background-color: #4CAF50;
                    border: none;
                    color: white;
                    padding: 12px 24px;
                    text-align: center;
                    text-decoration: none;
                    display: inline-block;
                    font-size: 16px;
                    margin: 4px 2px;
                    cursor: pointer;
                    border-radius: 4px;
                    transition: background-color 0.3s;
                }
                
                .action-button:hover {
                    background-color: #45a049;
                }
                
                #exit-button, #back-button {
                    background-color: #f44336;
                }
                
                #exit-button:hover, #back-button:hover {
                    background-color: #d32f2f;
                }
                
                .input-container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    align-items: center;
                    margin-bottom: 20px;
                    padding: 15px;
                    background-color: #fff;
                    border-radius: 4px;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                }
                
                .input-group {
                    display: flex;
                    align-items: center;
                }
                
                .input-group label {
                    margin-right: 5px;
                    font-weight: bold;
                }
                
                input, select {
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                }
                
                #message-container {
                    margin: 10px 0;
                    padding: 10px;
                    min-height: 20px;
                    color: #D8000C;
                }
                
                #chart-container {
                    background-color: white;
                    padding: 20px;
                    border-radius: 4px;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                    margin-bottom: 20px;
                    height: 500px;
                    width: 100%;
                    position: relative;
                    overflow: hidden;
                }
                
                #stock-chart {
                    width: 100%;
                    height: 100%;
                }
                
                #back-button {
                    margin-top: 10px;
                }
                
                /* Estilos para el panel de información */
                .api-info-panel {
                    background-color: #f9f9f9;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    padding: 15px;
                    margin: 20px auto;
                    max-width: 500px;
                    text-align: center;
                }
                
                .api-info-panel p {
                    margin: 10px 0;
                    color: #333;
                    font-size: 16px;
                }

                .input-help {
                    font-size: 12px;
                    color: #666;
                    margin-left: 5px;
                    font-style: italic;
                }
                
                .scale-info-panel {
                    background-color: #f2f9ff;
                    border: 1px solid #d0e3ff;
                    border-radius: 4px;
                    padding: 10px 15px;
                    margin: 10px 0;
                    font-size: 14px;
                }
                
                .scale-info-panel p {
                    margin: 5px 0;
                    color: #333;
                }
            </style>
        `;

        // Agregar eventos a los botones
        document.getElementById('start-button').addEventListener('click', () => this.showMainScreen());
        document.getElementById('exit-button').addEventListener('click', () => this.closeApp());
        document.getElementById('back-button').addEventListener('click', () => this.showInitScreen());
        document.getElementById('execute-button').addEventListener('click', () => this.execute());
        document.getElementById('download-button').addEventListener('click', () => this.downloadCSV());
        
        // Agregar evento para cambiar el esquema de colores
        document.getElementById('color-scheme').addEventListener('change', (e) => {
            this.changeColorScheme(e.target.value);
        });
        
        // Agregar evento para cambiar el tipo de escala
        document.getElementById('scale-type').addEventListener('change', (e) => {
            this.changeScaleType(e.target.value === 'base100');
        });

        // Establecer el selector de colores al valor actual
        setTimeout(() => {
            const colorSchemeSelect = document.getElementById('color-scheme');
            if (colorSchemeSelect && this.currentColorScheme) {
                colorSchemeSelect.value = this.currentColorScheme;
            }
            
            // Establecer el selector de escala al valor actual y agregar listener
        const scaleTypeSelect = document.getElementById('scale-type');
        if (scaleTypeSelect) {
            scaleTypeSelect.value = this.useBase100 ? 'base100' : 'absolute';
            console.log(`Estableciendo selector de escala a: ${scaleTypeSelect.value}`);
        }
        }, 100);
        
        // Cargar Plotly.js dinámicamente
        this.loadScript('https://cdn.plot.ly/plotly-latest.min.js')
            .then(() => console.log('Plotly cargado correctamente'))
            .catch(error => this.setMessage(`Error al cargar Plotly: ${error.message}`));
    }

    /**
     * Carga un script externo dinámicamente
     * @param {string} url - URL del script a cargar
     * @returns {Promise} - Promesa que resuelve cuando el script se carga
     */
    loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Muestra la pantalla principal y oculta la inicial
     */
    showMainScreen() {
        document.getElementById('init-screen').style.display = 'none';
        document.getElementById('main-screen').style.display = 'block';
        
        // Ajustar tamaño del contenedor de gráfico si hay datos cargados
        if (this.currentData) {
            setTimeout(() => {
                const chartContainer = document.getElementById('stock-chart');
                if (chartContainer && chartContainer.data) {
                    Plotly.relayout(chartContainer, {
                        width: document.getElementById('chart-container').clientWidth
                    });
                }
            }, 100);
        }
    }

    /**
     * Muestra la pantalla inicial y oculta la principal
     */
    showInitScreen() {
        document.getElementById('main-screen').style.display = 'none';
        document.getElementById('init-screen').style.display = 'block';
    }

    /**
     * Cierra la aplicación (para versión web solo muestra un mensaje)
     */
    closeApp() {
        // Limpiar listeners para evitar memory leaks
        if (this.resizeListener) {
            window.removeEventListener('resize', this.resizeListener);
            this.resizeListener = null;
        }
        
        if (window.close && typeof window.close === 'function') {
            window.close();
        } else {
            alert('Gracias por usar StockApp.js');
        }
    }

    /**
     * Establece un mensaje en el contenedor de mensajes
     * @param {string} message - Mensaje a mostrar
     * @param {boolean} isError - Indica si es un mensaje de error
     */
    setMessage(message, isError = true) {
        const messageContainer = document.getElementById('message-container');
        messageContainer.textContent = message;
        messageContainer.style.color = isError ? '#D8000C' : '#4F8A10';
    }

    /**
     * Ejecuta la búsqueda de datos de acciones y genera el gráfico
     */
    async execute() {
        const tickerInput = document.getElementById('ticker-input').value.trim().toUpperCase();
        const period = document.getElementById('period-input').value;
        const interval = document.getElementById('freq-input').value;
        
        // Dividir la entrada por comas para obtener múltiples tickers
        const tickers = tickerInput.split(',').map(t => t.trim()).filter(t => t.length > 0);
        
        if (tickers.length === 0) {
            this.setMessage('Debe ingresar al menos un ticker.');
            return;
        }
        
        // Mostrar u ocultar la opción de escala según la cantidad de tickers
        const scaleOptionContainer = document.getElementById('scale-option-container');
        const scaleInfoPanel = document.getElementById('scale-info-panel');
        const scaleTypeSelect = document.getElementById('scale-type');
        
        // Mostrar u ocultar elementos relacionados con la escala
        if (scaleOptionContainer) {
            scaleOptionContainer.style.display = tickers.length > 1 ? 'flex' : 'none';
        }
        
        if (scaleInfoPanel) {
            scaleInfoPanel.style.display = tickers.length > 1 ? 'block' : 'none';
        }
        
        // Asegurarse de que el selector refleje el estado actual
        if (scaleTypeSelect && tickers.length > 1) {
            scaleTypeSelect.value = this.useBase100 ? 'base100' : 'absolute';
        }
        
        this.setMessage(`Cargando datos para ${tickers.length} ticker(s) desde Yahoo Finance...`, false);
        
        try {
            // Limpiar datos anteriores
            this.currentData = {};
            this.tickers = [];
            
            // Para cada ticker, obtener los datos
            const allDataPromises = tickers.map(ticker => 
                this.fetchStockData(ticker, interval, period)
                    .then(data => {
                        if (!data || data.length === 0) {
                            this.setMessage(`No se obtuvieron datos para el ticker '${ticker}'. Continuando con el resto...`);
                            return null;
                        }
                        return { ticker, data };
                    })
                    .catch(error => {
                        this.setMessage(`Error al obtener datos para '${ticker}': ${error.message}. Continuando con el resto...`);
                        return null;
                    })
            );
            
            // Esperar a que todas las promesas se resuelvan
            const results = await Promise.all(allDataPromises);
            
            // Filtrar resultados nulos y guardar los datos
            const validResults = results.filter(result => result !== null);
            
            if (validResults.length === 0) {
                this.setMessage('No se obtuvieron datos para ningún ticker.');
                document.getElementById('stock-chart').innerHTML = '<h2>No se encontraron datos para los tickers ingresados</h2>';
                return;
            }
            
            // Verificar que todos los tickers tienen datos para las mismas fechas
            const firstTickerDates = new Set(validResults[0].data.map(item => item.date));
            const allSameDates = validResults.every(result => {
                const tickerDates = new Set(result.data.map(item => item.date));
                // Comprobar si tienen el mismo número de fechas
                if (tickerDates.size !== firstTickerDates.size) return false;
                
                // Comprobar que todas las fechas coinciden
                return [...tickerDates].every(date => firstTickerDates.has(date));
            });
            
            if (!allSameDates) {
                this.setMessage('Advertencia: Los tickers no tienen datos para las mismas fechas exactamente. Algunos puntos pueden no visualizarse correctamente.');
            }
            
            // Guardar datos y tickers
            validResults.forEach(result => {
                this.currentData[result.ticker] = result.data;
                this.tickers.push(result.ticker);
            });
            
            // Crear gráfico con todos los tickers
            this.createCandlestickChart(this.tickers, this.currentData);
            this.setMessage(`Gráfico generado correctamente para ${this.tickers.length} ticker(s).`, false);
        } catch (error) {
            this.setMessage(`Error: ${error.message}`);
            document.getElementById('stock-chart').innerHTML = '<h2>Error al cargar los datos</h2>';
        }
    }

    /**
     * Obtiene datos de acciones desde Yahoo Finance
     * @param {string} symbol - Símbolo del ticker
     * @param {string} interval - Intervalo de tiempo para los datos
     * @param {string} range - Rango de tiempo para los datos
     * @returns {Array} - Datos de la acción formateados
     */
    async fetchStockData(symbol, interval, range) {
        // Mapeo de intervalos para Yahoo Finance
        const intervalMap = {
            '1d': '1d',
            '1wk': '1wk',
            '1mo': '1mo'
        };
        
        // Mapeo de rangos para Yahoo Finance
        const rangeMap = {
            '1mo': '1mo',
            '6mo': '6mo',
            '1y': '1y',
            '2y': '2y',
            '5y': '5y',
            'max': 'max'
        };
        
        const yahooInterval = intervalMap[interval] || '1wk';
        const yahooRange = rangeMap[range] || '5y';
        
        // Construimos la URL para la API de Yahoo Finance
        // Usamos una API proxy gratuita para evitar problemas de CORS
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${yahooInterval}&range=${yahooRange}`;
        
        try {
            // Utilizamos el proxy cors-anywhere para evitar problemas de CORS
            const proxyUrl = `https://cors-anywhere.herokuapp.com/${url}`;
            const response = await fetch(proxyUrl);
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Verificar si la respuesta contiene datos válidos
            if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
                throw new Error('No se encontraron datos para este símbolo');
            }
            
            const result = data.chart.result[0];
            const timestamps = result.timestamp;
            const quote = result.indicators.quote[0];
            
            if (!timestamps || timestamps.length === 0 || !quote) {
                throw new Error('Datos incompletos para este símbolo');
            }
            
            // Formatear los datos para Plotly
            const formattedData = timestamps.map((timestamp, i) => {
                const date = new Date(timestamp * 1000).toISOString().split('T')[0];
                return {
                    date,
                    open: quote.open[i],
                    high: quote.high[i],
                    low: quote.low[i],
                    close: quote.close[i],
                    volume: quote.volume[i]
                };
            }).filter(item => item.open !== null && item.high !== null && 
                     item.low !== null && item.close !== null);
            
            return formattedData;
        } catch (error) {
            // Si hay un error con el proxy, intentamos con un método alternativo usando Yahoo Query Language (YQL)
            console.error("Error al obtener datos con el proxy, intentando método alternativo:", error);
            
            // Utilizamos una API alternativa que no requiere proxy
            const alternativeUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            const response = await fetch(alternativeUrl);
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Verificar si la respuesta contiene datos válidos
            if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
                throw new Error('No se encontraron datos para este símbolo');
            }
            
            const result = data.chart.result[0];
            const timestamps = result.timestamp;
            const quote = result.indicators.quote[0];
            
            if (!timestamps || timestamps.length === 0 || !quote) {
                throw new Error('Datos incompletos para este símbolo');
            }
            
            // Formatear los datos para Plotly
            const formattedData = timestamps.map((timestamp, i) => {
                const date = new Date(timestamp * 1000).toISOString().split('T')[0];
                return {
                    date,
                    open: quote.open[i],
                    high: quote.high[i],
                    low: quote.low[i],
                    close: quote.close[i],
                    volume: quote.volume[i]
                };
            }).filter(item => item.open !== null && item.high !== null && 
                     item.low !== null && item.close !== null);
            
            return formattedData;
        }
    }

    /**
     * Crea un gráfico de velas japonesas con Plotly para uno o más tickers
     * @param {Array} tickers - Lista de símbolos de tickers
     * @param {Object} tickersData - Objeto con datos para cada ticker
     */
    createCandlestickChart(tickers, tickersData) {
        const chartContainer = document.getElementById('stock-chart');
        
        // Limpiar el contenedor para evitar problemas de acumulación
        chartContainer.innerHTML = '';
        
        // Obtener el esquema de colores actual
        const colorScheme = this.colorSchemes[this.currentColorScheme] || this.colorSchemes.default;
        
        // Crear trazas para cada ticker
        const traces = [];
        
        // Combos de colores para cada ticker (subida/bajada)
        const tickerColorPairs = [
            { // Azul / Gris
                increasing: {line: {color: '#005293'}, fillcolor: 'rgba(0, 82, 147, 0.5)'}, 
                decreasing: {line: {color: '#6E7b8b'}, fillcolor: 'rgba(110, 123, 139, 0.5)'}
            },
            { // Verde / Rojo
                increasing: {line: {color: '#00A651'}, fillcolor: 'rgba(0, 166, 81, 0.5)'}, 
                decreasing: {line: {color: '#E63946'}, fillcolor: 'rgba(230, 57, 70, 0.5)'}
            },
            { // Naranja / Morado
                increasing: {line: {color: '#F26419'}, fillcolor: 'rgba(242, 100, 25, 0.5)'}, 
                decreasing: {line: {color: '#662E9B'}, fillcolor: 'rgba(102, 46, 155, 0.5)'}
            },
            { // Turquesa / Marrón
                increasing: {line: {color: '#1ABC9C'}, fillcolor: 'rgba(26, 188, 156, 0.5)'}, 
                decreasing: {line: {color: '#8C4A2F'}, fillcolor: 'rgba(140, 74, 47, 0.5)'}
            },
            { // Amarillo / Índigo
                increasing: {line: {color: '#F4D03F'}, fillcolor: 'rgba(244, 208, 63, 0.5)'}, 
                decreasing: {line: {color: '#34495E'}, fillcolor: 'rgba(52, 73, 94, 0.5)'}
            },
            { // Rosa / Verde oliva
                increasing: {line: {color: '#E91E63'}, fillcolor: 'rgba(233, 30, 99, 0.5)'}, 
                decreasing: {line: {color: '#7D8E2E'}, fillcolor: 'rgba(125, 142, 46, 0.5)'}
            },
            { // Celeste / Burdeo
                increasing: {line: {color: '#03A9F4'}, fillcolor: 'rgba(3, 169, 244, 0.5)'}, 
                decreasing: {line: {color: '#7D1935'}, fillcolor: 'rgba(125, 25, 53, 0.5)'}
            },
            { // Verde lima / Azul marino
                increasing: {line: {color: '#CDDC39'}, fillcolor: 'rgba(205, 220, 57, 0.5)'}, 
                decreasing: {line: {color: '#1A237E'}, fillcolor: 'rgba(26, 35, 126, 0.5)'}
            },
            { // Coral / Verde azulado
                increasing: {line: {color: '#FF7F50'}, fillcolor: 'rgba(255, 127, 80, 0.5)'}, 
                decreasing: {line: {color: '#004D40'}, fillcolor: 'rgba(0, 77, 64, 0.5)'}
            },
            { // Lavanda / Ámbar
                increasing: {line: {color: '#9F8FEF'}, fillcolor: 'rgba(159, 143, 239, 0.5)'}, 
                decreasing: {line: {color: '#FF8F00'}, fillcolor: 'rgba(255, 143, 0, 0.5)'}
            }
        ];
        
        // Variables para normalización base 100
        let firstDateValues = {};
        
        // Usar la propiedad de la clase en lugar de crear una variable local
        // Pero solo activar Base 100 si hay múltiples tickers y el usuario la ha seleccionado
        const useBase100 = tickers.length > 1 && this.useBase100;
        
        // Si vamos a usar base 100, obtener valores de referencia del primer día
        if (useBase100) {
            tickers.forEach(ticker => {
                const data = tickersData[ticker];
                if (data && data.length > 0) {
                    // Usar el primer precio de cierre como valor base
                    firstDateValues[ticker] = data[0].close;
                }
            });
        }
        
        tickers.forEach((ticker, index) => {
            const data = tickersData[ticker];
            
            // Si no hay datos para este ticker, omitirlo
            if (!data || data.length === 0) return;
            
            // Extraer datos para Plotly
            const dates = data.map(item => item.date);
            let opens, highs, lows, closes;
            
            // Aplicar normalización Base 100 solo si está activada y hay un valor base
            if (useBase100 && firstDateValues[ticker]) {
                const baseValue = firstDateValues[ticker];
                console.log(`Aplicando Base 100 para ${ticker} con valor base: ${baseValue}`);
                // Normalizar a base 100
                opens = data.map(item => (item.open / baseValue) * 100);
                highs = data.map(item => (item.high / baseValue) * 100);
                lows = data.map(item => (item.low / baseValue) * 100);
                closes = data.map(item => (item.close / baseValue) * 100);
            } else {
                // Usar valores absolutos
                console.log(`Usando valores absolutos para ${ticker}`);
                opens = data.map(item => item.open);
                highs = data.map(item => item.high);
                lows = data.map(item => item.low);
                closes = data.map(item => item.close);
            }
            
            // Crear el gráfico de velas para este ticker
            const trace = {
                x: dates,
                open: opens,
                high: highs,
                low: lows,
                close: closes,
                type: 'candlestick',
                name: ticker,
                // Usar el esquema de colores seleccionado para un solo ticker
                // O usar pares de colores específicos para cada ticker cuando hay varios
                increasing: tickers.length > 1 ? 
                    tickerColorPairs[index % tickerColorPairs.length].increasing : 
                    colorScheme.increasing,
                decreasing: tickers.length > 1 ? 
                    tickerColorPairs[index % tickerColorPairs.length].decreasing : 
                    colorScheme.decreasing,
                line: {width: 1},
                // Hacer el gráfico visible inicialmente
                visible: true
            };
            
            traces.push(trace);
        });
        
        // Título dinámico según la cantidad de tickers y tipo de escala
        let title = '';
        if (tickers.length === 1) {
            title = `Gráfico de velas japonesas para ${tickers[0]}`;
        } else {
            // Incluir el tipo de escala en el título si hay múltiples tickers
            const scaleType = useBase100 ? '(Base 100)' : '(Valores absolutos)';
            title = `Gráfico comparativo ${scaleType}: ${tickers.join(', ')}`;
        }
        
        const layout = {
            title: title,
            xaxis: {
                title: 'Fecha',
                rangeslider: {
                    visible: false
                }
            },
            yaxis: {
                title: useBase100 ? 'Precio (Base 100)' : 'Precio',
                // Mantener escala lineal en ambos casos para mejor visualización
                type: 'linear'
            },
            autosize: true,
            // Establecer dimensiones fijas para evitar deformación
            width: chartContainer.clientWidth,
            height: 450,
            margin: {
                l: 60,  // Un poco más ancho para etiquetas de base 100
                r: 20,
                t: 50,
                b: 50
            },
            // Estilo del fondo y tema general
            paper_bgcolor: 'white',
            plot_bgcolor: '#F8F9F9',
            // Añadir leyenda para múltiples tickers
            showlegend: tickers.length > 1,
            legend: {
                x: 0,
                y: 1,
                orientation: 'h'
            }
        };
        
        const config = {
            responsive: true,
            // Deshabilitar algunos modos de interacción que pueden causar problemas
            modeBarButtonsToRemove: ['lasso2d', 'select2d'],
            displaylogo: false
        };
        
        Plotly.newPlot(chartContainer, traces, layout, config);
        
        // Manejar redimensionado de ventana
        const resizeChart = () => {
            Plotly.relayout(chartContainer, {
                width: chartContainer.clientWidth
            });
        };
        
        // Limpiar listeners anteriores para evitar duplicados
        if (this.resizeListener) {
            window.removeEventListener('resize', this.resizeListener);
        }
        
        // Guardar la referencia al listener para poder limpiarlo después
        this.resizeListener = resizeChart;
        window.addEventListener('resize', this.resizeListener);
    }

    /**
     * Cambia el esquema de colores del gráfico y lo redibuja
     * @param {string} schemeName - Nombre del esquema de colores
     */
    changeColorScheme(schemeName) {
        if (this.colorSchemes[schemeName]) {
            this.currentColorScheme = schemeName;
            
            // Si hay datos, actualizar el gráfico con el nuevo esquema de colores
            if (Object.keys(this.currentData).length > 0 && this.tickers.length > 0) {
                this.redrawChart();
                this.setMessage(`Esquema de colores cambiado a ${schemeName}`, false);
            }
            
            // Guardar preferencia en localStorage
            localStorage.setItem('stockapp_color_scheme', schemeName);
        }
    }
    
    /**
     * Cambia el tipo de escala entre base 100 y valores absolutos
     * @param {boolean} useBase100 - Indica si se debe usar escala base 100
     */
    changeScaleType(useBase100) {
        console.log(`Cambiando a escala: ${useBase100 ? 'Base 100' : 'Valores absolutos'}`);
        
        // Actualizar el valor aunque sea el mismo para forzar el redibujado
        this.useBase100 = useBase100;
        
        // Actualizar el gráfico si hay datos y más de un ticker
        if (Object.keys(this.currentData).length > 0 && this.tickers.length > 1) {
            this.redrawChart();
            const scaleType = useBase100 ? 'Base 100' : 'Valores absolutos';
            this.setMessage(`Escala cambiada a ${scaleType}`, false);
        }
        
        // Guardar preferencia en localStorage
        localStorage.setItem('stockapp_use_base100', useBase100.toString());
    }
    
    // Ya no necesitamos métodos relacionados con API Key

    /**
     * Descarga los datos actuales como archivo CSV
     */
    downloadCSV() {
        if (Object.keys(this.currentData).length === 0 || this.tickers.length === 0) {
            this.setMessage('No hay datos para descargar. Primero ejecute una consulta válida.');
            return;
        }
        
        // Si hay un solo ticker, usamos el formato anterior
        if (this.tickers.length === 1) {
            const ticker = this.tickers[0];
            const data = this.currentData[ticker];
            
            // Crear contenido CSV
            const headers = ['Fecha', 'Apertura', 'Máximo', 'Mínimo', 'Cierre', 'Volumen'];
            const rows = data.map(item => [
                item.date,
                item.open,
                item.high,
                item.low,
                item.close,
                item.volume || 0
            ]);
            
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.join(','))
            ].join('\n');
            
            // Crear y descargar el archivo
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${ticker}_data_${timestamp}.csv`;
            
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.setMessage(`Datos guardados como '${filename}'`, false);
        } 
        // Si hay múltiples tickers, creamos un formato más complejo
        else {
            // Tomamos el primer ticker como referencia para las fechas
            const referenceTicker = this.tickers[0];
            const referenceDates = this.currentData[referenceTicker].map(item => item.date);
            
            // Creamos un encabezado con todos los tickers
            const headers = ['Fecha'];
            
            // Para cada ticker, añadimos columnas para Apertura, Máximo, Mínimo, Cierre y Volumen
            this.tickers.forEach(ticker => {
                headers.push(
                    `${ticker}_Apertura`,
                    `${ticker}_Máximo`,
                    `${ticker}_Mínimo`,
                    `${ticker}_Cierre`,
                    `${ticker}_Volumen`
                );
            });
            
            // Crear las filas con datos para cada fecha
            const rows = [];
            
            referenceDates.forEach(date => {
                const row = [date];
                
                // Para cada ticker, buscar los datos para esta fecha
                this.tickers.forEach(ticker => {
                    const dataForDate = this.currentData[ticker].find(item => item.date === date);
                    
                    if (dataForDate) {
                        row.push(
                            dataForDate.open,
                            dataForDate.high,
                            dataForDate.low,
                            dataForDate.close,
                            dataForDate.volume || 0
                        );
                    } else {
                        // Si no hay datos para este ticker en esta fecha, agregar valores vacíos
                        row.push('', '', '', '', '');
                    }
                });
                
                rows.push(row);
            });
            
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.join(','))
            ].join('\n');
            
            // Crear y descargar el archivo
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `multiple_tickers_data_${timestamp}.csv`;
            
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.setMessage(`Datos guardados como '${filename}'`, false);
        }
    }
    
    /**
     * Redibuja el gráfico actual si existe
     * Útil para llamar después de redimensionamientos o cambios de vista
     */
    redrawChart() {
        if (Object.keys(this.currentData).length === 0 || !document.getElementById('stock-chart') || this.tickers.length === 0) {
            return;
        }
        
        const chartContainer = document.getElementById('stock-chart');
        
        // Si el gráfico ya existe, destruirlo antes de volver a dibujarlo
        if (chartContainer.data) {
            Plotly.purge(chartContainer);
        }
        
        // Volver a crear el gráfico con las dimensiones correctas
        this.createCandlestickChart(this.tickers, this.currentData);
    }
}

// Crear la instancia de la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const app = new StockApp();
    
    // Manejar cambios de tamaño de la ventana a nivel global
    window.addEventListener('resize', () => {
        // Debounce para evitar demasiadas llamadas
        if (app.resizeTimeout) {
            clearTimeout(app.resizeTimeout);
        }
        app.resizeTimeout = setTimeout(() => {
            app.redrawChart();
        }, 250);
    });
});

// Para la versión Electron, exportamos la clase
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StockApp;
}
