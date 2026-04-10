import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';

// Paleta de colores para multi-ticker
const PALETTE = [
  { inc: '#005293', dec: '#6E7b8b' },
  { inc: '#1ABC9C', dec: '#E67E22' },
  { inc: '#9B59B6', dec: '#E74C3C' },
  { inc: '#F39C12', dec: '#2980B9' },
  { inc: '#27AE60', dec: '#C0392B' },
];

function buildTraces(dataMap, tickers, useBase100, predictions, showCI) {
  const traces = [];
  const isMulti = tickers.length > 1;

  // Valor base por ticker para normalización
  const bases = {};
  if (isMulti && useBase100) {
    tickers.forEach(t => {
      if (dataMap[t]) bases[t] = dataMap[t].close[0];
    });
  }

  const norm = (vals, base) => base ? vals.map(v => (v / base) * 100) : vals;

  tickers.forEach((ticker, idx) => {
    const d = dataMap[ticker];
    if (!d) return;
    const colors = PALETTE[idx % PALETTE.length];
    const base   = bases[ticker];

    // Candlestick histórico
    traces.push({
      type: 'candlestick',
      name: ticker,
      x:     d.dates,
      open:  norm(d.open,  base),
      high:  norm(d.high,  base),
      low:   norm(d.low,   base),
      close: norm(d.close, base),
      increasing: { line: { color: colors.inc }, fillcolor: colors.inc + 'aa' },
      decreasing: { line: { color: colors.dec }, fillcolor: colors.dec + 'aa' },
      legendgroup: ticker,
    });

    // Predicción
    const pred = predictions?.[ticker];
    if (pred) {
      const lastClose = d.close.at(-1);
      const predClose = isMulti && useBase100 ? norm(pred.forecast, base) : pred.forecast;
      const predLower = isMulti && useBase100 ? norm(pred.lower,    base) : pred.lower;
      const predUpper = isMulti && useBase100 ? norm(pred.upper,    base) : pred.upper;

      traces.push({
        type: 'scatter', mode: 'lines',
        name: `${ticker} forecast`,
        x: [d.dates.at(-1), ...pred.dates],
        y: [isMulti && useBase100 ? (lastClose / base) * 100 : lastClose, ...predClose],
        line: { color: colors.inc, dash: 'dash', width: 2 },
        legendgroup: ticker,
      });

      if (showCI) {
        traces.push({
          type: 'scatter', mode: 'lines', fill: 'tonexty', fillcolor: colors.inc + '33',
          name: `${ticker} CI`,
          x: [...pred.dates, ...pred.dates.slice().reverse()],
          y: [...predUpper, ...predLower.slice().reverse()],
          line: { color: 'transparent' },
          legendgroup: ticker,
          showlegend: false,
        });
      }
    }
  });

  return traces;
}

export default function StockChart({ dataMap, tickers, useBase100, predictions, showCI }) {
  const divRef = useRef(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!divRef.current || tickers.length === 0) return;

    const traces = buildTraces(dataMap, tickers, useBase100, predictions, showCI);
    const layout = {
      paper_bgcolor: '#111827',
      plot_bgcolor:  '#111827',
      font:          { color: '#e5e7eb' },
      xaxis: {
        type: 'date',
        rangeslider: { visible: false },
        gridcolor: '#374151',
      },
      yaxis: {
        title: useBase100 && tickers.length > 1 ? 'Base 100' : 'Precio',
        gridcolor: '#374151',
      },
      legend:  { bgcolor: 'transparent' },
      margin:  { t: 20, r: 20, b: 40, l: 60 },
      hovermode: 'x unified',
    };

    if (!initialized.current) {
      Plotly.newPlot(divRef.current, traces, layout, { responsive: true, displaylogo: false });
      initialized.current = true;
    } else {
      // Actualización incremental — no re-renderiza el DOM completo
      Plotly.react(divRef.current, traces, layout);
    }
  }, [dataMap, tickers, useBase100, predictions, showCI]);

  // Limpiar al desmontar
  useEffect(() => () => {
    if (divRef.current) Plotly.purge(divRef.current);
  }, []);

  return <div ref={divRef} style={{ width: '100%', height: '100%', minHeight: 420 }} />;
}
