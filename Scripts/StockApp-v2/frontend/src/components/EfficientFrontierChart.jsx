import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';

export default function EfficientFrontierChart({ result }) {
  const divRef    = useRef(null);
  const initRef   = useRef(false);

  useEffect(() => {
    if (!divRef.current || !result) return;

    const traces = [
      // Nube de Monte Carlo
      {
        type: 'scatter', mode: 'markers',
        name: 'Carteras aleatorias',
        x: result.cloud.map(p => p.std),
        y: result.cloud.map(p => p.ret),
        marker: {
          color: result.cloud.map(p => p.sharpe),
          colorscale: 'Viridis',
          size: 4, opacity: 0.6,
          colorbar: { title: 'Sharpe', thickness: 12 },
        },
      },
      // Activos individuales
      {
        type: 'scatter', mode: 'markers+text',
        name: 'Activos',
        x: result.assets.map(a => a.std),
        y: result.assets.map(a => a.ret),
        text: result.assets.map(a => a.ticker),
        textposition: 'top center',
        marker: { color: '#f59e0b', size: 10, symbol: 'diamond' },
      },
      // Cartera óptima
      {
        type: 'scatter', mode: 'markers+text',
        name: 'Óptima (Sharpe max)',
        x: [result.optimal.std],
        y: [result.optimal.ret],
        text: ['★ Óptima'],
        textposition: 'top right',
        marker: { color: '#ef4444', size: 14, symbol: 'star' },
      },
    ];

    const layout = {
      paper_bgcolor: '#111827',
      plot_bgcolor:  '#111827',
      font: { color: '#e5e7eb' },
      xaxis: { title: 'Volatilidad (%)', gridcolor: '#374151' },
      yaxis: { title: 'Retorno anual (%)', gridcolor: '#374151' },
      legend: { bgcolor: 'transparent' },
      margin: { t: 20, r: 20, b: 50, l: 60 },
    };

    if (!initRef.current) {
      Plotly.newPlot(divRef.current, traces, layout, { responsive: true, displaylogo: false });
      initRef.current = true;
    } else {
      Plotly.react(divRef.current, traces, layout);
    }
  }, [result]);

  useEffect(() => () => { if (divRef.current) Plotly.purge(divRef.current); }, []);

  if (!result) return null;
  return <div ref={divRef} style={{ width: '100%', height: '100%', minHeight: 420 }} />;
}
