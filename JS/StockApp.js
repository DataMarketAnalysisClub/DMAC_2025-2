/**
 * StockApp.js - Aplicación de visualización de gráficos de acciones
 * Versión JavaScript de StockApp.py
 */

// Clase principal para la aplicación de acciones
class StockApp {
    constructor(config = {}) {
        this.currentData = null;
        // Ya no necesitamos API key para Yahoo Finance
        this.useYahooFinance = true;

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
                            <label for="ticker-input">Ticker:</label>
                            <input type="text" id="ticker-input" placeholder="Ej: AAPL">
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
                        <button id="execute-button" class="action-button">Ejecutar</button>
                        <button id="download-button" class="action-button">Descargar CSV</button>
                    </div>
                    
                    <div id="message-container"></div>
                    
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

        // Establecer el selector de colores al valor actual
        setTimeout(() => {
            const colorSchemeSelect = document.getElementById('color-scheme');
            if (colorSchemeSelect && this.currentColorScheme) {
                colorSchemeSelect.value = this.currentColorScheme;
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
        const ticker = document.getElementById('ticker-input').value.trim().toUpperCase();
        const period = document.getElementById('period-input').value;
        const interval = document.getElementById('freq-input').value;
        
        if (!ticker) {
            this.setMessage('Debe ingresar un ticker.');
            return;
        }
        
        this.setMessage('Cargando datos desde Yahoo Finance...', false);
        
        try {
            // Obtener datos desde Yahoo Finance
            const data = await this.fetchStockData(ticker, interval, period);
            
            if (!data || data.length === 0) {
                this.setMessage(`No se obtuvieron datos para el ticker '${ticker}'.`);
                return;
            }
            
            this.currentData = data;
            this.createCandlestickChart(ticker, data);
            this.setMessage('Gráfico generado correctamente.', false);
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
     * Crea un gráfico de velas japonesas con Plotly
     * @param {string} ticker - Símbolo del ticker
     * @param {Array} data - Datos para el gráfico
     */
    createCandlestickChart(ticker, data) {
        const chartContainer = document.getElementById('stock-chart');
        
        // Limpiar el contenedor para evitar problemas de acumulación
        chartContainer.innerHTML = '';
        
        // Extraer datos para Plotly
        const dates = data.map(item => item.date);
        const opens = data.map(item => item.open);
        const highs = data.map(item => item.high);
        const lows = data.map(item => item.low);
        const closes = data.map(item => item.close);
        
        // Obtener el esquema de colores actual
        const colorScheme = this.colorSchemes[this.currentColorScheme] || this.colorSchemes.default;
        
        // Crear el gráfico de velas con colores personalizados
        const trace = {
            x: dates,
            open: opens,
            high: highs,
            low: lows,
            close: closes,
            type: 'candlestick',
            name: ticker,
            // Usar el esquema de colores seleccionado
            increasing: colorScheme.increasing,
            decreasing: colorScheme.decreasing,
            line: {width: 1}
        };
        
        const layout = {
            title: `Gráfico de velas japonesas para ${ticker}`,
            xaxis: {
                title: 'Fecha',
                rangeslider: {
                    visible: false
                }
            },
            yaxis: {
                title: 'Precio'
            },
            autosize: true,
            // Establecer dimensiones fijas para evitar deformación
            width: chartContainer.clientWidth,
            height: 450,
            margin: {
                l: 50,
                r: 20,
                t: 50,
                b: 50
            },
            // Estilo del fondo y tema general
            paper_bgcolor: 'white',
            plot_bgcolor: '#F8F9F9'
        };
        
        const config = {
            responsive: true,
            // Deshabilitar algunos modos de interacción que pueden causar problemas
            modeBarButtonsToRemove: ['lasso2d', 'select2d'],
            displaylogo: false
        };
        
        Plotly.newPlot(chartContainer, [trace], layout, config);
        
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
            if (this.currentData && this.currentData.length > 0) {
                this.redrawChart();
                this.setMessage(`Esquema de colores cambiado a ${schemeName}`, false);
            }
            
            // Guardar preferencia en localStorage
            localStorage.setItem('stockapp_color_scheme', schemeName);
        }
    }
    
    // Ya no necesitamos métodos relacionados con API Key

    /**
     * Descarga los datos actuales como archivo CSV
     */
    downloadCSV() {
        if (!this.currentData || this.currentData.length === 0) {
            this.setMessage('No hay datos para descargar. Primero ejecute una consulta válida.');
            return;
        }
        
        const ticker = document.getElementById('ticker-input').value.trim().toUpperCase();
        
        // Crear contenido CSV
        const headers = ['Fecha', 'Apertura', 'Máximo', 'Mínimo', 'Cierre', 'Volumen'];
        const rows = this.currentData.map(item => [
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
    
    /**
     * Redibuja el gráfico actual si existe
     * Útil para llamar después de redimensionamientos o cambios de vista
     */
    redrawChart() {
        if (!this.currentData || !document.getElementById('stock-chart')) {
            return;
        }
        
        const chartContainer = document.getElementById('stock-chart');
        const ticker = document.getElementById('ticker-input').value.trim().toUpperCase();
        
        // Si el gráfico ya existe, destruirlo antes de volver a dibujarlo
        if (chartContainer.data) {
            Plotly.purge(chartContainer);
        }
        
        // Volver a crear el gráfico con las dimensiones correctas
        this.createCandlestickChart(ticker, this.currentData);
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
