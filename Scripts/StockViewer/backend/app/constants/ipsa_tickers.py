IPSA_TICKER_INFO = [
    {"ticker": "AGUAS-A.SN", "name": "Aguas Andinas", "sector": "Utilities", "industry": "Water"},
    {"ticker": "ANDINA-B.SN", "name": "Embotelladora Andina", "sector": "Consumer Staples", "industry": "Beverages"},
    {"ticker": "BCI.SN", "name": "Banco BCI", "sector": "Financials", "industry": "Banking"},
    {"ticker": "BSANTANDER.SN", "name": "Banco Santander-Chile", "sector": "Financials", "industry": "Banking"},
    {"ticker": "CAP.SN", "name": "CAP S.A.", "sector": "Materials", "industry": "Steel"},
    {"ticker": "CCU.SN", "name": "Compañía Cervecerías Unidas", "sector": "Consumer Staples", "industry": "Beverages"},
    {"ticker": "CHILE.SN", "name": "Banco de Chile", "sector": "Financials", "industry": "Banking"},
    {"ticker": "CMPC.SN", "name": "Empresas CMPC", "sector": "Materials", "industry": "Paper & Forest"},
    {"ticker": "COLBUN.SN", "name": "Colbún S.A.", "sector": "Utilities", "industry": "Electric Utilities"},
    {"ticker": "COPEC.SN", "name": "Empresas Copec", "sector": "Energy", "industry": "Oil & Gas"},
    {"ticker": "CENCOSUD.SN", "name": "Cencosud S.A.", "sector": "Consumer Discretionary", "industry": "Retail"},
    {"ticker": "ECL.SN", "name": "Empresa Eléctrica del Norte Grande", "sector": "Utilities", "industry": "Electric Utilities"},
    {"ticker": "ENELAM.SN", "name": "Enel Américas", "sector": "Utilities", "industry": "Electric Utilities"},
    {"ticker": "ENELCHILE.SN", "name": "Enel Chile", "sector": "Utilities", "industry": "Electric Utilities"},
    {"ticker": "FALABELLA.SN", "name": "Falabella S.A.", "sector": "Consumer Discretionary", "industry": "Retail"},
    {"ticker": "FORUS.SN", "name": "Forus S.A.", "sector": "Consumer Discretionary", "industry": "Footwear"},
    {"ticker": "ITAUCL.SN", "name": "Itaú CorpBanca", "sector": "Financials", "industry": "Banking"},
    {"ticker": "PARAUCO.SN", "name": "Parque Arauco", "sector": "Real Estate", "industry": "REITs"},
    {"ticker": "RIPLEY.SN", "name": "Ripley Corp", "sector": "Consumer Discretionary", "industry": "Retail"},
    {"ticker": "SALFACORP.SN", "name": "Salfacorp S.A.", "sector": "Industrials", "industry": "Construction"},
    {"ticker": "SECURITY.SN", "name": "Grupo Security", "sector": "Financials", "industry": "Insurance"},
    {"ticker": "SMSAAM.SN", "name": "SMSAAM", "sector": "Industrials", "industry": "Transportation"},
    {"ticker": "SQM-B.SN", "name": "SQM S.A.", "sector": "Materials", "industry": "Chemicals"},
    {"ticker": "VAPORES.SN", "name": "CSAV", "sector": "Industrials", "industry": "Shipping"},
    {"ticker": "WATTS.SN", "name": "Watts S.A.", "sector": "Consumer Staples", "industry": "Food"},
    {"ticker": "IAM.SN", "name": "Inversiones Aguas Metropolitanas", "sector": "Utilities", "industry": "Water"},
    {"ticker": "ILC.SN", "name": "Inversiones La Construcción", "sector": "Financials", "industry": "Insurance"},
    {"ticker": "MALLPLAZA.SN", "name": "Mall Plaza", "sector": "Real Estate", "industry": "REITs"},
    {"ticker": "NUEVAPOLAR.SN", "name": "Empresas Hites", "sector": "Consumer Discretionary", "industry": "Retail"},
]

# Group into sector tree for sidebar
def _build_ipsa_tree():
    from collections import defaultdict
    sectors = defaultdict(lambda: defaultdict(list))
    for item in IPSA_TICKER_INFO:
        sectors[item["sector"]][item["industry"]].append(item["ticker"])
    tree = []
    for sector, industries in sectors.items():
        tree.append({
            "sector": sector,
            "industries": [
                {"industry": ind, "tickers": tickers}
                for ind, tickers in industries.items()
            ],
        })
    return tree

IPSA_SECTOR_TREE = _build_ipsa_tree()
