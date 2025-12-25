from __future__ import annotations

import os
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATA_DIR = Path('data')
DATA_DIR.mkdir(exist_ok=True)
raw_db_path = os.getenv('ACE_SAAS_DB_PATH')
DB_PATH = Path(raw_db_path) if raw_db_path else DATA_DIR / 'saas.db'
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(
    f'sqlite:///{DB_PATH}',
    connect_args={'check_same_thread': False},
    future=True,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

Base = declarative_base()


def init_db() -> None:
    """Create tables if they do not already exist."""
    from . import models  # noqa: F401 - ensure model metadata is registered

    Base.metadata.create_all(bind=engine)


@contextmanager
def get_session() -> Iterator:
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
