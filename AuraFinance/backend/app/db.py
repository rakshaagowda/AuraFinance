from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
import time
from app.config import settings

# For automatic database creation, we can check if database exists.
# But database_exists/create_database requires sqlalchemy_utils. 
# We can do it manually using standard psycopg2/sqlalchemy engines to be safe.

def setup_database():
    """Attempts to connect to PostgreSQL and create behavior_finance_db if it doesn't exist."""
    print("Setting up database...")
    
    # Try with default settings.DATABASE_URL
    try:
        # First, try to connect to the target database
        engine = create_engine(settings.DATABASE_URL)
        engine.connect()
        print("Successfully connected to database behavior_finance_db.")
        return engine
    except Exception as e:
        print(f"Could not connect directly to target database. Error: {e}")
        print("Attempting to create behavior_finance_db...")
        
        # Try to connect to default database ('postgres') to run CREATE DATABASE
        try:
            base_engine = create_engine(settings.DATABASE_BASE_URL)
            conn = base_engine.connect()
            # Set isolation level to AUTOCOMMIT because CREATE DATABASE cannot run in a transaction block
            conn.execution_options(isolation_level="AUTOCOMMIT")
            
            # Check if database exists
            result = conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname='behavior_finance_db'")
            ).fetchone()
            
            if not result:
                conn.execute(text("CREATE DATABASE behavior_finance_db"))
                print("Database behavior_finance_db created successfully.")
            else:
                print("Database behavior_finance_db already exists but could not connect. Check password/permissions.")
            conn.close()
            
            # Try connecting again
            engine = create_engine(settings.DATABASE_URL)
            engine.connect()
            return engine
        except Exception as ex:
            print(f"Failed to create behavior_finance_db in PostgreSQL. Error: {ex}")
            print("Falling back to SQLite database for ease of running...")
            
            # Fallback connection string
            sqlite_url = "sqlite:///./behavior_finance.db"
            print(f"Using SQLite database: {sqlite_url}")
            # Update settings in-memory
            settings.DATABASE_URL = sqlite_url
            engine = create_engine(sqlite_url, connect_args={"check_same_thread": False} if "sqlite" in sqlite_url else {})
            return engine

# Initialize Engine
engine = setup_database()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
