import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

DATABASE_URL = os.environ.get("SUPABASE_DB_URL")

# Fallback to in-memory SQLite so tests don't crash on import when SUPABASE_DB_URL is unset.
engine = create_engine(DATABASE_URL or "sqlite:///:memory:", echo=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()