import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    f"sqlite+aiosqlite:///{BASE_DIR / 'data' / 'stockviewer.db'}",
)

IPSA_CSV_PATH: Path = Path(
    os.getenv("IPSA_CSV_PATH", str(BASE_DIR / "data" / "ipsa_index.csv"))
)

IPSA_REBUILD_INTERVAL_HOURS: int = int(os.getenv("IPSA_REBUILD_INTERVAL_HOURS", "24"))

RF_RATE: float = float(os.getenv("RF_RATE", "0.03"))

CORS_ORIGINS: list[str] = os.getenv(
    "CORS_ORIGINS", "http://localhost:5173"
).split(",")

IPSA_TICKERS: list[str] = [
    "AGUAS-A.SN", "ANDINA-B.SN", "BCI.SN", "BSANTANDER.SN", "CAP.SN",
    "CCU.SN", "CHILE.SN", "CMPC.SN", "COLBUN.SN", "COPEC.SN",
    "CENCOSUD.SN", "ECL.SN", "ENELAM.SN", "ENELCHILE.SN", "FALABELLA.SN",
    "FORUS.SN", "ITAUCL.SN", "PARAUCO.SN", "RIPLEY.SN", "SALFACORP.SN",
    "SECURITY.SN", "SMSAAM.SN", "SQM-B.SN", "VAPORES.SN", "WATTS.SN",
    "IAM.SN", "ILC.SN", "MALLPLAZA.SN", "NUEVAPOLAR.SN",
]

# Ensure data directory exists
(BASE_DIR / "data").mkdir(exist_ok=True)
