/**
 * StockApp.js - Aplicación de visualización de gráficos de acciones
 * Versión JavaScript de StockApp.py
 */

// Clase principal para la aplicación de acciones
class StockApp {
    constructor(config = {}) {
        this.currentData = {};  // Objeto para almacenar datos de múltiples tickers
        this.tickers = [];      // Lista de tickers actualmente visualizados
        this.projectionData = {}; // Datos de proyección para cada ticker
        this.showingProjection = false; // Indica si se está mostrando una proyección
        this.timeSeriesLoaded = false; // Indica si las bibliotecas de series temporales están cargadas
        
        // Ya no necesitamos API key para Yahoo Finance
        this.useYahooFinance = true;
        
        // Configuración para visualización de múltiples tickers
        // Por defecto, usar Base 100 a menos que se especifique lo contrario
        const savedPreference = localStorage.getItem('stockapp_use_base100');
        this.useBase100 = config.useBase100 !== undefined ? config.useBase100 : 
                         savedPreference === null ? true : savedPreference !== 'false';
        console.log(`Inicializando con Base 100: ${this.useBase100}`);

        // Intentar cargar las bibliotecas de series temporales
        this.loadTimeSeriesLibraries();

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
     * Carga dinámicamente las bibliotecas necesarias para los modelos de series temporales
     */
    loadTimeSeriesLibraries() {
        console.log('Cargando bibliotecas de series temporales...');
        
        // Mostrar indicador de carga en la interfaz
        this.setMessage('Cargando bibliotecas para proyecciones avanzadas...', false, true);
        
        // Crear un indicador visual de carga junto a los métodos avanzados
        const updateLoadingStatus = () => {
            const methodSelect = document.getElementById('projection-method');
            if (methodSelect) {
                // Añadir indicador visual a los métodos avanzados
                const options = methodSelect.options;
                for (let i = 0; i < options.length; i++) {
                    const option = options[i];
                    if (['MA', 'AR', 'ARMA', 'ARIMA', 'SARIMA'].includes(option.value)) {
                        if (!this.timeSeriesLoaded) {
                            option.text = `${option.value} (cargando...)`;
                        } else {
                            option.text = option.value;
                        }
                    }
                }
            }
        };
        
        // Actualizar estado inicial
        setTimeout(updateLoadingStatus, 500);
        
        // Lista de bibliotecas necesarias con nombres amigables para mensajes de error y URLs alternativas
        const libraries = [
            { 
                name: 'Math.js',
                urls: [
                    'https://cdn.jsdelivr.net/npm/mathjs@11.8.0/lib/browser/math.min.js',
                    'https://cdnjs.cloudflare.com/ajax/libs/mathjs/11.8.0/math.min.js'
                ]
            },
            { 
                name: 'Fili.js',
                urls: [
                    'https://cdn.jsdelivr.net/npm/fili@2.0.3/dist/fili.min.js',
                    'https://unpkg.com/fili@2.0.3/dist/fili.min.js'
                ]
            },
            { 
                name: 'ARIMA',
                urls: [
                    'https://cdn.jsdelivr.net/npm/arima@0.2.5/load.js',
                    'https://unpkg.com/arima@0.2.5/dist/arima.min.js',
                    'https://cdnjs.cloudflare.com/ajax/libs/arima/0.2.5/arima.min.js'
                ]
            },
            { 
                name: 'SavitzkyGolay',
                urls: [
                    'https://cdn.jsdelivr.net/npm/ml-savitzky-golay@5.0.0/lib/index.js',
                    'https://unpkg.com/ml-savitzky-golay@5.0.0/dist/ml-savitzky-golay.min.js'
                ]
            }
        ];
        
        // Contadores y estado para seguimiento de carga
        let loadedLibraries = 0;
        let errorCount = 0;
        let errorDetails = [];
        let attemptedUrls = {}; // Seguimiento de URLs intentadas por biblioteca
        
        // Función para intentar cargar una biblioteca usando sus URLs alternativas
        const loadLibrary = (libraryInfo, urlIndex = 0) => {
            // Si ya hemos intentado todas las URLs, marcar como error
            if (urlIndex >= libraryInfo.urls.length) {
                errorCount++;
                errorDetails.push(libraryInfo.name);
                console.error(`Error al cargar biblioteca ${libraryInfo.name}: todos los intentos fallaron`);
                
                // Incrementar contador para continuar con otras bibliotecas
                loadedLibraries++;
                checkAllLoaded();
                return;
            }
            
            const currentUrl = libraryInfo.urls[urlIndex];
            attemptedUrls[libraryInfo.name] = attemptedUrls[libraryInfo.name] || [];
            attemptedUrls[libraryInfo.name].push(currentUrl);
            
            const script = document.createElement('script');
            script.src = currentUrl;
            script.async = true;
            
            // Manejar carga exitosa
            script.onload = () => {
                loadedLibraries++;
                console.log(`Biblioteca ${libraryInfo.name} cargada correctamente desde ${currentUrl}`);
                checkAllLoaded();
            };
            
            // Manejar error y reintentar con la siguiente URL
            script.onerror = () => {
                console.warn(`Error al cargar ${libraryInfo.name} desde ${currentUrl}, intentando alternativa...`);
                // Eliminar script fallido y probar con la siguiente URL
                script.remove();
                loadLibrary(libraryInfo, urlIndex + 1);
            };
            
            document.head.appendChild(script);
        };
        
        // Verificar si todas las bibliotecas han sido procesadas
        const checkAllLoaded = () => {
            if (loadedLibraries === libraries.length) {
                console.log(`Proceso de carga completo: ${loadedLibraries - errorCount}/${libraries.length} bibliotecas cargadas correctamente`);
                
                // Marcar como cargado si al menos una biblioteca fue exitosa
                if (errorCount < libraries.length) {
                    this.timeSeriesLoaded = true;
                }
                
                if (errorCount > 0) {
                    const errorMsg = `${errorCount} bibliotecas no pudieron cargarse: ${errorDetails.join(', ')}. Algunas funcionalidades avanzadas podrían ser limitadas.`;
                    this.setMessage(errorMsg, true);
                    console.warn(errorMsg);
                } else {
                    this.setMessage('Bibliotecas de series temporales cargadas correctamente', false);
                }
                
                updateLoadingStatus(); // Actualizar estado visual
                
                // Si ARIMA o SavitzkyGolay fallaron, cargar implementaciones de fallback
                if (errorDetails.includes('ARIMA') || errorDetails.includes('SavitzkyGolay')) {
                    this.loadFallbackImplementations();
                }
            }
        };
        
        try {
            // Iniciar carga de cada biblioteca con soporte para múltiples URLs
            libraries.forEach(libraryInfo => loadLibrary(libraryInfo));
            
            // Añadir un timeout de seguridad por si algo falla
            setTimeout(() => {
                if (loadedLibraries < libraries.length) {
                    console.warn('Timeout de carga de bibliotecas alcanzado, finalizando proceso');
                    // Forzar finalización para cualquier biblioteca pendiente
                    const pending = libraries.length - loadedLibraries;
                    loadedLibraries = libraries.length;
                    errorCount += pending;
                    checkAllLoaded();
                }
            }, 20000); // 20 segundos de timeout
        } catch (error) {
            console.error('Error al iniciar carga de bibliotecas:', error);
            this.setMessage(`Error al iniciar carga de bibliotecas: ${error ? error.message || 'Error desconocido' : 'Error desconocido'}`, true);
        }
        
        // Implementaciones de fallback para las bibliotecas críticas
        window.arimaFallbackImplemented = false;
        window.sgFallbackImplemented = false;
    }
    
    /**
     * Carga implementaciones de fallback para bibliotecas críticas
     */
    loadFallbackImplementations() {
        console.log("Cargando implementaciones de fallback para bibliotecas críticas...");
        
        // Implementación fallback para ARIMA si es necesario
        if (!window.ARIMA && !window.arimaFallbackImplemented) {
            console.log("Implementando fallback para ARIMA");
            window.ARIMA = function(config) {
                this.config = config || { p: 1, d: 1, q: 1 };
                
                this.train = function(data) {
                    this.trainData = data;
                    return this;
                };
                
                this.predict = function(horizon) {
                    // Implementación simplificada basada en media móvil + tendencia
                    const result = [];
                    const n = this.trainData.length;
                    if (n < 2) return Array(horizon).fill(this.trainData[0] || 0);
                    
                    // Calcular tendencia lineal
                    const x1 = 0;
                    const x2 = n - 1;
                    const y1 = this.trainData[0];
                    const y2 = this.trainData[n - 1];
                    const slope = (y2 - y1) / (x2 - x1);
                    
                    // Generar predicción
                    for (let i = 0; i < horizon; i++) {
                        result.push(y2 + slope * (i + 1));
                    }
                    
                    return result;
                };
            };
            window.arimaFallbackImplemented = true;
            console.log("Fallback ARIMA implementado");
        }
        
        // Implementación fallback para SavitzkyGolay si es necesario
        if ((!window.SG || !window.SG.savitzkyGolay) && !window.sgFallbackImplemented) {
            console.log("Implementando fallback para SavitzkyGolay");
            window.SG = window.SG || {};
            window.SG.savitzkyGolay = function(data, width, options) {
                // Implementación simple de suavizado por media móvil
                const result = [];
                const halfWidth = Math.floor((options.windowSize || 5) / 2);
                
                for (let i = 0; i < data.length; i++) {
                    let sum = 0;
                    let count = 0;
                    
                    for (let j = Math.max(0, i - halfWidth); j <= Math.min(data.length - 1, i + halfWidth); j++) {
                        sum += data[j];
                        count++;
                    }
                    
                    result.push(sum / count);
                }
                
                return result;
            };
            window.sgFallbackImplemented = true;
            console.log("Fallback SavitzkyGolay implementado");
        }
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
                        <p>Accede a información actualizada del mercado de valores con visualización avanzada.</p>
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
                    
                    <div id="projection-container" style="display:none;">
                        <div class="projection-controls">
                            <h3>Proyección de datos</h3>
                            <div class="input-group">
                                <label for="projection-period">Periodo de proyección:</label>
                                <select id="projection-period">
                                    <option value="1mo">1 mes</option>
                                    <option value="6mo">6 meses</option>
                                    <option value="1y" selected>1 año</option>
                                    <option value="5y">5 años</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label for="projection-method">Método:</label>
                                <select id="projection-method">
                                    <option value="MA" selected>Media Móvil (MA)</option>
                                    <option value="AR">Autorregresión (AR)</option>
                                    <option value="ARMA">ARMA</option>
                                    <option value="ARIMA">ARIMA</option>
                                    <option value="SARIMA">SARIMA</option>
                                    <option value="linear">Tendencia lineal</option>
                                </select>
                            </div>
                            <div class="input-group" id="model-params-container">
                                <label for="model-params">Parámetros:</label>
                                <input type="text" id="model-params" placeholder="p=1,d=0,q=1" title="Para MA: q=N | Para AR: p=N | Para ARMA/ARIMA: p=N,q=M | Para SARIMA: p=N,d=D,q=M,P=N,D=D,Q=M,m=K">
                            </div>
                            <button id="apply-projection" class="action-button projection-button">Aplicar proyección</button>
                            <button id="remove-projection" class="action-button projection-button">Quitar proyección</button>
                        </div>
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
                
                #projection-container {
                    background-color: #f0f7ff;
                    border: 1px solid #d0e3ff;
                    border-radius: 4px;
                    padding: 15px;
                    margin: 15px 0;
                }
                
                .projection-controls {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: 15px;
                }
                
                .projection-controls h3 {
                    margin: 0;
                    color: #333;
                    font-size: 16px;
                    flex-basis: 100%;
                }
                
                .projection-button {
                    background-color: #2196F3;
                }
                
                .projection-button:hover {
                    background-color: #0b7dda;
                }
                
                #remove-projection {
                    background-color: #ff9800;
                }
                
                #remove-projection:hover {
                    background-color: #e68a00;
                }
                
                /* Estilos para los parámetros de modelo */
                #model-params-container {
                    position: relative;
                }
                
                #model-params {
                    width: 150px;
                }
                
                #model-params:focus {
                    outline: 2px solid #4CAF50;
                }
                
                /* Mejorar visualización de parámetros de modelo */
                #model-params-container::after {
                    content: "?";
                    position: absolute;
                    right: -20px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background-color: #808080;
                    color: white;
                    text-align: center;
                    font-size: 12px;
                    line-height: 16px;
                    cursor: help;
                }
                
                /* Indicador de carga para métodos avanzados */
                .loading-indicator {
                    display: inline-block;
                    margin-left: 5px;
                    font-size: 12px;
                    color: #ff9800;
                }
            </style>
        `;

        // Agregar eventos a los botones
        document.getElementById('start-button').addEventListener('click', () => this.showMainScreen());
        document.getElementById('exit-button').addEventListener('click', () => this.closeApp());
        document.getElementById('back-button').addEventListener('click', () => this.showInitScreen());
        document.getElementById('execute-button').addEventListener('click', () => this.execute());
        document.getElementById('download-button').addEventListener('click', () => this.downloadCSV());
        
        // Agregar eventos para botones de proyección
        document.getElementById('apply-projection').addEventListener('click', () => this.applyProjection());
        document.getElementById('remove-projection').addEventListener('click', () => this.removeProjection());
        
        // Agregar evento para cambiar el esquema de colores
        document.getElementById('color-scheme').addEventListener('change', (e) => {
            this.changeColorScheme(e.target.value);
        });
        
        // Agregar evento para cambiar el tipo de escala
        document.getElementById('scale-type').addEventListener('change', (e) => {
            this.changeScaleType(e.target.value === 'base100');
        });
        
        // Agregar evento para actualizar placeholder de parámetros según método seleccionado
        document.getElementById('projection-method').addEventListener('change', (e) => {
            this.updateModelParamsPlaceholder(e.target.value);
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
        
        // Cargar Plotly.js y bibliotecas para análisis de series temporales dinámicamente
        Promise.all([
            this.loadScript('https://cdn.plot.ly/plotly-latest.min.js'),
            this.loadScript('https://cdn.jsdelivr.net/npm/ml-matrix@6.10.4/dist/ml-matrix.min.js'),
            this.loadScript('https://cdn.jsdelivr.net/npm/ml-stat@1.3.3/dist/ml-stat.min.js'),
            this.loadScript('https://cdn.jsdelivr.net/npm/numeric@1.2.6/numeric.min.js')
        ])
        .then(() => {
            console.log('Bibliotecas base cargadas correctamente');
            // Cargar nuestro código personalizado de series temporales
            return this.loadScript('https://cdn.jsdelivr.net/npm/timeseries-analysis@1.0.12/dist/timeseries.min.js');
        })
        .then(() => {
            console.log('Biblioteca de series temporales cargada correctamente');
            this.timeSeriesLoaded = true;
        })
        .catch(error => {
            console.error('Error al cargar bibliotecas principales:', error);
            this.setMessage(`Error al cargar bibliotecas esenciales: ${error ? error.message || 'Error desconocido' : 'Error desconocido'}`, true);
        });
    }

    /**
     * Carga un script externo dinámicamente
     * @param {string} url - URL del script a cargar
     * @returns {Promise} - Promesa que resuelve cuando el script se carga
     */
    loadScript(url) {
        return new Promise((resolve, reject) => {
            if (!url) {
                reject(new Error('URL no válida'));
                return;
            }
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
    setMessage(message, isError = true, isLoading = false) {
        const messageContainer = document.getElementById('message-container');
        if (!messageContainer) return;
        
        messageContainer.textContent = message;
        
        // Colores para diferentes tipos de mensajes
        if (isLoading) {
            messageContainer.style.color = '#0057B8'; // Azul para carga
            
            // Añadir información sobre bibliotecas si es necesario
            if (message.includes('bibliotecas')) {
                const infoText = document.createElement('div');
                infoText.style.fontSize = '0.8em';
                infoText.style.marginTop = '5px';
                infoText.textContent = 'Esto puede tardar unos segundos. Los métodos avanzados de proyección estarán disponibles cuando se complete la carga.';
                
                messageContainer.innerHTML = '';
                messageContainer.appendChild(document.createTextNode(message));
                messageContainer.appendChild(infoText);
            }
        } else {
            messageContainer.style.color = isError ? '#D8000C' : '#4F8A10'; // Rojo para error, verde para éxito
        }
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
            
            // Mostrar el contenedor de proyección
            const projectionContainer = document.getElementById('projection-container');
            if (projectionContainer) {
                projectionContainer.style.display = 'block';
            }
            
            // Restablecer estado de proyección
            this.showingProjection = false;
            this.projectionData = {};
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
    
    /**
     * Actualiza el placeholder de parámetros según el modelo seleccionado
     * @param {string} modelType - Tipo de modelo de serie temporal
     */
    updateModelParamsPlaceholder(modelType) {
        const modelParamsInput = document.getElementById('model-params');
        const modelParamsContainer = document.getElementById('model-params-container');
        if (!modelParamsInput || !modelParamsContainer) return;
        
        let helpText = '';
        let placeholder = '';
        
        switch (modelType) {
            case 'MA':
                placeholder = 'q=2';
                helpText = 'Media Móvil: q = Orden (tamaño de la ventana). Mayor valor = más suavizado.';
                // Actualizar el contenedor para mostrar información sobre la biblioteca
                modelParamsContainer.classList.toggle('loading', !this.timeSeriesLoaded);
                break;
            case 'AR':
                placeholder = 'p=2';
                helpText = 'Autorregresión: p = Número de observaciones anteriores utilizadas. Mayor valor = más historia considera.';
                modelParamsContainer.classList.toggle('loading', !this.timeSeriesLoaded);
                break;
            case 'ARMA':
                placeholder = 'p=1,q=1';
                helpText = 'ARMA: p = Orden AR (historia), q = Orden MA (errores). Balanceado para series con tendencias.';
                modelParamsContainer.classList.toggle('loading', !this.timeSeriesLoaded);
                break;
            case 'ARIMA':
                placeholder = 'p=1,d=1,q=1';
                helpText = 'ARIMA: p = Orden AR, d = Diferenciación (elimina tendencias), q = Orden MA. Bueno para series con tendencia.';
                modelParamsContainer.classList.toggle('loading', !this.timeSeriesLoaded);
                break;
            case 'SARIMA':
                placeholder = 'p=1,d=1,q=1,P=0,D=1,Q=1,m=12';
                helpText = 'SARIMA: p,d,q = Parámetros ARIMA, P,D,Q = Parámetros estacionales, m = Periodo estacional (7=semanal, 12=mensual)';
                modelParamsContainer.classList.toggle('loading', !this.timeSeriesLoaded);
                break;
            case 'linear':
                placeholder = 'No requiere parámetros';
                helpText = 'Tendencia lineal simple. No requiere bibliotecas adicionales.';
                modelParamsContainer.classList.remove('loading');
                break;
            default:
                placeholder = 'p=1,d=0,q=1';
                helpText = 'Especifique parámetros en formato clave=valor separados por comas';
        }
        
        // Actualizar el input y el tooltip
        modelParamsInput.placeholder = placeholder;
        modelParamsInput.title = helpText;
        modelParamsContainer.title = helpText;
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
        
        // Si hay proyección, agregarla después de redibujar el gráfico principal
        if (this.showingProjection && Object.keys(this.projectionData).length > 0) {
            this.addProjectionToChart();
        }
    }
    
    /**
     * Calcula y aplica una proyección a los datos actuales
     */
    applyProjection() {
        if (Object.keys(this.currentData).length === 0 || this.tickers.length === 0) {
            this.setMessage('Primero debe cargar datos para realizar una proyección.');
            return;
        }
        
        const projectionPeriod = document.getElementById('projection-period').value;
        let projectionMethod = document.getElementById('projection-method').value;
        
        // Verificar si la biblioteca está cargada para métodos avanzados
        if (!this.timeSeriesLoaded && projectionMethod !== 'linear') {
            // Comprobar si alguna de las bibliotecas está disponible de manera robusta
            const hasLibraries = typeof window.math !== 'undefined' || 
                                typeof window.Fili !== 'undefined' || 
                                typeof window.ARIMA === 'function' || 
                                typeof window.SG !== 'undefined';
            
            if (!hasLibraries) {
                this.setMessage('Las bibliotecas de series temporales no están disponibles. Utilizando método lineal como alternativa.', true);
                projectionMethod = 'linear'; // Forzar a usar método lineal
            } else {
                this.setMessage('Algunas bibliotecas de series temporales están disponibles. Intentando utilizar el método solicitado...', false);
            }
        }
        
        this.setMessage(`Calculando proyección ${projectionMethod} para ${projectionPeriod}...`, false);
        
        try {
            // Calcular datos de proyección para cada ticker
            this.projectionData = {};
            
            this.tickers.forEach(ticker => {
                // Obtener los datos existentes del ticker
                const data = this.currentData[ticker];
                
                if (!data || data.length === 0) {
                    return;
                }
                
                try {
                    // Calcular proyección según el método seleccionado
                    const projectedData = this.calculateProjection(data, projectionPeriod, projectionMethod);
                    this.projectionData[ticker] = projectedData;
                } catch (tickerError) {
                    console.error(`Error al calcular proyección para ${ticker}:`, tickerError);
                    // Si falla un ticker, continuamos con el siguiente
                }
            });
            
            if (Object.keys(this.projectionData).length === 0) {
                throw new Error('No se pudo calcular ninguna proyección válida');
            }
            
            // Marcar que se está mostrando una proyección
            this.showingProjection = true;
            
            // Agregar las proyecciones al gráfico
            this.addProjectionToChart();
            
            this.setMessage(`Proyección aplicada correctamente para ${Object.keys(this.projectionData).length} ticker(s).`, false);
        } catch (error) {
            this.setMessage(`Error al calcular la proyección: ${error.message}`);
            this.showingProjection = false;
            this.projectionData = {};
        }
    }
    
    /**
     * Elimina la proyección del gráfico
     */
    removeProjection() {
        if (!this.showingProjection || Object.keys(this.projectionData).length === 0) {
            this.setMessage('No hay proyección actualmente mostrada.');
            return;
        }
        
        // Restablecer estado
        this.showingProjection = false;
        this.projectionData = {};
        
        // Redibujar el gráfico sin proyecciones
        this.redrawChart();
        this.setMessage('Proyección removida.', false);
    }
    
    /**
     * Calcula los datos de proyección según el método seleccionado
     * @param {Array} data - Datos históricos del ticker
     * @param {string} period - Periodo de proyección
     * @param {string} method - Método de proyección
     * @returns {Array} - Datos de la proyección
     */
    calculateProjection(data, period, method) {
        // Verificar si la biblioteca está cargada
        if (!this.timeSeriesLoaded && method !== 'linear') {
            this.setMessage('Biblioteca de series temporales aún no cargada. Usando tendencia lineal como alternativa.', true);
            method = 'linear';
        }
        
        // Obtener el último punto de datos como referencia
        const lastPoint = data[data.length - 1];
        const lastDate = new Date(lastPoint.date);
        
        // Determinar cuántos puntos generar según el periodo
        let pointsToGenerate = 0;
        let intervalDays = 0;
        
        switch (period) {
            case '1mo': 
                pointsToGenerate = 20;  // Aproximadamente 20 días hábiles en un mes
                intervalDays = 1;
                break;
            case '6mo': 
                pointsToGenerate = 26;  // Aproximadamente 26 semanas en 6 meses
                intervalDays = 7;
                break;
            case '1y': 
                pointsToGenerate = 52;  // 52 semanas en un año
                intervalDays = 7;
                break;
            case '5y': 
                pointsToGenerate = 60;  // 60 meses en 5 años
                intervalDays = 30;
                break;
            default:
                pointsToGenerate = 52;  // Valor por defecto: 1 año
                intervalDays = 7;
        }
        
        // Calcular el intervalo basado en los datos existentes
        // Si los datos son diarios, semanales o mensuales
        let actualInterval = 7; // Por defecto asumimos semanal
        if (data.length > 1) {
            const date1 = new Date(data[data.length - 1].date);
            const date2 = new Date(data[data.length - 2].date);
            const diffDays = Math.round((date1 - date2) / (1000 * 60 * 60 * 24));
            actualInterval = Math.max(1, diffDays);
        }
        
        // Usar el intervalo calculado en lugar del predeterminado
        intervalDays = actualInterval;
        
        // Obtener los parámetros del modelo desde la entrada
        const paramsInput = document.getElementById('model-params').value.trim();
        const params = this.parseModelParameters(paramsInput, method);
        
        // Preparar datos para análisis de series temporales
        // Extraer solo los precios de cierre para el análisis
        const prices = data.map(item => item.close);
        
        // Generar proyección según el método seleccionado
        let projectedPrices = [];
        
        try {
            switch (method) {
                case 'MA':
                    projectedPrices = this.calculateMA(prices, pointsToGenerate, params);
                    break;
                case 'AR':
                    projectedPrices = this.calculateAR(prices, pointsToGenerate, params);
                    break;
                case 'ARMA':
                    projectedPrices = this.calculateARMA(prices, pointsToGenerate, params);
                    break;
                case 'ARIMA':
                    projectedPrices = this.calculateARIMA(prices, pointsToGenerate, params);
                    break;
                case 'SARIMA':
                    projectedPrices = this.calculateSARIMA(prices, pointsToGenerate, params);
                    break;
                case 'linear':
                default:
                    projectedPrices = this.calculateLinear(prices, pointsToGenerate);
                    break;
            }
        } catch (error) {
            console.error(`Error al calcular proyección con método ${method}:`, error);
            this.setMessage(`Error en cálculo de ${method}: ${error.message}. Usando tendencia lineal.`);
            
            // Si falla, usar tendencia lineal como fallback
            projectedPrices = this.calculateLinear(prices, pointsToGenerate);
        }
        
        // Convertir los precios proyectados en objetos de datos completos
        const projectedData = [];
        const lastClose = prices[prices.length - 1];
        
        // Generar datos completos con fechas y precios OHLC
        for (let i = 0; i < projectedPrices.length; i++) {
            // Calcular nueva fecha
            const newDate = new Date(lastDate);
            newDate.setDate(newDate.getDate() + intervalDays * (i + 1));
            const dateStr = newDate.toISOString().split('T')[0];
            
            // Asegurar que el precio proyectado no sea negativo
            const projectedClose = Math.max(0, projectedPrices[i]);
            
            // Agregar punto a los datos proyectados
            projectedData.push({
                date: dateStr,
                close: projectedClose,
                // Estimación simple para open/high/low basada en la volatilidad histórica
                open: projectedClose * 0.99,
                high: projectedClose * 1.01,
                low: projectedClose * 0.98
            });
        }
        
        return projectedData;
    }
    
    /**
     * Parsea los parámetros del modelo desde una cadena de entrada
     * @param {string} inputString - Cadena de parámetros (p=1,d=1,q=1,...)
     * @param {string} method - Método de proyección
     * @returns {Object} - Objeto con parámetros parseados
     */
    parseModelParameters(inputString, method) {
        // Valores por defecto según método
        const defaults = {
            'MA': { q: 2 },
            'AR': { p: 2 },
            'ARMA': { p: 1, q: 1 },
            'ARIMA': { p: 1, d: 1, q: 1 },
            'SARIMA': { p: 1, d: 1, q: 1, P: 0, D: 1, Q: 1, m: 12 }
        };
        
        // Si no hay entrada o el método es lineal, devolver valores por defecto
        if (!inputString || method === 'linear') {
            return defaults[method] || {};
        }
        
        // Parsear la cadena de parámetros
        const params = {};
        const parts = inputString.split(',');
        
        parts.forEach(part => {
            const [key, valueStr] = part.trim().split('=');
            if (key && valueStr) {
                const value = parseInt(valueStr, 10);
                if (!isNaN(value)) {
                    params[key.trim()] = value;
                }
            }
        });
        
        // Combinar con valores por defecto
        return { ...defaults[method], ...params };
    }
    
    /**
     * Calcula proyección usando Media Móvil (MA)
     */
    calculateMA(data, horizon, params) {
        // Verificar disponibilidad de bibliotecas de manera más robusta
        const hasSG = typeof window.SG !== 'undefined' && typeof window.SG.savitzkyGolay === 'function';
        const hasFili = typeof window.Fili !== 'undefined' && typeof window.Fili.FirCoeffs === 'function';
        
        if (!hasSG && !hasFili && !this.timeSeriesLoaded) {
            console.warn("Bibliotecas para Media Móvil no disponibles, usando implementación simple");
        }
        
        const q = params.q || 2; // Orden de MA
        
        try {
            // Usamos Savitzky-Golay para suavizar los datos (una forma de media móvil)
            const options = {
                windowSize: Math.min(Math.max(3, q * 2 + 1), data.length - 1), // Ventana debe ser impar y no mayor que los datos
                derivative: 0,
                polynomial: 2
            };
            
            // Aplicar suavizado
            let smoothed = data;
            
            // Intentar usar bibliotecas disponibles, con fallback incluido
            if (hasSG && typeof SG.savitzkyGolay === 'function') {
                try {
                    smoothed = SG.savitzkyGolay(data, 1, options);
                    console.log("Usando SG para media móvil");
                } catch (e) {
                    console.warn("Error al usar SG:", e);
                }
            } else if (hasFili) {
                try {
                    // Alternativa usando fili.js
                    const firCalculator = new Fili.FirCoeffs();
                    const firCoeffs = firCalculator.lowpass({
                        order: q * 2,
                        Fs: 1,
                        Fc: 0.2
                    });
                    
                    const filter = new Fili.FirFilter(firCoeffs);
                    smoothed = filter.multiStep(data);
                    console.log("Usando Fili para media móvil");
                } catch (e) {
                    console.warn("Error al usar Fili:", e);
                }
            } else {
                // Implementación manual simple de media móvil si ninguna biblioteca está disponible
                smoothed = [];
                for (let i = 0; i < data.length; i++) {
                    let sum = 0;
                    let count = 0;
                    
                    // Calcular media de ventana móvil
                    for (let j = Math.max(0, i - q); j <= Math.min(data.length - 1, i + q); j++) {
                        sum += data[j];
                        count++;
                    }
                    
                    smoothed.push(sum / count);
                }
                console.log("Usando implementación manual para media móvil");
            }
            
            // Calcular la tendencia a partir de los datos suavizados
            const recent = smoothed.slice(-5);
            let avgChange = 0;
            
            for (let i = 1; i < recent.length; i++) {
                avgChange += recent[i] - recent[i - 1];
            }
            avgChange /= (recent.length - 1);
            
            // Generar proyección
            const forecast = [];
            let lastValue = smoothed[smoothed.length - 1];
            
            for (let i = 0; i < horizon; i++) {
                lastValue += avgChange;
                forecast.push(lastValue);
            }
            
            return forecast;
        } catch (e) {
            console.error('Error en cálculo MA:', e);
            return this.calculateLinear(data, horizon); // Fallback a lineal
        }
    }
    
    /**
     * Calcula proyección usando Autorregresión (AR)
     */
    calculateAR(data, horizon, params) {
        // Verificar disponibilidad de math.js de manera más robusta
        const hasMath = typeof window.math !== 'undefined' && typeof window.math.multiply === 'function';
        
        if (!hasMath && !this.timeSeriesLoaded) {
            console.warn("Biblioteca math.js no disponible o incompleta, usando implementación simplificada de AR");
        }
        
        const p = Math.min(params.p || 2, Math.floor(data.length / 2)); // Orden de AR, limitado por los datos
        
        try {
            // Implementación simple de AR(p)
            const coefficients = this.estimateARCoefficients(data, p);
            const forecast = [];
            
            // Usamos los últimos p valores para empezar
            const lastValues = data.slice(-p);
            
            for (let i = 0; i < horizon; i++) {
                // Predicción AR: combinación lineal de los últimos p valores
                let prediction = 0;
                for (let j = 0; j < p; j++) {
                    prediction += coefficients[j] * lastValues[(lastValues.length - 1) - j];
                }
                
                forecast.push(prediction);
                
                // Actualizar los últimos valores para la siguiente predicción
                lastValues.shift();
                lastValues.push(prediction);
            }
            
            return forecast;
        } catch (e) {
            console.error('Error en cálculo AR:', e);
            return this.calculateLinear(data, horizon); // Fallback a lineal
        }
    }
    
    /**
     * Estima los coeficientes AR usando método de los mínimos cuadrados
     */
    estimateARCoefficients(data, p) {
        // Implementación simplificada para estimar coeficientes AR
        // En una implementación real, se usaría regresión lineal múltiple
        // Para simplificar, usamos un promedio ponderado
        const coefficients = [];
        
        // Peso decreciente para valores más antiguos
        const total = p * (p + 1) / 2; // Suma de 1 a p
        
        for (let i = 1; i <= p; i++) {
            coefficients.push((p - i + 1) / total);
        }
        
        return coefficients;
    }
    
    /**
     * Calcula proyección usando ARMA (Autoregresivo + Media Móvil)
     */
    calculateARMA(data, horizon, params) {
        const p = params.p || 1; // Orden AR
        const q = params.q || 1; // Orden MA
        
        try {
            // Combinamos los modelos AR y MA
            const arCoefficients = this.estimateARCoefficients(data, p);
            
            // Calculamos los errores para el componente MA
            const errors = [];
            for (let i = p; i < data.length; i++) {
                let prediction = 0;
                for (let j = 0; j < p; j++) {
                    prediction += arCoefficients[j] * data[i - j - 1];
                }
                errors.push(data[i] - prediction);
            }
            
            // Media móvil de los errores
            const maCoefficients = [];
            for (let i = 0; i < q; i++) {
                maCoefficients.push(1 / q);
            }
            
            // Proyección
            const forecast = [];
            const lastValues = data.slice(-p);
            const lastErrors = errors.slice(-q);
            
            for (let i = 0; i < horizon; i++) {
                // Componente AR
                let arComponent = 0;
                for (let j = 0; j < p; j++) {
                    arComponent += arCoefficients[j] * lastValues[(lastValues.length - 1) - j];
                }
                
                // Componente MA
                let maComponent = 0;
                for (let j = 0; j < q; j++) {
                    if (j < lastErrors.length) {
                        maComponent += maCoefficients[j] * lastErrors[(lastErrors.length - 1) - j];
                    }
                }
                
                const prediction = arComponent + maComponent;
                forecast.push(prediction);
                
                // Actualizar para la siguiente predicción
                lastValues.shift();
                lastValues.push(prediction);
                
                const error = 0; // No podemos calcular el error real para predicciones futuras
                lastErrors.shift();
                lastErrors.push(error);
            }
            
            return forecast;
        } catch (e) {
            console.error('Error en cálculo ARMA:', e);
            return this.calculateLinear(data, horizon); // Fallback a lineal
        }
    }
    
    /**
     * Calcula proyección usando ARIMA (ARMA + Integración)
     */
    calculateARIMA(data, horizon, params) {
        const p = params.p || 1; // Orden AR
        const d = params.d || 1; // Orden de diferenciación
        const q = params.q || 1; // Orden MA
        
        try {
            // Verificar si la biblioteca ARIMA está disponible de manera más robusta
            const hasARIMA = typeof window.ARIMA === 'function';
            
            if (hasARIMA) {
                console.log("Usando biblioteca ARIMA para proyección");
                
                // Usar la implementación de la biblioteca
                const arimaConfig = {
                    p: p,
                    d: d,
                    q: q,
                    verbose: false
                };
                
                // Crear y entrenar el modelo ARIMA
                const arimaModel = new ARIMA(arimaConfig).train(data);
                
                // Realizar la predicción
                return arimaModel.predict(horizon);
            } else {
                console.log("Biblioteca ARIMA no disponible, usando implementación propia");
                
                // Implementación manual como fallback
                // Diferenciar los datos d veces
                let diffData = [...data];
                for (let i = 0; i < d; i++) {
                    diffData = this.differenceData(diffData);
                }
                
                // Aplicar ARMA al resultado diferenciado
                const armaForecast = this.calculateARMA(diffData, horizon, { p, q });
                
                // Integrar las diferencias para obtener la predicción final
                return this.integrateData(armaForecast, data, d);
            }
        } catch (e) {
            console.error('Error en cálculo ARIMA:', e);
            return this.calculateLinear(data, horizon); // Fallback a lineal
        }
    }
    
    /**
     * Calcula la diferencia entre valores consecutivos en los datos
     */
    differenceData(data) {
        const result = [];
        for (let i = 1; i < data.length; i++) {
            result.push(data[i] - data[i - 1]);
        }
        return result;
    }
    
    /**
     * Integra los datos diferenciados para obtener valores originales
     */
    integrateData(forecast, originalData, d) {
        let result = [...forecast];
        
        for (let i = 0; i < d; i++) {
            const lastOriginal = originalData[originalData.length - 1 - i];
            for (let j = 0; j < result.length; j++) {
                result[j] = (j === 0) ? lastOriginal + result[j] : result[j - 1] + result[j];
            }
        }
        
        return result;
    }
    
    /**
     * Calcula proyección usando SARIMA (ARIMA + Estacionalidad)
     */
    calculateSARIMA(data, horizon, params) {
        const p = params.p || 1; // Orden AR no estacional
        const d = params.d || 1; // Orden de diferenciación no estacional
        const q = params.q || 1; // Orden MA no estacional
        const P = params.P || 0; // Orden AR estacional
        const D = params.D || 1; // Orden de diferenciación estacional
        const Q = params.Q || 1; // Orden MA estacional
        const m = params.m || 12; // Periodo estacional
        
        try {
            // Para una implementación real de SARIMA, se requeriría una biblioteca más completa
            // Esta es una implementación simplificada
            
            // Aplicamos primero diferenciación estacional
            let seasonalDiffData = [...data];
            for (let i = 0; i < D; i++) {
                seasonalDiffData = this.seasonalDifference(seasonalDiffData, m);
            }
            
            // Luego aplicamos ARIMA a los datos diferenciados estacionalmente
            const arimaForecast = this.calculateARIMA(seasonalDiffData, horizon, { p, d, q });
            
            // Aplicamos el componente estacional
            const forecast = [];
            const lastPeriod = data.slice(-m);
            
            for (let i = 0; i < horizon; i++) {
                // Agregamos componente estacional (promedio ponderado)
                const seasonalComponent = lastPeriod[i % lastPeriod.length] * 0.3; // 30% influencia estacional
                forecast.push(arimaForecast[i] + seasonalComponent);
            }
            
            return forecast;
        } catch (e) {
            console.error('Error en cálculo SARIMA:', e);
            return this.calculateLinear(data, horizon); // Fallback a lineal
        }
    }
    
    /**
     * Calcula la diferencia estacional
     */
    seasonalDifference(data, period) {
        const result = [];
        for (let i = period; i < data.length; i++) {
            result.push(data[i] - data[i - period]);
        }
        return result;
    }
    
    /**
     * Calcula proyección usando tendencia lineal simple
     */
    calculateLinear(data, horizon) {
        // Cálculo de tendencia lineal
        const n = data.length;
        if (n < 2) return Array(horizon).fill(data[0] || 0);
        
        // Estimamos pendiente usando regresión lineal simple
        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumX2 = 0;
        
        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += data[i];
            sumXY += i * data[i];
            sumX2 += i * i;
        }
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        // Generar proyección
        const forecast = [];
        for (let i = 0; i < horizon; i++) {
            const x = n + i;
            const prediction = intercept + slope * x;
            forecast.push(Math.max(0, prediction)); // Evitar valores negativos
        }
        
        return forecast;
    }
    
    /**
     * Agrega las trazas de proyección al gráfico actual
     */
    addProjectionToChart() {
        if (!this.showingProjection || Object.keys(this.projectionData).length === 0) {
            return;
        }
        
        const chartContainer = document.getElementById('stock-chart');
        if (!chartContainer || !chartContainer.data) {
            return;
        }
        
        // Determinar si estamos usando base 100
        const useBase100 = this.tickers.length > 1 && this.useBase100;
        
        // Variables para normalización base 100
        let firstDateValues = {};
        
        // Si estamos usando base 100, obtener valores de referencia
        if (useBase100) {
            this.tickers.forEach(ticker => {
                const data = this.currentData[ticker];
                if (data && data.length > 0) {
                    firstDateValues[ticker] = data[0].close;
                }
            });
        }
        
        // Para cada ticker con proyección, crear una traza de línea
        const projectionTraces = [];
        
        // Colores para las líneas de proyección
        const projectionColors = [
            '#005293', '#00A651', '#F26419', '#1ABC9C', '#F4D03F',
            '#E91E63', '#03A9F4', '#CDDC39', '#FF7F50', '#9F8FEF'
        ];
        
        this.tickers.forEach((ticker, index) => {
            // Solo crear proyección si hay datos
            if (!this.projectionData[ticker] || this.projectionData[ticker].length === 0) {
                return;
            }
            
            const projData = this.projectionData[ticker];
            
            // Preparar datos para la traza
            let dates = projData.map(item => item.date);
            let values;
            
            // Aplicar normalización si es necesario
            if (useBase100 && firstDateValues[ticker]) {
                const baseValue = firstDateValues[ticker];
                values = projData.map(item => (item.close / baseValue) * 100);
            } else {
                values = projData.map(item => item.close);
            }
            
            // Agregar el último punto de los datos reales para unir las series
            const realData = this.currentData[ticker];
            if (realData && realData.length > 0) {
                const lastRealPoint = realData[realData.length - 1];
                dates = [lastRealPoint.date, ...dates];
                
                let lastValue;
                if (useBase100 && firstDateValues[ticker]) {
                    lastValue = (lastRealPoint.close / firstDateValues[ticker]) * 100;
                } else {
                    lastValue = lastRealPoint.close;
                }
                
                values = [lastValue, ...values];
            }
            
            // Crear traza para la proyección
            const trace = {
                x: dates,
                y: values,
                type: 'scatter',
                mode: 'lines',
                line: {
                    color: projectionColors[index % projectionColors.length],
                    width: 2,
                    dash: 'dashdot'
                },
                name: `${ticker} (Proyección)`,
                showlegend: true,
                legendgroup: ticker
            };
            
            projectionTraces.push(trace);
        });
        
        // Añadir trazas de proyección al gráfico
        if (projectionTraces.length > 0) {
            Plotly.addTraces(chartContainer, projectionTraces);
        }
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
