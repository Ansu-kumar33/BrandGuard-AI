from collections.abc import Generator
import os
from pathlib import Path

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import Session, declarative_base, sessionmaker

DATABASE_PATH = Path(
    os.getenv(
        "BRANDGUARD_DATABASE_PATH",
        str(Path(__file__).resolve().parent / "brandguard.db"),
    )
).expanduser().resolve()
DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
DATABASE_URL = f"sqlite:///{DATABASE_PATH.as_posix()}"


def enable_sqlite_foreign_keys(connection, _record) -> None:
    cursor = connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def create_database_engine(database_url: str):
    database_engine = create_engine(
        database_url,
        connect_args={"check_same_thread": False},
    )
    event.listen(database_engine, "connect", enable_sqlite_foreign_keys)
    return database_engine


def run_ownership_migrations(database_engine) -> None:
    inspector = inspect(database_engine)
    for table_name in ("brand_profiles", "content_reviews"):
        column_names = {
            column["name"] for column in inspector.get_columns(table_name)
        }
        if "owner_user_id" not in column_names:
            with database_engine.begin() as connection:
                connection.execute(
                    text(
                        f"ALTER TABLE {table_name} "
                        "ADD COLUMN owner_user_id VARCHAR(36) REFERENCES users(id)"
                    )
                )
        with database_engine.begin() as connection:
            connection.execute(
                text(
                    f"CREATE INDEX IF NOT EXISTS ix_{table_name}_owner_user_id "
                    f"ON {table_name} (owner_user_id)"
                )
            )


engine = create_database_engine(DATABASE_URL)


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
