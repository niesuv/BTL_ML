from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session, sessionmaker

engine = create_engine(
    # "postgresql+psycopg://root:1234@db/postgres" // docker compose ver
    "postgresql+psycopg://root:1234@localhost:5432/postgres"
)  # TODO: Change it to async!
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
