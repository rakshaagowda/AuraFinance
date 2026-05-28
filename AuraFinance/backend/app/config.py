import os

class Settings:
    PROJECT_NAME: str = "AI Financial Behavior Intelligence Platform"
    
    # Database Settings
    # We will try behavior_finance_db. Fallback to sqlite if postgres is not accessible, 
    # but we'll try postgres first with common local credentials.
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:postgres@localhost:5432/behavior_finance_db"
    )
    # Database URL without DB name (to create database if not exists)
    DATABASE_BASE_URL: str = os.getenv(
        "DATABASE_BASE_URL", 
        "postgresql://postgres:postgres@localhost:5432/postgres"
    )
    
    # Security Settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super_secret_ai_behavior_finance_key_12984710")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # Gemini Fallback Settings (We can also pass keys from frontend request headers)
    DEFAULT_GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

settings = Settings()
