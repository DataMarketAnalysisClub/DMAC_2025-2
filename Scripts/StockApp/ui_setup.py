import os
from PyQt5.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit, 
                             QPushButton, QComboBox, QCheckBox, QRadioButton, 
                             QButtonGroup, QGroupBox, QSpinBox)
from PyQt5.QtWebEngineWidgets import QWebEngineView
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QPixmap

def setup_ui(main_window):
    """
    Configura la interfaz de usuario para la ventana principal.
    """
    main_window.main_layout = QVBoxLayout()
    main_window.setLayout(main_window.main_layout)

    # --- Pantalla Inicial ---
    main_window.init_screen = QWidget()
    init_layout = QVBoxLayout()
    main_window.init_screen.setLayout(init_layout)
    
    main_window.init_label = QLabel('Bienvenido al Comparador de Tickers')
    main_window.init_label.setAlignment(Qt.AlignCenter)
    main_window.init_label.setStyleSheet('font-size: 24px; font-weight: bold;')
    init_layout.addWidget(main_window.init_label)

    # --- START: ADD LOGO TO WELCOME SCREEN ---
    main_window.welcome_logo_label = QLabel()
    
    # Build the correct path relative to this file
    script_dir = os.path.dirname(__file__) 
    logo_path = os.path.join(script_dir, 'images', 'DMAC.png')
    
    pixmap = QPixmap(logo_path)
    
    # Scale it to a larger size for the welcome screen (adjust 150 as needed)
    scaled_pixmap = pixmap.scaledToHeight(500, Qt.SmoothTransformation) 
    
    main_window.welcome_logo_label.setPixmap(scaled_pixmap)
    main_window.welcome_logo_label.setAlignment(Qt.AlignCenter) # Center it
    main_window.welcome_logo_label.setStyleSheet("margin: 10px;") # Add spacing
    
    init_layout.addWidget(main_window.welcome_logo_label)
    # --- END: ADD LOGO ---
    
    info_label = QLabel('Compare acciones y prediga con ARIMA')
    info_label.setAlignment(Qt.AlignCenter)
    info_label.setStyleSheet('font-size: 14px; color: #666; margin: 10px;')
    init_layout.addWidget(info_label)
    
    main_window.start_button = QPushButton('Iniciar')
    main_window.start_button.setStyleSheet('font-size: 18px; padding: 10px;')
    init_layout.addWidget(main_window.start_button)
    
    main_window.exit_button = QPushButton('Cerrar')
    main_window.exit_button.setStyleSheet('font-size: 18px; padding: 10px;')
    init_layout.addWidget(main_window.exit_button)
    
    main_window.main_layout.addWidget(main_window.init_screen)

    # --- Pantalla Principal ---
    main_window.main_screen = QWidget()
    main_window.main_layout_main_screen = QVBoxLayout()
    main_window.main_screen.setLayout(main_window.main_layout_main_screen)
    
    # Inputs principales
    input_layout = QHBoxLayout()
    main_window.main_layout_main_screen.addLayout(input_layout)
    
    main_window.ticker_label = QLabel('Tickers:')
    input_layout.addWidget(main_window.ticker_label)
    main_window.ticker_input = QLineEdit()
    main_window.ticker_input.setPlaceholderText('Ej: AAPL,MSFT,GOOGL')
    input_layout.addWidget(main_window.ticker_input)
    
    help_label = QLabel('(separados por comas)')
    help_label.setStyleSheet('font-size: 11px; color: #666; font-style: italic;')
    input_layout.addWidget(help_label)
    
    main_window.freq_label = QLabel('Frecuencia:')
    input_layout.addWidget(main_window.freq_label)
    main_window.freq_input = QComboBox()
    main_window.freq_input.addItems(['1d', '1wk', '1mo'])
    main_window.freq_input.setCurrentText('1wk')
    input_layout.addWidget(main_window.freq_input)
    
    main_window.period_label = QLabel('Periodo:')
    input_layout.addWidget(main_window.period_label)
    main_window.period_input = QComboBox()
    main_window.period_input.addItems(['1mo', '6mo', '1y', '2y', '5y'])
    main_window.period_input.setCurrentText('5y')
    input_layout.addWidget(main_window.period_input)
    
    # Segunda fila
    input_layout2 = QHBoxLayout()
    main_window.main_layout_main_screen.addLayout(input_layout2)
    
    main_window.color_label = QLabel('Colores:')
    input_layout2.addWidget(main_window.color_label)
    main_window.color_input = QComboBox()
    main_window.color_input.addItems(['Verde/Rojo (Clásico)', 'Colores Club'])
    main_window.color_input.setCurrentText('Colores Club')
    input_layout2.addWidget(main_window.color_input)

    # --- START: ADD LOGO ---
    main_window.logo_label = QLabel()
    pixmap = QPixmap(logo_path)
    scaled_pixmap = pixmap.scaledToHeight(50, Qt.SmoothTransformation)
    
    # Scale the logo to a fixed height so it doesn't break the layout
    scaled_pixmap = pixmap.scaledToHeight(30, Qt.SmoothTransformation)
    
    main_window.logo_label.setPixmap(scaled_pixmap)
    main_window.logo_label.setStyleSheet("margin-left: 10px;") # Optional: adds space
    input_layout2.addWidget(main_window.logo_label)
    # --- END: ADD LOGO ---
    
    main_window.base100_checkbox = QCheckBox('Usar Base 100')
    main_window.base100_checkbox.setChecked(True)
    main_window.base100_checkbox.hide()
    input_layout2.addWidget(main_window.base100_checkbox)
    
    input_layout2.addStretch()
    
    main_window.btn = QPushButton('Ejecutar')
    main_window.btn.setStyleSheet('background-color: #4CAF50; color: white; padding: 8px 16px; font-weight: bold;')
    input_layout2.addWidget(main_window.btn)
    
    main_window.btn_download = QPushButton('Descargar CSV')
    input_layout2.addWidget(main_window.btn_download)
    
    # Panel de predicciones ARIMA
    main_window.prediction_group = QGroupBox("Predicciones ARIMA")
    main_window.prediction_group.setStyleSheet('QGroupBox { font-weight: bold; padding: 10px; }')
    prediction_layout = QVBoxLayout()
    
    arima_mode_layout = QHBoxLayout()
    mode_label = QLabel('Modo:')
    arima_mode_layout.addWidget(mode_label)
    main_window.arima_button_group = QButtonGroup()
    main_window.auto_arima_radio = QRadioButton('Automático (recomendado)')
    main_window.manual_arima_radio = QRadioButton('Manual (avanzado)')
    main_window.auto_arima_radio.setChecked(True)
    main_window.arima_button_group.addButton(main_window.auto_arima_radio)
    main_window.arima_button_group.addButton(main_window.manual_arima_radio)
    arima_mode_layout.addWidget(main_window.auto_arima_radio)
    arima_mode_layout.addWidget(main_window.manual_arima_radio)
    arima_mode_layout.addStretch()
    prediction_layout.addLayout(arima_mode_layout)
    
    manual_params_layout = QHBoxLayout()
    main_window.p_label = QLabel('p:')
    manual_params_layout.addWidget(main_window.p_label)
    main_window.p_input = QSpinBox()
    main_window.p_input.setRange(0, 5)
    main_window.p_input.setValue(1)
    manual_params_layout.addWidget(main_window.p_input)
    main_window.d_label = QLabel('d:')
    manual_params_layout.addWidget(main_window.d_label)
    main_window.d_input = QSpinBox()
    main_window.d_input.setRange(0, 2)
    main_window.d_input.setValue(1)
    manual_params_layout.addWidget(main_window.d_input)
    main_window.q_label = QLabel('q:')
    manual_params_layout.addWidget(main_window.q_label)
    main_window.q_input = QSpinBox()
    main_window.q_input.setRange(0, 5)
    main_window.q_input.setValue(1)
    manual_params_layout.addWidget(main_window.q_input)
    main_window.p_label.hide()
    main_window.p_input.hide()
    main_window.d_label.hide()
    main_window.d_input.hide()
    main_window.q_label.hide()
    main_window.q_input.hide()
    manual_params_layout.addStretch()
    prediction_layout.addLayout(manual_params_layout)
    
    horizon_layout = QHBoxLayout()
    horizon_label = QLabel('Horizonte:')
    horizon_layout.addWidget(horizon_label)
    main_window.horizon_input = QComboBox()
    main_window.horizon_input.addItems(['7 días', '14 días', '30 días', '60 días', '90 días'])
    main_window.horizon_input.setCurrentText('30 días')
    horizon_layout.addWidget(main_window.horizon_input)
    main_window.confidence_checkbox = QCheckBox('Mostrar intervalo 95%')
    main_window.confidence_checkbox.setChecked(True)
    horizon_layout.addWidget(main_window.confidence_checkbox)
    horizon_layout.addStretch()
    main_window.btn_predict = QPushButton('Generar Predicción')
    main_window.btn_predict.setStyleSheet('background-color: #2196F3; color: white; padding: 8px 16px; font-weight: bold;')
    horizon_layout.addWidget(main_window.btn_predict)
    prediction_layout.addLayout(horizon_layout)
    
    warning_label = QLabel('⚠️ Las predicciones son estimaciones estadísticas y no garantías de rendimiento futuro.')
    warning_label.setStyleSheet('color: #FF9800; font-size: 11px; font-style: italic;')
    prediction_layout.addWidget(warning_label)
    
    main_window.prediction_group.setLayout(prediction_layout)
    main_window.main_layout_main_screen.addWidget(main_window.prediction_group)
    
    main_window.info_label = QLabel()
    main_window.info_label.setStyleSheet('background-color: #f2f9ff; border: 1px solid #d0e3ff; '
                                         'border-radius: 4px; padding: 10px; font-size: 12px;')
    main_window.info_label.hide()
    main_window.main_layout_main_screen.addWidget(main_window.info_label)
    
    main_window.message_label = QLabel('')
    main_window.main_layout_main_screen.addWidget(main_window.message_label)
    
    main_window.webview = QWebEngineView()
    main_window.main_layout_main_screen.addWidget(main_window.webview)
    main_window.webview.setHtml("<h2>Ingrese uno o más tickers y presione 'Ejecutar'</h2>")
    
    main_window.back_button = QPushButton('Volver')
    main_window.back_button.setStyleSheet('font-size: 18px; padding: 10px;')
    main_window.main_layout_main_screen.addWidget(main_window.back_button)
    
    main_window.main_screen.hide()
    main_window.main_layout.addWidget(main_window.main_screen)
