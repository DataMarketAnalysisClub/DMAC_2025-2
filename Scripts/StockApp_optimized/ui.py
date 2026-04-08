"""
UI layout builder. Called once during app initialization to populate the main window.
"""
import os

from PyQt6.QtCore import Qt
from PyQt6.QtGui import QPixmap
from PyQt6.QtWidgets import (
    QButtonGroup, QCheckBox, QComboBox, QGroupBox, QHBoxLayout,
    QLabel, QLineEdit, QPushButton, QRadioButton, QSpinBox,
    QVBoxLayout, QWidget,
)
from PyQt6.QtWebEngineWidgets import QWebEngineView

_IMAGES_DIR = os.path.join(os.path.dirname(__file__), 'images')


def _logo_path():
    return os.path.join(_IMAGES_DIR, 'DMAC.png')


def setup_ui(w):
    """Populate *w* (MultiStockApp) with all child widgets."""
    w.main_layout = QVBoxLayout()
    w.setLayout(w.main_layout)

    # ------------------------------------------------------------------
    # Welcome screen
    # ------------------------------------------------------------------
    w.init_screen = QWidget()
    init_layout = QVBoxLayout(w.init_screen)

    title = QLabel('Bienvenido al Comparador de Tickers')
    title.setAlignment(Qt.AlignmentFlag.AlignCenter)
    title.setStyleSheet('font-size: 24px; font-weight: bold;')
    init_layout.addWidget(title)

    logo_px = QPixmap(_logo_path())
    w.welcome_logo_label = QLabel()
    w.welcome_logo_label.setPixmap(logo_px.scaledToHeight(500, Qt.TransformationMode.SmoothTransformation))
    w.welcome_logo_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
    w.welcome_logo_label.setStyleSheet("margin: 10px;")
    init_layout.addWidget(w.welcome_logo_label)

    subtitle = QLabel('Compare acciones y prediga con ARIMA')
    subtitle.setAlignment(Qt.AlignmentFlag.AlignCenter)
    subtitle.setStyleSheet('font-size: 14px; color: #666; margin: 10px;')
    init_layout.addWidget(subtitle)

    w.start_button = QPushButton('Iniciar')
    w.start_button.setStyleSheet('font-size: 18px; padding: 10px;')
    init_layout.addWidget(w.start_button)

    w.exit_button = QPushButton('Cerrar')
    w.exit_button.setStyleSheet('font-size: 18px; padding: 10px;')
    init_layout.addWidget(w.exit_button)

    w.main_layout.addWidget(w.init_screen)

    # ------------------------------------------------------------------
    # Main screen
    # ------------------------------------------------------------------
    w.main_screen = QWidget()
    main_vbox = QVBoxLayout(w.main_screen)

    # Row 1: ticker / period / frequency inputs
    row1 = QHBoxLayout()
    main_vbox.addLayout(row1)

    row1.addWidget(QLabel('Tickers:'))
    w.ticker_input = QLineEdit()
    w.ticker_input.setPlaceholderText('Ej: AAPL,MSFT,GOOGL')
    row1.addWidget(w.ticker_input)

    sep = QLabel('(separados por comas)')
    sep.setStyleSheet('font-size: 11px; color: #666; font-style: italic;')
    row1.addWidget(sep)

    row1.addWidget(QLabel('Frecuencia:'))
    w.freq_input = QComboBox()
    w.freq_input.addItems(['1d', '1wk', '1mo'])
    w.freq_input.setCurrentText('1wk')
    row1.addWidget(w.freq_input)

    row1.addWidget(QLabel('Periodo:'))
    w.period_input = QComboBox()
    w.period_input.addItems(['1mo', '6mo', '1y', '2y', '5y'])
    w.period_input.setCurrentText('5y')
    row1.addWidget(w.period_input)

    # Row 2: colours / logo / base-100 / action buttons
    row2 = QHBoxLayout()
    main_vbox.addLayout(row2)

    row2.addWidget(QLabel('Colores:'))
    w.color_input = QComboBox()
    w.color_input.addItems(['Verde/Rojo (Clásico)', 'Colores Club'])
    w.color_input.setCurrentText('Colores Club')
    row2.addWidget(w.color_input)

    small_logo = QLabel()
    small_logo.setPixmap(
        QPixmap(_logo_path()).scaledToHeight(30, Qt.TransformationMode.SmoothTransformation)
    )
    small_logo.setStyleSheet("margin-left: 10px;")
    row2.addWidget(small_logo)

    w.base100_checkbox = QCheckBox('Usar Base 100')
    w.base100_checkbox.setChecked(True)
    w.base100_checkbox.hide()
    row2.addWidget(w.base100_checkbox)

    row2.addStretch()

    w.btn = QPushButton('Ejecutar')
    w.btn.setStyleSheet('background-color: #4CAF50; color: white; padding: 8px 16px; font-weight: bold;')
    row2.addWidget(w.btn)

    w.btn_download = QPushButton('Descargar CSV')
    row2.addWidget(w.btn_download)

    # ARIMA panel
    arima_group = QGroupBox("Predicciones ARIMA")
    arima_group.setStyleSheet('QGroupBox { font-weight: bold; padding: 10px; }')
    arima_vbox = QVBoxLayout(arima_group)
    main_vbox.addWidget(arima_group)

    mode_row = QHBoxLayout()
    arima_vbox.addLayout(mode_row)
    mode_row.addWidget(QLabel('Modo:'))
    w.arima_button_group = QButtonGroup()
    w.auto_arima_radio = QRadioButton('Automático (recomendado)')
    w.manual_arima_radio = QRadioButton('Manual (avanzado)')
    w.auto_arima_radio.setChecked(True)
    w.arima_button_group.addButton(w.auto_arima_radio)
    w.arima_button_group.addButton(w.manual_arima_radio)
    mode_row.addWidget(w.auto_arima_radio)
    mode_row.addWidget(w.manual_arima_radio)
    mode_row.addStretch()

    params_row = QHBoxLayout()
    arima_vbox.addLayout(params_row)
    w.p_label = QLabel('p:')
    w.p_input = QSpinBox()
    w.p_input.setRange(0, 5)
    w.p_input.setValue(1)
    w.d_label = QLabel('d:')
    w.d_input = QSpinBox()
    w.d_input.setRange(0, 2)
    w.d_input.setValue(1)
    w.q_label = QLabel('q:')
    w.q_input = QSpinBox()
    w.q_input.setRange(0, 5)
    w.q_input.setValue(1)
    for widget in (w.p_label, w.p_input, w.d_label, w.d_input, w.q_label, w.q_input):
        params_row.addWidget(widget)
        widget.hide()
    params_row.addStretch()

    horizon_row = QHBoxLayout()
    arima_vbox.addLayout(horizon_row)
    horizon_row.addWidget(QLabel('Horizonte:'))
    w.horizon_input = QComboBox()
    w.horizon_input.addItems(['7 periodos', '14 periodos', '30 periodos', '60 periodos', '90 periodos'])
    horizon_row.addWidget(w.horizon_input)
    w.confidence_checkbox = QCheckBox('Mostrar intervalo 95%')
    w.confidence_checkbox.setChecked(True)
    horizon_row.addWidget(w.confidence_checkbox)
    horizon_row.addStretch()
    w.btn_predict = QPushButton('Generar Predicción')
    w.btn_predict.setStyleSheet('background-color: #2196F3; color: white; padding: 8px 16px; font-weight: bold;')
    horizon_row.addWidget(w.btn_predict)

    arima_vbox.addWidget(QLabel(
        '⚠ Las predicciones son estimaciones estadísticas y no garantías de rendimiento futuro.',
        styleSheet='color: #FF9800; font-size: 11px; font-style: italic;'
    ))

    # Portfolio panel
    port_group = QGroupBox("Optimización de Cartera (Markowitz)")
    port_group.setStyleSheet('QGroupBox { font-weight: bold; padding: 10px; }')
    port_vbox = QVBoxLayout(port_group)
    main_vbox.addWidget(port_group)

    port_vbox.addWidget(QLabel(
        'Calcula la cartera óptima que maximiza el Sharpe Ratio para los tickers cargados.',
        styleSheet='color: #666; font-size: 11px; font-style: italic;'
    ))

    rf_row = QHBoxLayout()
    port_vbox.addLayout(rf_row)
    rf_row.addWidget(QLabel('Tasa libre de riesgo (%):'))
    w.rf_rate_input = QLineEdit()
    w.rf_rate_input.setPlaceholderText('Ej: 3.0 para 3%')
    w.rf_rate_input.setText('3.0')
    w.rf_rate_input.setMaximumWidth(100)
    rf_row.addWidget(w.rf_rate_input)
    rf_row.addStretch()
    w.btn_optimize = QPushButton('Optimizar Cartera')
    w.btn_optimize.setStyleSheet('background-color: #FF9800; color: white; padding: 8px 16px; font-weight: bold;')
    rf_row.addWidget(w.btn_optimize)

    port_vbox.addWidget(QLabel(
        '⚠ Requiere al menos 2 tickers cargados. Los resultados se basan en datos históricos.',
        styleSheet='color: #FF9800; font-size: 11px; font-style: italic;'
    ))

    # Info / status / chart
    w.info_label = QLabel()
    w.info_label.setStyleSheet(
        'background-color: #f2f9ff; border: 1px solid #d0e3ff; '
        'border-radius: 4px; padding: 10px; font-size: 12px;'
    )
    w.info_label.hide()
    main_vbox.addWidget(w.info_label)

    w.message_label = QLabel('')
    main_vbox.addWidget(w.message_label)

    w.webview = QWebEngineView()
    w.webview.setHtml("<h2>Ingrese uno o más tickers y presione 'Ejecutar'</h2>")
    main_vbox.addWidget(w.webview, stretch=1)

    w.back_button = QPushButton('Volver')
    w.back_button.setStyleSheet('font-size: 18px; padding: 10px;')
    main_vbox.addWidget(w.back_button)

    w.main_screen.hide()
    w.main_layout.addWidget(w.main_screen)
