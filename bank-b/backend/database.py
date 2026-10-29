import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.config import settings, logger

# Declare SQLAlchemy Base
Base = declarative_base()

# Attempt primary PostgreSQL connection
DATABASE_URL = settings.DATABASE_URL
engine = None
SessionLocal = None
is_postgres_active = False

try:
    # Test PostgreSQL connection
    if DATABASE_URL.startswith("postgresql"):
        temp_engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args={"connect_timeout": 3})
        with temp_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        engine = temp_engine
        is_postgres_active = True
        logger.info("Successfully connected to primary PostgreSQL database: %s", DATABASE_URL)
    else:
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
        logger.info("Connected to configured database URL: %s", DATABASE_URL)

except Exception as e:
    logger.warning("=" * 70)
    logger.warning("DATABASE WARNING: Primary PostgreSQL database is UNAVAILABLE.")
    logger.warning("Error details: %s", str(e))
    logger.warning("Falling back to DEV_FALLBACK_DATABASE_URL (%s) for temporary development testing.", settings.DEV_FALLBACK_DATABASE_URL)
    logger.warning("NOTE: Production integration requires a running PostgreSQL instance.")
    logger.warning("=" * 70)
    
    fallback_url = settings.DEV_FALLBACK_DATABASE_URL
    if fallback_url.startswith("sqlite"):
        engine = create_engine(fallback_url, connect_args={"check_same_thread": False})
    else:
        engine = create_engine(fallback_url)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
