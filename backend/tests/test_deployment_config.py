import os
import sqlite3
import subprocess
import sys
from pathlib import Path

import pytest
from sqlalchemy import text

from database import create_database_engine, run_ownership_migrations
from main import get_frontend_origins


def test_frontend_origins_default_to_local_vite_servers(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("FRONTEND_ORIGINS", raising=False)

    assert get_frontend_origins() == [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


def test_frontend_origins_parse_configured_domains(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv(
        "FRONTEND_ORIGINS",
        " https://brandguard.example/, https://preview.example ",
    )

    assert get_frontend_origins() == [
        "https://brandguard.example",
        "https://preview.example",
    ]


def test_frontend_origins_reject_wildcard(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("FRONTEND_ORIGINS", "https://brandguard.example,*")

    with pytest.raises(ValueError, match="must not contain a wildcard"):
        get_frontend_origins()


def test_database_path_creates_missing_parent_directory(tmp_path: Path) -> None:
    backend_path = Path(__file__).resolve().parents[1]
    database_path = tmp_path / "nested" / "data" / "brandguard.db"
    environment = {
        **os.environ,
        "BRANDGUARD_DATABASE_PATH": str(database_path),
    }

    subprocess.run(
        [sys.executable, "-c", "import database"],
        cwd=backend_path,
        env=environment,
        check=True,
        capture_output=True,
        text=True,
    )

    assert database_path.parent.is_dir()


def test_ownership_migration_preserves_legacy_rows(tmp_path: Path) -> None:
    database_path = tmp_path / "legacy.db"
    with sqlite3.connect(database_path) as connection:
        connection.executescript(
            """
            CREATE TABLE users (id VARCHAR(36) PRIMARY KEY);
            CREATE TABLE brand_profiles (id VARCHAR(36) PRIMARY KEY);
            CREATE TABLE content_reviews (id VARCHAR(36) PRIMARY KEY);
            INSERT INTO brand_profiles (id) VALUES ('legacy-brand');
            INSERT INTO content_reviews (id) VALUES ('legacy-review');
            """
        )

    database_engine = create_database_engine(f"sqlite:///{database_path.as_posix()}")
    try:
        run_ownership_migrations(database_engine)
        with database_engine.connect() as connection:
            brand = connection.execute(
                text(
                    "SELECT id, owner_user_id FROM brand_profiles "
                    "WHERE id = 'legacy-brand'"
                )
            ).one()
            review = connection.execute(
                text(
                    "SELECT id, owner_user_id FROM content_reviews "
                    "WHERE id = 'legacy-review'"
                )
            ).one()
        assert tuple(brand) == ("legacy-brand", None)
        assert tuple(review) == ("legacy-review", None)
    finally:
        database_engine.dispose()
