import pytest
from fastapi.testclient import TestClient


def test_analysis_reports_missing_key_without_fake_success(
    api_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = api_client.post(
        "/api/analyze",
        json={
            "title": "Homepage promotion",
            "content": "We guarantee great service.",
            "guidelines": {
                "brand_name": "Test Brand",
                "preferred_tone": "Friendly and professional",
                "target_audience": "Customers",
                "restricted_words": ["guaranteed"],
            },
        },
    )
    assert response.status_code == 503
    assert "not configured" in response.json()["detail"].lower()


def test_analysis_rejects_invalid_input(api_client: TestClient) -> None:
    response = api_client.post(
        "/api/analyze",
        json={
            "title": " ",
            "content": "",
            "guidelines": {},
        },
    )
    assert response.status_code == 422
