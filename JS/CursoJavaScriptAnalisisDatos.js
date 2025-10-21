/**
 * CursoJavaScriptAnalisisDatos.js
 * 
 * Este archivo es una guía educativa sobre cómo trabajar con:
 * - Importación de bibliotecas externas en JavaScript
 * - Uso de APIs como Yahoo Finance
 * - Manipulación de datasets en JavaScript
 * - Implementación de modelos estadísticos (ARIMA y derivados)
 * - Visualización de datos con Plotly.js
 */

/**
 * ============================================================================
 * PARTE 1: IMPORTACIÓN DE BIBLIOTECAS EXTERNAS EN JAVASCRIPT
 * ============================================================================
 * 
 * En JavaScript para el navegador, hay varias formas de importar bibliotecas:
 */

/**
 * Método 1: Uso de etiquetas <script> en HTML
 * Este es el método más tradicional, pero requiere editar el HTML.
 * 
 * En tu archivo HTML:
 * 
 * <!DOCTYPE html>
 * <html>
 * <head>
 *    <title>Mi Aplicación de Análisis</title>
 *    <!-- Cargar Plotly desde CDN -->
 *    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
 *    <!-- Cargar math.js desde CDN -->
 *    <script src="https://cdnjs.cloudflare.com/ajax/libs/mathjs/9.5.0/math.min.js"></script>
 * </head>
 * <body>
 *    <div id="grafico"></div>
 *    <script src="miScript.js"></script>
 * </body>
 * </html>
 */

/**
 * Método 2: Importación dinámica usando JavaScript
 * Este método permite cargar bibliotecas bajo demanda y manejar errores.
 */

// Función para cargar scripts dinámicamente
function cargarScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Error al cargar: ${url}`));
        document.head.appendChild(script);
    });
}

// Ejemplo de uso - Cargar múltiples bibliotecas
async function cargarBibliotecas() {
    try {
        // 1. Cargar Plotly.js para visualizaciones
        await cargarScript('https://cdn.plot.ly/plotly-latest.min.js');
        console.log('Plotly.js cargado correctamente');
        
        // 2. Cargar math.js para cálculos matemáticos
        await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/mathjs/9.5.0/math.min.js');
        console.log('math.js cargado correctamente');
        
        // 3. Cargar ARIMA.js para modelado de series temporales
        await cargarScript('https://cdn.jsdelivr.net/npm/arima@0.2.5/load.js');
        console.log('ARIMA cargado correctamente');
        
        // 4. Cargar Savitzky-Golay para suavizado de datos
        await cargarScript('https://cdn.jsdelivr.net/npm/ml-savitzky-golay@5.0.0/lib/index.js');
        console.log('Savitzky-Golay cargado correctamente');
        
        // Una vez que todas las bibliotecas están cargadas, podemos iniciar la aplicación
        iniciarAnalisis();
    } catch (error) {
        console.error('Error al cargar bibliotecas:', error);
        
        // Implementar soluciones de fallback si es necesario
        cargarImplementacionesAlternativas();
    }
}

/**
 * Manejo de errores y fallbacks
 * Es importante tener implementaciones alternativas si las bibliotecas no se cargan.
 */
function cargarImplementacionesAlternativas() {
    console.log('Cargando implementaciones alternativas...');
    
    // Implementación básica de ARIMA si la biblioteca no está disponible
    if (!window.ARIMA) {
        window.ARIMA = class {
            constructor(config) {
                this.config = config || { p: 1, d: 1, q: 1 };
            }
            
            train(data) {
                this.data = data;
                return this;
            }
            
            predict(horizon) {
                // Implementación simple de predicción lineal
                const result = [];
                const n = this.data.length;
                if (n < 2) return Array(horizon).fill(this.data[0] || 0);
                
                // Calcular la tendencia promedio
                const lastValue = this.data[n - 1];
                const preLastValue = this.data[n - 2];
                const tendency = lastValue - preLastValue;
                
                // Proyectar basado en la tendencia
                for (let i = 0; i < horizon; i++) {
                    result.push(lastValue + tendency * (i + 1));
                }
                
                return result;
            }
        };
        
        console.log('Implementación alternativa de ARIMA cargada');
    }
    
    // Continúa con otras implementaciones de fallback según sea necesario
}

/**
 * ============================================================================
 * PARTE 2: USO DE APIS COMO YAHOO FINANCE
 * ============================================================================
 */

/**
 * Clase para interactuar con Yahoo Finance
 * Yahoo Finance no proporciona una API oficial gratuita, pero se pueden usar
 * endpoints no oficiales o servicios proxy para obtener datos.
 */
class YahooFinanceAPI {
    /**
     * Obtiene datos históricos para un símbolo
     * @param {string} symbol - Símbolo del ticker (ej: AAPL, MSFT)
     * @param {string} interval - Intervalo de tiempo (1d, 1wk, 1mo)
     * @param {string} range - Rango de tiempo (1mo, 3mo, 6mo, 1y, 5y, max)
     * @returns {Promise<Array>} - Datos históricos formateados
     */
    async obtenerDatosHistoricos(symbol, interval = '1d', range = '1y') {
        try {
            // Construir la URL para la API no oficial de Yahoo Finance
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;
            
            // Usar un proxy CORS para evitar problemas de acceso desde el navegador
            const proxyUrl = `https://cors-anywhere.herokuapp.com/${url}`;
            
            const respuesta = await fetch(proxyUrl);
            
            if (!respuesta.ok) {
                throw new Error(`Error HTTP: ${respuesta.status}`);
            }
            
            const datos = await respuesta.json();
            
            // Verificar si la respuesta contiene datos válidos
            if (!datos.chart || !datos.chart.result || datos.chart.result.length === 0) {
                throw new Error('No se encontraron datos para este símbolo');
            }
            
            // Procesar los datos recibidos
            return this.formatearDatosYahoo(datos);
        } catch (error) {
            console.error(`Error al obtener datos para ${symbol}:`, error);
            
            // Intentar con un método alternativo si el principal falla
            return this.metodoAlternativo(symbol, interval, range);
        }
    }
    
    /**
     * Formatea los datos de Yahoo Finance a un formato estándar
     * @param {Object} respuesta - Respuesta de la API de Yahoo
     * @returns {Array} - Datos formateados
     */
    formatearDatosYahoo(respuesta) {
        const resultado = respuesta.chart.result[0];
        const timestamps = resultado.timestamp;
        const cotizaciones = resultado.indicators.quote[0];
        
        // Crear un array de objetos con los datos formateados
        return timestamps.map((timestamp, i) => {
            // Convertir timestamp Unix a fecha ISO
            const fecha = new Date(timestamp * 1000).toISOString().split('T')[0];
            
            return {
                fecha,
                apertura: cotizaciones.open[i],
                maximo: cotizaciones.high[i],
                minimo: cotizaciones.low[i],
                cierre: cotizaciones.close[i],
                volumen: cotizaciones.volume[i]
            };
        }).filter(item => 
            // Filtrar valores nulos o indefinidos
            item.apertura !== null && 
            item.maximo !== null && 
            item.minimo !== null && 
            item.cierre !== null
        );
    }
    
    /**
     * Método alternativo para obtener datos si el principal falla
     * @param {string} symbol - Símbolo del ticker
     * @param {string} interval - Intervalo de tiempo
     * @param {string} range - Rango de tiempo
     * @returns {Promise<Array>} - Datos históricos formateados
     */
    async metodoAlternativo(symbol, interval, range) {
        try {
            // Usar un servicio alternativo como AllOrigins para evitar problemas CORS
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            
            const respuesta = await fetch(proxyUrl);
            
            if (!respuesta.ok) {
                throw new Error(`Error HTTP: ${respuesta.status}`);
            }
            
            const datos = await respuesta.json();
            
            return this.formatearDatosYahoo(datos);
        } catch (error) {
            console.error('Método alternativo también falló:', error);
            throw error; // Propagar el error si ambos métodos fallan
        }
    }
}

/**
 * ============================================================================
 * PARTE 3: MANIPULACIÓN DE DATASETS EN JAVASCRIPT
 * ============================================================================
 */

/**
 * Clase para procesamiento y manipulación de datos de series temporales
 */
class ProcesadorDatos {
    /**
     * Normaliza datos a base 100
     * @param {Array} datos - Array de objetos con datos de precios
     * @returns {Array} - Datos normalizados
     */
    normalizarBase100(datos) {
        if (!datos || datos.length === 0) return [];
        
        // Tomar el primer valor de cierre como base
        const valorBase = datos[0].cierre;
        
        // Normalizar todos los valores
        return datos.map(item => ({
            fecha: item.fecha,
            apertura: (item.apertura / valorBase) * 100,
            maximo: (item.maximo / valorBase) * 100,
            minimo: (item.minimo / valorBase) * 100,
            cierre: (item.cierre / valorBase) * 100,
            volumen: item.volumen
        }));
    }
    
    /**
     * Calcula rendimientos diarios/periódicos
     * @param {Array} datos - Array de objetos con datos de precios
     * @returns {Array} - Datos de rendimientos
     */
    calcularRendimientos(datos) {
        if (!datos || datos.length <= 1) return [];
        
        const rendimientos = [];
        
        for (let i = 1; i < datos.length; i++) {
            const rendimientoDiario = (datos[i].cierre / datos[i-1].cierre) - 1;
            
            rendimientos.push({
                fecha: datos[i].fecha,
                rendimiento: rendimientoDiario,
                rendimientoPorcentual: rendimientoDiario * 100
            });
        }
        
        return rendimientos;
    }
    
    /**
     * Calcula estadísticas descriptivas de los datos
     * @param {Array} datos - Array de valores numéricos o objetos con propiedad 'cierre'
     * @returns {Object} - Estadísticas descriptivas
     */
    calcularEstadisticas(datos) {
        // Extraer valores de cierre si los datos son objetos
        const valores = Array.isArray(datos) ? 
            (typeof datos[0] === 'object' ? datos.map(d => d.cierre) : datos) : 
            [];
            
        if (valores.length === 0) return {};
        
        // Ordenar valores para calcular medianas y percentiles
        const valoresOrdenados = [...valores].sort((a, b) => a - b);
        
        // Calcular estadísticas básicas
        const suma = valores.reduce((acc, val) => acc + val, 0);
        const n = valores.length;
        const media = suma / n;
        
        // Calcular desviación estándar
        const sumaCuadrados = valores.reduce((acc, val) => acc + Math.pow(val - media, 2), 0);
        const varianza = sumaCuadrados / n;
        const desviacionEstandar = Math.sqrt(varianza);
        
        // Calcular mediana
        const mediana = n % 2 === 0 ? 
            (valoresOrdenados[n/2 - 1] + valoresOrdenados[n/2]) / 2 : 
            valoresOrdenados[Math.floor(n/2)];
        
        // Calcular mín y máx
        const minimo = valoresOrdenados[0];
        const maximo = valoresOrdenados[n - 1];
        
        // Calcular percentiles
        const percentil25 = valoresOrdenados[Math.floor(n * 0.25)];
        const percentil75 = valoresOrdenados[Math.floor(n * 0.75)];
        
        return {
            n,
            media,
            mediana,
            minimo,
            maximo,
            desviacionEstandar,
            varianza,
            percentil25,
            percentil75,
            rango: maximo - minimo
        };
    }
    
    /**
     * Calcula una media móvil simple
     * @param {Array} datos - Array de valores o objetos con propiedad 'cierre'
     * @param {number} ventana - Tamaño de la ventana
     * @returns {Array} - Media móvil calculada
     */
    calcularMediaMovil(datos, ventana = 20) {
        // Extraer valores de cierre si los datos son objetos
        const valores = Array.isArray(datos) ? 
            (typeof datos[0] === 'object' ? datos.map(d => d.cierre) : datos) : 
            [];
            
        if (valores.length < ventana) return [];
        
        const mediaMovil = [];
        
        for (let i = ventana - 1; i < valores.length; i++) {
            let suma = 0;
            
            for (let j = 0; j < ventana; j++) {
                suma += valores[i - j];
            }
            
            const media = suma / ventana;
            
            // Si los datos originales eran objetos, devolver objetos
            if (typeof datos[0] === 'object') {
                mediaMovil.push({
                    fecha: datos[i].fecha,
                    valor: media
                });
            } else {
                mediaMovil.push(media);
            }
        }
        
        return mediaMovil;
    }
}

/**
 * ============================================================================
 * PARTE 3.5: EXPLORACIÓN Y VISUALIZACIÓN DE DATASETS
 * ============================================================================
 */

/**
 * Clase para explorar y visualizar datasets
 * Esta clase proporciona métodos para inspeccionar, filtrar y visualizar 
 * conjuntos de datos antes de realizar análisis más complejos
 */
class ExplorarDataset {
    /**
     * Constructor
     * @param {Array} datos - Dataset a explorar (array de objetos)
     */
    constructor(datos = []) {
        this.datos = datos;
        this.datosOriginales = [...datos]; // Guardar una copia de los datos originales
    }
    
    /**
     * Restaura los datos originales si se han aplicado transformaciones
     */
    restaurarDatosOriginales() {
        this.datos = [...this.datosOriginales];
        return this;
    }
    
    /**
     * Devuelve las primeras n filas del dataset
     * @param {number} n - Número de filas a mostrar
     * @returns {Array} - Primeras n filas
     */
    head(n = 5) {
        return this.datos.slice(0, Math.min(n, this.datos.length));
    }
    
    /**
     * Devuelve las últimas n filas del dataset
     * @param {number} n - Número de filas a mostrar
     * @returns {Array} - Últimas n filas
     */
    tail(n = 5) {
        return this.datos.slice(-Math.min(n, this.datos.length));
    }
    
    /**
     * Devuelve un resumen estadístico de las columnas numéricas del dataset
     * @returns {Object} - Resumen estadístico por columna
     */
    describir() {
        if (this.datos.length === 0) return {};
        
        const columnas = Object.keys(this.datos[0]);
        const resumen = {};
        const procesador = new ProcesadorDatos();
        
        columnas.forEach(columna => {
            // Extraer valores de la columna, solo si son numéricos
            const valores = this.datos
                .map(fila => fila[columna])
                .filter(val => typeof val === 'number' && !isNaN(val));
            
            // Calcular estadísticas solo si hay valores numéricos
            if (valores.length > 0) {
                resumen[columna] = procesador.calcularEstadisticas(valores);
                
                // Añadir información adicional
                resumen[columna].tipoColumna = 'numérica';
                resumen[columna].porcentajeNulos = 
                    ((this.datos.length - valores.length) / this.datos.length) * 100;
            } else {
                // Para columnas no numéricas, mostrar solo información básica
                const valoresUnicos = new Set(this.datos.map(fila => fila[columna]));
                
                resumen[columna] = {
                    tipoColumna: 'no numérica',
                    conteo: this.datos.length,
                    valoresUnicos: valoresUnicos.size,
                    porcentajeNulos: 
                        (this.datos.filter(fila => fila[columna] === null || fila[columna] === undefined).length / this.datos.length) * 100,
                    ejemplos: Array.from(valoresUnicos).slice(0, 5)
                };
            }
        });
        
        return resumen;
    }
    
    /**
     * Filtra el dataset según una condición
     * @param {Function} condicion - Función que recibe una fila y devuelve true/false
     * @returns {ExplorarDataset} - Instancia con los datos filtrados
     */
    filtrar(condicion) {
        this.datos = this.datos.filter(condicion);
        return this;
    }
    
    /**
     * Selecciona solo algunas columnas del dataset
     * @param {Array} columnas - Array con los nombres de las columnas a seleccionar
     * @returns {ExplorarDataset} - Instancia con las columnas seleccionadas
     */
    seleccionarColumnas(columnas) {
        if (!Array.isArray(columnas) || columnas.length === 0) {
            console.warn('Debe especificar un array de columnas válido');
            return this;
        }
        
        this.datos = this.datos.map(fila => {
            const nuevaFila = {};
            columnas.forEach(col => {
                if (fila.hasOwnProperty(col)) {
                    nuevaFila[col] = fila[col];
                }
            });
            return nuevaFila;
        });
        
        return this;
    }
    
    /**
     * Ordena el dataset por una o varias columnas
     * @param {string|Array} columnas - Columna(s) por las que ordenar
     * @param {boolean|Array} ascendente - Si el orden es ascendente (true) o descendente (false)
     * @returns {ExplorarDataset} - Instancia con los datos ordenados
     */
    ordenar(columnas, ascendente = true) {
        if (!columnas) return this;
        
        // Convertir a arrays para soportar múltiples columnas
        const cols = Array.isArray(columnas) ? columnas : [columnas];
        const dirs = Array.isArray(ascendente) ? ascendente : [ascendente];
        
        // Asegurarse de que dirs tiene al menos tantos elementos como cols
        while (dirs.length < cols.length) {
            dirs.push(dirs[dirs.length - 1]); // Repetir el último valor
        }
        
        this.datos.sort((a, b) => {
            // Comparar por cada columna en orden
            for (let i = 0; i < cols.length; i++) {
                const col = cols[i];
                const asc = dirs[i];
                
                if (a[col] < b[col]) return asc ? -1 : 1;
                if (a[col] > b[col]) return asc ? 1 : -1;
            }
            return 0; // Si son iguales en todas las columnas
        });
        
        return this;
    }
    
    /**
     * Agrega una nueva columna calculada al dataset
     * @param {string} nombreColumna - Nombre de la nueva columna
     * @param {Function} funcion - Función que recibe una fila y devuelve el valor calculado
     * @returns {ExplorarDataset} - Instancia con la nueva columna
     */
    agregarColumna(nombreColumna, funcion) {
        if (!nombreColumna || typeof funcion !== 'function') {
            console.warn('Se requiere un nombre de columna y una función válida');
            return this;
        }
        
        this.datos = this.datos.map(fila => {
            const nuevaFila = {...fila};
            nuevaFila[nombreColumna] = funcion(fila);
            return nuevaFila;
        });
        
        return this;
    }
    
    /**
     * Crea una tabla HTML para visualizar los datos
     * @param {string} contenedorId - ID del elemento donde mostrar la tabla
     * @param {number} maxFilas - Máximo número de filas a mostrar
     */
    crearTabla(contenedorId, maxFilas = 100) {
        const contenedor = document.getElementById(contenedorId);
        if (!contenedor) {
            console.error(`Contenedor con ID '${contenedorId}' no encontrado`);
            return;
        }
        
        if (this.datos.length === 0) {
            contenedor.innerHTML = '<p>No hay datos para mostrar</p>';
            return;
        }
        
        // Limitar el número de filas para evitar problemas de rendimiento
        const datosAMostrar = this.datos.slice(0, maxFilas);
        
        // Crear encabezado de la tabla
        const columnas = Object.keys(datosAMostrar[0]);
        
        // Crear tabla HTML
        let tablaHtml = `
        <div class="tabla-container" style="overflow-x: auto; margin: 20px 0;">
            <table class="tabla-datos" style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
                <thead>
                    <tr style="background-color: #f2f2f2;">
        `;
        
        // Agregar encabezados
        columnas.forEach(col => {
            tablaHtml += `<th style="padding: 12px; text-align: left; border: 1px solid #ddd;">${col}</th>`;
        });
        
        tablaHtml += `
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Agregar filas
        datosAMostrar.forEach((fila, index) => {
            tablaHtml += `<tr style="background-color: ${index % 2 === 0 ? '#fff' : '#f9f9f9'};">`;
            
            columnas.forEach(col => {
                let valor = fila[col];
                
                // Formatear fechas y números
                if (valor instanceof Date) {
                    valor = valor.toISOString().split('T')[0];
                } else if (typeof valor === 'number' && !Number.isInteger(valor)) {
                    valor = valor.toFixed(4);
                }
                
                tablaHtml += `<td style="padding: 8px; text-align: left; border: 1px solid #ddd;">${valor}</td>`;
            });
            
            tablaHtml += `</tr>`;
        });
        
        tablaHtml += `
                </tbody>
            </table>
        `;
        
        // Si hay más filas de las mostradas, agregar nota
        if (this.datos.length > maxFilas) {
            tablaHtml += `<p style="font-style: italic; margin-top: 10px;">Mostrando ${maxFilas} de ${this.datos.length} filas</p>`;
        }
        
        tablaHtml += `</div>`;
        
        // Agregar la tabla al contenedor
        contenedor.innerHTML = tablaHtml;
    }
    
    /**
     * Crea un gráfico de dispersión para visualizar relaciones entre variables
     * @param {string} columnaX - Nombre de la columna para el eje X
     * @param {string} columnaY - Nombre de la columna para el eje Y
     * @param {string} contenedorId - ID del elemento donde mostrar el gráfico
     * @param {Object} opciones - Opciones de configuración
     */
    graficoDispersion(columnaX, columnaY, contenedorId, opciones = {}) {
        if (!columnaX || !columnaY || !contenedorId) {
            console.error('Se requieren columnas X e Y y un ID de contenedor');
            return;
        }
        
        // Verificar que Plotly está disponible
        if (typeof Plotly === 'undefined') {
            console.error('Plotly.js no está disponible para crear el gráfico');
            return;
        }
        
        // Preparar datos para el gráfico
        const datosValidos = this.datos.filter(d => 
            d[columnaX] !== undefined && d[columnaX] !== null &&
            d[columnaY] !== undefined && d[columnaY] !== null
        );
        
        if (datosValidos.length === 0) {
            console.error('No hay datos válidos para el gráfico');
            return;
        }
        
        const trace = {
            x: datosValidos.map(d => d[columnaX]),
            y: datosValidos.map(d => d[columnaY]),
            mode: opciones.modo || 'markers',
            type: 'scatter',
            marker: {
                size: opciones.tamanoPunto || 8,
                color: opciones.colorPunto || '#1f77b4',
                opacity: opciones.opacidad || 0.7
            },
            name: opciones.nombre || `${columnaY} vs ${columnaX}`
        };
        
        // Agregar columna de color si está especificada
        if (opciones.columnaColor && datosValidos[0][opciones.columnaColor] !== undefined) {
            trace.marker.color = datosValidos.map(d => d[opciones.columnaColor]);
            trace.marker.colorscale = opciones.escalaColor || 'Viridis';
            trace.marker.showscale = true;
        }
        
        // Configuración del layout
        const layout = {
            title: opciones.titulo || `Relación entre ${columnaY} y ${columnaX}`,
            xaxis: {
                title: opciones.tituloX || columnaX,
                zeroline: true
            },
            yaxis: {
                title: opciones.tituloY || columnaY,
                zeroline: true
            },
            hovermode: 'closest',
            paper_bgcolor: 'white',
            plot_bgcolor: '#f8f9f9',
            margin: { l: 60, r: 30, b: 50, t: 50, pad: 4 }
        };
        
        // Configuración del gráfico
        const config = {
            responsive: true,
            displayModeBar: true,
            displaylogo: false
        };
        
        // Renderizar el gráfico
        Plotly.newPlot(contenedorId, [trace], layout, config);
    }
    
    /**
     * Crea un histograma para visualizar la distribución de una variable
     * @param {string} columna - Nombre de la columna a visualizar
     * @param {string} contenedorId - ID del elemento donde mostrar el gráfico
     * @param {Object} opciones - Opciones de configuración
     */
    histograma(columna, contenedorId, opciones = {}) {
        if (!columna || !contenedorId) {
            console.error('Se requiere una columna y un ID de contenedor');
            return;
        }
        
        // Verificar que Plotly está disponible
        if (typeof Plotly === 'undefined') {
            console.error('Plotly.js no está disponible para crear el histograma');
            return;
        }
        
        // Extraer valores válidos para la columna
        const valores = this.datos
            .map(d => d[columna])
            .filter(val => val !== undefined && val !== null && !isNaN(val));
        
        if (valores.length === 0) {
            console.error('No hay datos numéricos válidos para el histograma');
            return;
        }
        
        const trace = {
            x: valores,
            type: 'histogram',
            marker: {
                color: opciones.color || '#1f77b4',
                line: {
                    color: opciones.colorBorde || 'white',
                    width: opciones.anchoBorde || 1
                }
            },
            opacity: opciones.opacidad || 0.75,
            histnorm: opciones.normalizar ? 'probability' : '',
            nbinsx: opciones.numBins || 0
        };
        
        // Configuración del layout
        const layout = {
            title: opciones.titulo || `Distribución de ${columna}`,
            xaxis: {
                title: opciones.tituloX || columna
            },
            yaxis: {
                title: opciones.tituloY || (opciones.normalizar ? 'Probabilidad' : 'Frecuencia')
            },
            bargap: 0.05,
            paper_bgcolor: 'white',
            plot_bgcolor: '#f8f9f9',
            margin: { l: 60, r: 30, b: 50, t: 50, pad: 4 }
        };
        
        // Configuración del gráfico
        const config = {
            responsive: true,
            displayModeBar: true,
            displaylogo: false
        };
        
        // Renderizar el gráfico
        Plotly.newPlot(contenedorId, [trace], layout, config);
    }
}

/**
 * ============================================================================
 * PARTE 4: MODELOS ESTADÍSTICOS (ARIMA Y DERIVADOS)
 * ============================================================================
 */

/**
 * Clase para implementar y ejecutar modelos de series temporales
 * Esta clase proporciona métodos para diferentes modelos y sus variantes
 */
class ModelosSeriesTemporales {
    /**
     * Constructor
     * @param {Array} datos - Serie temporal de datos
     */
    constructor(datos = []) {
        this.datos = datos;
        this.verificarBibliotecas();
    }
    
    /**
     * Verifica si las bibliotecas necesarias están cargadas
     */
    verificarBibliotecas() {
        this.bibliotecasDisponibles = {
            arima: typeof ARIMA === 'function',
            mathjs: typeof math !== 'undefined' && typeof math.multiply === 'function',
            savitzkyGolay: typeof SG !== 'undefined' && typeof SG.savitzkyGolay === 'function'
        };
        
        console.log('Estado de bibliotecas:', this.bibliotecasDisponibles);
    }
    
    /**
     * Modelo de Media Móvil (MA)
     * @param {Array} datos - Serie temporal (si no se especifica, usa los datos del constructor)
     * @param {number} q - Orden MA (tamaño de la ventana)
     * @param {number} horizonte - Número de periodos a predecir
     * @returns {Array} - Predicciones
     */
    modeloMA(datos = this.datos, q = 2, horizonte = 10) {
        // Verificar disponibilidad de Savitzky-Golay para suavizado óptimo
        if (this.bibliotecasDisponibles.savitzkyGolay) {
            console.log('Usando biblioteca Savitzky-Golay para modelo MA');
            return this.modeloMASavitzkyGolay(datos, q, horizonte);
        }
        
        console.log('Usando implementación manual para modelo MA');
        
        // Implementación manual simple de un modelo MA
        const valores = Array.isArray(datos) ? 
            (typeof datos[0] === 'object' ? datos.map(d => d.cierre || d.valor || d) : datos) : 
            [];
            
        if (valores.length < q + 1) {
            console.error('Serie temporal insuficiente para modelo MA');
            return Array(horizonte).fill(valores[valores.length - 1] || 0);
        }
        
        // Calcular la media móvil para suavizar los datos
        const ventana = Math.min(Math.max(3, q * 2 + 1), valores.length - 1);
        const suavizado = [];
        
        for (let i = 0; i < valores.length; i++) {
            let suma = 0;
            let contador = 0;
            
            // Calcular media en la ventana
            for (let j = Math.max(0, i - Math.floor(ventana/2)); 
                 j <= Math.min(valores.length - 1, i + Math.floor(ventana/2)); 
                 j++) {
                suma += valores[j];
                contador++;
            }
            
            suavizado.push(suma / contador);
        }
        
        // Calcular la tendencia a partir de los datos suavizados
        const recientes = suavizado.slice(-5);
        let cambioProm = 0;
        
        for (let i = 1; i < recientes.length; i++) {
            cambioProm += recientes[i] - recientes[i - 1];
        }
        
        cambioProm /= (recientes.length - 1);
        
        // Generar proyección
        const predicciones = [];
        let ultimoValor = suavizado[suavizado.length - 1];
        
        for (let i = 0; i < horizonte; i++) {
            ultimoValor += cambioProm;
            predicciones.push(ultimoValor);
        }
        
        return predicciones;
    }
    
    /**
     * Implementación de MA usando Savitzky-Golay para suavizado óptimo
     * @private
     */
    modeloMASavitzkyGolay(datos, q, horizonte) {
        const valores = Array.isArray(datos) ? 
            (typeof datos[0] === 'object' ? datos.map(d => d.cierre || d.valor || d) : datos) : 
            [];
            
        if (valores.length < q + 1) {
            return Array(horizonte).fill(valores[valores.length - 1] || 0);
        }
        
        // Configurar parámetros para Savitzky-Golay
        const opciones = {
            windowSize: Math.min(Math.max(3, q * 2 + 1), valores.length - 1),
            derivative: 0,
            polynomial: 2
        };
        
        // Aplicar Savitzky-Golay para suavizado
        const suavizado = SG.savitzkyGolay(valores, 1, opciones);
        
        // Calcular tendencia y generar predicciones
        const recientes = suavizado.slice(-5);
        let cambioProm = 0;
        
        for (let i = 1; i < recientes.length; i++) {
            cambioProm += recientes[i] - recientes[i - 1];
        }
        
        cambioProm /= (recientes.length - 1);
        
        // Generar proyección
        const predicciones = [];
        let ultimoValor = suavizado[suavizado.length - 1];
        
        for (let i = 0; i < horizonte; i++) {
            ultimoValor += cambioProm;
            predicciones.push(ultimoValor);
        }
        
        return predicciones;
    }
    
    /**
     * Modelo Autorregresivo (AR)
     * @param {Array} datos - Serie temporal
     * @param {number} p - Orden AR (cantidad de observaciones anteriores)
     * @param {number} horizonte - Número de periodos a predecir
     * @returns {Array} - Predicciones
     */
    modeloAR(datos = this.datos, p = 2, horizonte = 10) {
        const valores = Array.isArray(datos) ? 
            (typeof datos[0] === 'object' ? datos.map(d => d.cierre || d.valor || d) : datos) : 
            [];
            
        p = Math.min(p, Math.floor(valores.length / 2));
        
        if (valores.length < p + 1) {
            console.error('Serie temporal insuficiente para modelo AR');
            return Array(horizonte).fill(valores[valores.length - 1] || 0);
        }
        
        // Estimar coeficientes AR
        const coeficientes = this.estimarCoeficientesAR(valores, p);
        
        // Usar los últimos p valores para iniciar la predicción
        const ultimosValores = valores.slice(-p);
        const predicciones = [];
        
        for (let i = 0; i < horizonte; i++) {
            // Predicción AR: combinación lineal de los últimos p valores
            let prediccion = 0;
            
            for (let j = 0; j < p; j++) {
                prediccion += coeficientes[j] * ultimosValores[ultimosValores.length - 1 - j];
            }
            
            predicciones.push(prediccion);
            
            // Actualizar para la siguiente predicción
            ultimosValores.shift();
            ultimosValores.push(prediccion);
        }
        
        return predicciones;
    }
    
    /**
     * Estima coeficientes para modelo AR
     * @private
     */
    estimarCoeficientesAR(datos, p) {
        // En una implementación real, se usaría mínimos cuadrados o Yule-Walker
        // Esta es una simplificación
        const coeficientes = [];
        const total = p * (p + 1) / 2;
        
        for (let i = 1; i <= p; i++) {
            coeficientes.push((p - i + 1) / total);
        }
        
        return coeficientes;
    }
    
    /**
     * Modelo ARIMA (AutoRegressive Integrated Moving Average)
     * @param {Array} datos - Serie temporal
     * @param {Object} params - Parámetros {p, d, q}
     * @param {number} horizonte - Número de periodos a predecir
     * @returns {Array} - Predicciones
     */
    modeloARIMA(datos = this.datos, params = {p: 1, d: 1, q: 1}, horizonte = 10) {
        // Extraer parámetros
        const p = params.p || 1; // Orden AR
        const d = params.d || 1; // Orden de diferenciación
        const q = params.q || 1; // Orden MA
        
        // Extraer valores
        const valores = Array.isArray(datos) ? 
            (typeof datos[0] === 'object' ? datos.map(d => d.cierre || d.valor || d) : datos) : 
            [];
            
        if (valores.length < Math.max(p, q) + d + 1) {
            console.error('Serie temporal insuficiente para modelo ARIMA');
            return Array(horizonte).fill(valores[valores.length - 1] || 0);
        }
        
        // Verificar si la biblioteca ARIMA está disponible
        if (this.bibliotecasDisponibles.arima) {
            console.log('Usando biblioteca ARIMA');
            
            try {
                // Configurar modelo ARIMA
                const arimaConfig = {
                    p: p,
                    d: d,
                    q: q,
                    verbose: false
                };
                
                // Entrenar modelo y hacer predicción
                const arimaModel = new ARIMA(arimaConfig).train(valores);
                return arimaModel.predict(horizonte);
            } catch (error) {
                console.error('Error al usar biblioteca ARIMA:', error);
                // Continuar con implementación manual como fallback
            }
        }
        
        console.log('Usando implementación manual para modelo ARIMA');
        
        // Implementación manual simplificada de ARIMA
        
        // 1. Aplicar diferenciación d veces
        let datosDiferenciados = [...valores];
        for (let i = 0; i < d; i++) {
            datosDiferenciados = this.diferenciar(datosDiferenciados);
        }
        
        // 2. Aplicar ARMA a los datos diferenciados
        let predicciones;
        
        if (q === 0) {
            // Solo componente AR
            predicciones = this.modeloAR(datosDiferenciados, p, horizonte);
        } else if (p === 0) {
            // Solo componente MA
            predicciones = this.modeloMA(datosDiferenciados, q, horizonte);
        } else {
            // Combinar AR y MA (simplificación)
            const arPred = this.modeloAR(datosDiferenciados, p, horizonte);
            const maPred = this.modeloMA(datosDiferenciados, q, horizonte);
            
            // Promedio ponderado de ambas predicciones
            predicciones = arPred.map((val, i) => 0.6 * val + 0.4 * maPred[i]);
        }
        
        // 3. Integrar (inverso de la diferenciación) para obtener la serie original
        return this.integrar(predicciones, valores, d);
    }
    
    /**
     * Calcula diferencias entre valores consecutivos
     * @private
     */
    diferenciar(datos) {
        const resultado = [];
        for (let i = 1; i < datos.length; i++) {
            resultado.push(datos[i] - datos[i - 1]);
        }
        return resultado;
    }
    
    /**
     * Integra (inverso de la diferenciación)
     * @private
     */
    integrar(predicciones, datosOriginales, d) {
        let resultado = [...predicciones];
        
        for (let i = 0; i < d; i++) {
            const ultimoOriginal = datosOriginales[datosOriginales.length - 1 - i];
            
            for (let j = 0; j < resultado.length; j++) {
                resultado[j] = (j === 0) ? 
                    ultimoOriginal + resultado[j] : 
                    resultado[j - 1] + resultado[j];
            }
        }
        
        return resultado;
    }
}

/**
 * ============================================================================
 * PARTE 5: VISUALIZACIÓN DE DATOS CON PLOTLY.JS
 * ============================================================================
 */

/**
 * Clase para visualización de datos financieros
 */
class VisualizadorFinanciero {
    /**
     * Constructor
     * @param {string} contenedorId - ID del elemento HTML donde se renderizará el gráfico
     */
    constructor(contenedorId = 'grafico') {
        this.contenedorId = contenedorId;
        this.verifivarPlotly();
    }
    
    /**
     * Verifica si Plotly.js está disponible
     */
    verifivarPlotly() {
        this.plotlyDisponible = typeof Plotly !== 'undefined';
        
        if (!this.plotlyDisponible) {
            console.error('Plotly.js no está disponible. Los gráficos no funcionarán.');
        }
    }
    
    /**
     * Crea un gráfico de velas japonesas (OHLC)
     * @param {Array} datos - Datos formateados con OHLC
     * @param {string} titulo - Título del gráfico
     * @param {Object} estilos - Configuración de colores y estilos
     */
    crearGraficoVelas(datos, titulo = 'Gráfico de Velas', estilos = {}) {
        if (!this.plotlyDisponible || !datos || datos.length === 0) {
            console.error('No se puede crear el gráfico: Plotly no disponible o datos vacíos');
            return;
        }
        
        // Establecer esquema de colores por defecto
        const colores = {
            alza: estilos.alza || { linea: '#00A651', relleno: 'rgba(0, 166, 81, 0.5)' },
            baja: estilos.baja || { linea: '#E63946', relleno: 'rgba(230, 57, 70, 0.5)' }
        };
        
        // Preparar datos para Plotly
        const trace = {
            x: datos.map(d => d.fecha),
            open: datos.map(d => d.apertura),
            high: datos.map(d => d.maximo),
            low: datos.map(d => d.minimo),
            close: datos.map(d => d.cierre),
            type: 'candlestick',
            name: titulo,
            increasing: {
                line: { color: colores.alza.linea },
                fillcolor: colores.alza.relleno
            },
            decreasing: {
                line: { color: colores.baja.linea },
                fillcolor: colores.baja.relleno
            }
        };
        
        // Configuración del layout
        const layout = {
            title: titulo,
            xaxis: {
                title: 'Fecha',
                rangeslider: { visible: false }
            },
            yaxis: {
                title: 'Precio',
                autorange: true,
                type: 'linear'
            },
            paper_bgcolor: 'white',
            plot_bgcolor: '#F8F9F9',
            margin: {
                l: 60,
                r: 20,
                t: 50,
                b: 50
            }
        };
        
        // Opciones de configuración
        const config = {
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['lasso2d', 'select2d'],
            displaylogo: false
        };
        
        // Renderizar el gráfico
        Plotly.newPlot(this.contenedorId, [trace], layout, config);
    }
    
    /**
     * Agrega una línea de predicción al gráfico existente
     * @param {Array} datosFuturos - Predicciones formateadas
     * @param {string} nombre - Nombre para la leyenda
     * @param {Object} estilo - Configuración de estilo de la línea
     */
    agregarPrediccion(datosFuturos, nombre = 'Predicción', estilo = {}) {
        if (!this.plotlyDisponible || !datosFuturos || datosFuturos.length === 0) {
            return;
        }
        
        // Obtener el elemento del gráfico
        const grafico = document.getElementById(this.contenedorId);
        if (!grafico || !grafico.data) {
            console.error('Gráfico no encontrado o no inicializado');
            return;
        }
        
        // Configurar color y estilo por defecto
        const color = estilo.color || '#2196F3';
        const tipoLinea = estilo.tipoLinea || 'dash';
        const grosor = estilo.grosor || 2;
        
        // Preparar datos para la predicción
        let fechas, valores;
        
        if (typeof datosFuturos[0] === 'object') {
            // Si son objetos con formato completo
            fechas = datosFuturos.map(d => d.fecha);
            valores = datosFuturos.map(d => d.cierre || d.valor || d);
        } else {
            // Si son solo valores, crear fechas futuras
            const ultimaFecha = new Date(grafico.data[0].x[grafico.data[0].x.length - 1]);
            fechas = datosFuturos.map((_, i) => {
                const fecha = new Date(ultimaFecha);
                fecha.setDate(fecha.getDate() + i + 1);
                return fecha.toISOString().split('T')[0];
            });
            valores = datosFuturos;
        }
        
        // Agregar el último punto real para unir la predicción
        const ultimoX = grafico.data[0].x[grafico.data[0].x.length - 1];
        const ultimoY = grafico.data[0].close[grafico.data[0].close.length - 1];
        
        fechas.unshift(ultimoX);
        valores.unshift(ultimoY);
        
        // Crear la traza de predicción
        const trace = {
            x: fechas,
            y: valores,
            type: 'scatter',
            mode: 'lines',
            name: nombre,
            line: {
                color: color,
                width: grosor,
                dash: tipoLinea
            }
        };
        
        // Añadir la nueva traza al gráfico
        Plotly.addTraces(this.contenedorId, trace);
    }
    
    /**
     * Crea un gráfico de línea para series temporales
     * @param {Array} datos - Datos de la serie temporal
     * @param {string} titulo - Título del gráfico
     * @param {Object} opciones - Configuración adicional
     */
    crearGraficoLinea(datos, titulo = 'Serie Temporal', opciones = {}) {
        if (!this.plotlyDisponible || !datos || datos.length === 0) {
            console.error('No se puede crear el gráfico: Plotly no disponible o datos vacíos');
            return;
        }
        
        // Preparar datos para el gráfico
        let x, y;
        
        if (typeof datos[0] === 'object') {
            x = datos.map(d => d.fecha);
            y = datos.map(d => d.cierre || d.valor || d);
        } else {
            // Si son valores simples, usar índices como x
            x = datos.map((_, i) => i + 1);
            y = datos;
        }
        
        const trace = {
            x: x,
            y: y,
            type: 'scatter',
            mode: opciones.modo || 'lines+markers',
            name: opciones.nombre || titulo,
            marker: {
                color: opciones.color || '#2196F3',
                size: opciones.tamañoMarcador || 6
            },
            line: {
                color: opciones.color || '#2196F3',
                width: opciones.grosorLinea || 2,
                dash: opciones.tipoLinea || 'solid'
            }
        };
        
        // Configuración del layout
        const layout = {
            title: titulo,
            xaxis: {
                title: opciones.etiquetaX || 'Fecha',
                showgrid: opciones.mostrarCuadriculaX !== false
            },
            yaxis: {
                title: opciones.etiquetaY || 'Valor',
                showgrid: opciones.mostrarCuadriculaY !== false
            },
            paper_bgcolor: 'white',
            plot_bgcolor: opciones.colorFondo || '#f8f9fa'
        };
        
        // Opciones de configuración
        const config = {
            responsive: true,
            displaylogo: false
        };
        
        // Renderizar el gráfico
        Plotly.newPlot(this.contenedorId, [trace], layout, config);
    }
    
    /**
     * Crea un gráfico comparativo de múltiples tickers
     * @param {Object} datosPorTicker - Objeto con datos por ticker {ticker: [datos]}
     * @param {boolean} useBase100 - Normalizar a base 100
     * @param {string} titulo - Título del gráfico
     */
    crearGraficoComparativo(datosPorTicker, useBase100 = true, titulo = 'Comparación de Tickers') {
        if (!this.plotlyDisponible) {
            console.error('No se puede crear el gráfico: Plotly no disponible');
            return;
        }
        
        const procesador = new ProcesadorDatos();
        const tickers = Object.keys(datosPorTicker);
        
        if (tickers.length === 0) {
            console.error('No hay datos para comparar');
            return;
        }
        
        // Colores para cada ticker
        const colores = [
            '#005293', '#00A651', '#F26419', '#1ABC9C', '#F4D03F',
            '#E91E63', '#03A9F4', '#CDDC39', '#FF7F50', '#9F8FEF'
        ];
        
        const trazas = [];
        
        // Crear una traza para cada ticker
        tickers.forEach((ticker, index) => {
            const datos = datosPorTicker[ticker];
            
            // Si no hay datos para este ticker, omitirlo
            if (!datos || datos.length === 0) return;
            
            // Normalizar si es necesario
            const datosAUsar = useBase100 ? procesador.normalizarBase100(datos) : datos;
            
            // Crear traza para este ticker
            trazas.push({
                x: datosAUsar.map(d => d.fecha),
                y: datosAUsar.map(d => d.cierre),
                type: 'scatter',
                mode: 'lines',
                name: ticker,
                line: {
                    color: colores[index % colores.length],
                    width: 2
                }
            });
        });
        
        // Configuración del layout
        const layout = {
            title: titulo + (useBase100 ? ' (Base 100)' : ''),
            xaxis: {
                title: 'Fecha'
            },
            yaxis: {
                title: useBase100 ? 'Valor (Base 100)' : 'Precio',
                autorange: true
            },
            legend: {
                orientation: 'h',
                y: 1.1
            },
            showlegend: true,
            paper_bgcolor: 'white',
            plot_bgcolor: '#F8F9F9'
        };
        
        // Opciones de configuración
        const config = {
            responsive: true,
            displayModeBar: true,
            displaylogo: false
        };
        
        // Renderizar el gráfico
        Plotly.newPlot(this.contenedorId, trazas, layout, config);
    }
}

/**
 * ============================================================================
 * PARTE 6: APLICACIÓN DE EJEMPLO COMPLETA
 * ============================================================================
 */

// Función principal que ejecuta el análisis cuando todas las bibliotecas están cargadas
async function iniciarAnalisis() {
    console.log('Iniciando análisis de datos financieros...');
    
    try {
        // 1. Obtener datos históricos
        const yahooAPI = new YahooFinanceAPI();
        console.log('Obteniendo datos históricos de Yahoo Finance...');
        
        const datosAAPL = await yahooAPI.obtenerDatosHistoricos('AAPL', '1d', '1y');
        const datosMSFT = await yahooAPI.obtenerDatosHistoricos('MSFT', '1d', '1y');
        const datosGOOG = await yahooAPI.obtenerDatosHistoricos('GOOG', '1d', '1y');
        
        console.log(`Datos obtenidos: AAPL (${datosAAPL.length}), MSFT (${datosMSFT.length}), GOOG (${datosGOOG.length})`);
        
        // 2. Procesar y analizar datos
        const procesador = new ProcesadorDatos();
        
        // Normalizar a base 100 para comparación
        const datosBase100 = {
            'AAPL': procesador.normalizarBase100(datosAAPL),
            'MSFT': procesador.normalizarBase100(datosMSFT),
            'GOOG': procesador.normalizarBase100(datosGOOG)
        };
        
        // Calcular estadísticas
        const estAAPL = procesador.calcularEstadisticas(datosAAPL);
        console.log('Estadísticas AAPL:', estAAPL);
        
        // 3. Crear visualizaciones
        const visualizador = new VisualizadorFinanciero('grafico');
        
        // 3.1. Crear gráfico de velas para Apple
        visualizador.crearGraficoVelas(datosAAPL, 'Apple (AAPL) - Último año');
        
        // 3.2. Crear gráfico comparativo
        // Descomentar para mostrar en otro contenedor
        // const visualizadorComp = new VisualizadorFinanciero('grafico-comparativo');
        // visualizadorComp.crearGraficoComparativo(datosBase100, true, 'Comparación de Big Tech');
        
        // 4. Crear y aplicar modelo predictivo
        const modelador = new ModelosSeriesTemporales(datosAAPL);
        
        // 4.1. Hacer predicción con ARIMA
        console.log('Aplicando modelo ARIMA...');
        const prediccionARIMA = modelador.modeloARIMA(datosAAPL, {p: 5, d: 1, q: 1}, 30);
        
        // 4.2. Visualizar predicción
        visualizador.agregarPrediccion(prediccionARIMA, 'Predicción ARIMA (30 días)', {
            color: '#FF9800',
            tipoLinea: 'dashdot',
            grosor: 3
        });
        
        console.log('Análisis completado con éxito');
    } catch (error) {
        console.error('Error durante el análisis:', error);
    }
}

// Ejemplo de uso - Para ejecutar cuando se cargue el documento
document.addEventListener('DOMContentLoaded', () => {
    console.log('Documento cargado. Iniciando carga de bibliotecas...');
    
    // Crear contenedores para los gráficos si no existen
    if (!document.getElementById('grafico')) {
        const contenedor = document.createElement('div');
        contenedor.id = 'grafico';
        contenedor.style.width = '100%';
        contenedor.style.height = '500px';
        contenedor.style.marginBottom = '20px';
        document.body.appendChild(contenedor);
    }
    
    // Cargar bibliotecas necesarias y luego iniciar el análisis
    cargarBibliotecas();
});

/**
 * Este archivo es parte de un curso educativo.
 * Para usar en producción, se recomienda:
 * 1. Estructurar en módulos separados
 * 2. Implementar manejo de errores más robusto
 * 3. Añadir validaciones de datos
 * 4. Optimizar para rendimiento
 * 5. Considerar el uso de frameworks como React, Vue o Angular para UI
 */