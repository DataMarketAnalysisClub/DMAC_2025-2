# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec for DMAPP / StockApp
# Build: pyinstaller StockApp.spec

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('images/*.png', 'images'),
    ],
    hiddenimports=[
        # scipy
        'scipy.special._cdflib',
        'scipy.linalg.cython_blas',
        'scipy.linalg.cython_lapack',
        'scipy.integrate',
        'scipy.spatial.transform._rotation_groups',
        # statsmodels
        'statsmodels.tsa.statespace._kalman_filter',
        'statsmodels.tsa.statespace._kalman_smoother',
        'statsmodels.tsa.statespace._simulation_smoother',
        'statsmodels.tsa.statespace._cfa_simulation_smoother',
        'statsmodels.tsa.statespace._statespace',
        # sklearn
        'sklearn.utils._cython_blas',
        'sklearn.neighbors._typedefs',
        'sklearn.neighbors._quad_tree',
        'sklearn.tree',
        'sklearn.tree._utils',
        # pandas
        'pandas._libs.tslibs.timedeltas',
        'pandas._libs.tslibs.nattype',
        'pandas._libs.tslibs.np_datetime',
        'pandas._libs.skiplist',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['matplotlib', 'PIL', 'tkinter', 'notebook', 'jupyter'],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='StockApp',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='images/ICON.png',
)
