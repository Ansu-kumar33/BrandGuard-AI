from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def api_client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Generator[TestClient, None, None]:
    database_path = tmp_path / "brandguard-test.db"
    monkeypatch.setenv("BRANDGUARD_DATABASE_PATH", str(database_path))
    monkeypatch.setenv(
        "JWT_SECRET_KEY",
        "unit-test-secret-key-that-is-at-least-thirty-two-characters",
    )
    monkeypatch.setenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30")

    import database
    import main
    database.engine.dispose()
    database.DATABASE_PATH = database_path
    database.DATABASE_URL = f"sqlite:///{database_path.as_posix()}"
    database.engine = database.create_database_engine(database.DATABASE_URL)
    database.SessionLocal.configure(bind=database.engine)
    main.engine = database.engine

    with TestClient(main.app) as client:
        registration = client.post(
            "/api/auth/register",
            json={
                "name": "Test User",
                "email": "test@example.com",
                "password": "test-password-123",
            },
        )
        assert registration.status_code == 201
        token = client.post(
            "/api/auth/login",
            json={
                "email": "TEST@example.com",
                "password": "test-password-123",
            },
        ).json()["access_token"]
        client.headers.update({"Authorization": f"Bearer {token}"})
        yield client

    database.engine.dispose()


@pytest.fixture
def brand_payload() -> dict[str, object]:
    return {
        "brand_name": "Test Brand",
        "tone": "Friendly and professional",
        "target_audience": "Customers",
        "preferred_words": ["Customer", "helpful"],
        "restricted_words": ["guaranteed"],
        "approved_facts": ["Serving customers since 2015"],
        "additional_instructions": "Use clear language.",
    }


@pytest.fixture
def review_payload() -> dict[str, object]:
    return {
        "content_title": "Homepage promotion",
        "original_content": "We guarantee great service.",
        "analysis_mode": "rule-based",
        "compliance_score": 72,
        "analysis_summary": "One finding needs human review.",
        "issues": [
            {
                "id": "issue-restricted-term",
                "category": "Restricted term",
                "exact_text": "guarantee",
                "explanation": "The wording matches a restricted term.",
                "severity": "high",
                "suggested_correction": "Use supportable wording.",
                "requires_human_verification": True,
            }
        ],
        "matched_approved_facts": [],
        "review_status": "pending",
    }
