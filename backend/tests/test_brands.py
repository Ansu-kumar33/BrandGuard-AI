import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError


def test_brand_crud_and_health(
    api_client: TestClient, brand_payload: dict[str, object]
) -> None:
    health = api_client.get("/api/health")
    assert health.status_code == 200
    assert health.json()["database"] == "connected"

    created = api_client.post("/api/brands", json=brand_payload)
    assert created.status_code == 201
    brand = created.json()
    brand_id = brand["id"]

    fetched = api_client.get(f"/api/brands/{brand_id}")
    assert fetched.status_code == 200
    assert fetched.json()["brand_name"] == "Test Brand"

    updated_payload = {**brand_payload, "tone": "Warm and concise"}
    updated = api_client.put(f"/api/brands/{brand_id}", json=updated_payload)
    assert updated.status_code == 200
    assert updated.json()["tone"] == "Warm and concise"

    listed = api_client.get("/api/brands")
    assert listed.status_code == 200
    assert any(item["id"] == brand_id for item in listed.json())

    deleted = api_client.delete(f"/api/brands/{brand_id}")
    assert deleted.status_code == 204
    assert api_client.get(f"/api/brands/{brand_id}").status_code == 404


def test_brand_validation_and_missing_id(
    api_client: TestClient, brand_payload: dict[str, object]
) -> None:
    invalid = api_client.post("/api/brands", json={**brand_payload, "brand_name": " "})
    assert invalid.status_code == 422

    missing = api_client.get("/api/brands/00000000-0000-0000-0000-000000000000")
    assert missing.status_code == 404


def test_database_health_error_does_not_reveal_internal_details(
    api_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    import main

    class BrokenEngine:
        def connect(self):
            raise SQLAlchemyError("private database connection detail")

    monkeypatch.setattr(main, "engine", BrokenEngine())
    response = api_client.get("/api/health")
    assert response.status_code == 503
    assert "private database connection detail" not in response.text
    assert "database is unavailable" in response.json()["detail"]
