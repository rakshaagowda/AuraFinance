import os
from pathlib import Path
from dotenv import load_dotenv

# Load local environment variables
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# Directories
UPLOAD_DIR = os.getenv("UPLOAD_DIR", str(BASE_DIR / "uploads"))
CHROMA_DIR = os.getenv("CHROMA_DIR", str(BASE_DIR / "chroma_db"))
SQLITE_DB_PATH = os.getenv("SQLITE_DB_PATH", str(BASE_DIR / "vaultiq.db"))

# Ensure directories exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(CHROMA_DIR, exist_ok=True)

# Database
DATABASE_URL = f"sqlite:///{SQLITE_DB_PATH}"

# Security
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "vaultiq_super_secure_secret_key_2026_vector_vault!")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day

# LLM Providers default API keys (can be overridden per request or stored)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
