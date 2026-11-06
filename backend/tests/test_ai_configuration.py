import json
from types import SimpleNamespace

import httpx
import pytest
from openai import RateLimitError
from fastapi.testclient import TestClient


def test_analysis_reports_missing_key_without_fake_success(
    api_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
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


def test_analysis_uses_groq_client_and_preserves_response_format(
    api_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    import analyze

    api_key = "test-groq-key"
    monkeypatch.setenv("GROQ_API_KEY", api_key)
    captured: dict[str, object] = {}
    expected_analysis = {
        "compliance_score": 72,
        "summary": "Review the absolute claim.",
        "issues": [
            {
                "category": "Potentially risky claim",
                "exact_text": "We guarantee great service.",
                "explanation": "The guarantee may be unsupported.",
                "severity": "high",
                "suggested_correction": "Describe the service without a guarantee.",
                "requires_human_verification": True,
            }
        ],
        "matched_approved_facts": [],
    }

    class FakeCompletions:
        async def create(self, **kwargs: object) -> SimpleNamespace:
            captured["request"] = kwargs
            message = SimpleNamespace(content=json.dumps(expected_analysis))
            return SimpleNamespace(choices=[SimpleNamespace(message=message)])

    class FakeClient:
        def __init__(self, **kwargs: object) -> None:
            captured["client"] = kwargs
            self.chat = SimpleNamespace(completions=FakeCompletions())

        async def __aenter__(self) -> "FakeClient":
            return self

        async def __aexit__(self, *_: object) -> None:
            return None

    monkeypatch.setattr(analyze, "AsyncOpenAI", FakeClient)
    response = api_client.post(
        "/api/analyze",
        json={
            "title": "Homepage promotion",
            "content": "We guarantee great service.",
            "guidelines": {
                "brand_name": "Test Brand",
                "preferred_tone": "Friendly and professional",
                "target_audience": "Customers",
            },
        },
    )

    assert response.status_code == 200
    assert response.json() == expected_analysis
    client_options = captured["client"]
    assert isinstance(client_options, dict)
    assert client_options["api_key"] == api_key
    assert client_options["base_url"] == "https://api.groq.com/openai/v1"
    request_options = captured["request"]
    assert isinstance(request_options, dict)
    assert request_options["model"] == "openai/gpt-oss-120b"
    assert request_options["response_format"] == analyze.RESPONSE_FORMAT


def test_analysis_maps_groq_rate_limit_to_retryable_error(
    api_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    import analyze

    monkeypatch.setenv("GROQ_API_KEY", "test-groq-key")
    response_obj = httpx.Response(
        429,
        request=httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions"),
    )
    rate_limit_error = RateLimitError(
        "rate limited",
        response=response_obj,
        body={"error": {"message": "rate limited"}},
    )

    class FakeCompletions:
        async def create(self, **_: object) -> None:
            raise rate_limit_error

    class FakeClient:
        def __init__(self, **_: object) -> None:
            self.chat = SimpleNamespace(completions=FakeCompletions())

        async def __aenter__(self) -> "FakeClient":
            return self

        async def __aexit__(self, *_: object) -> None:
            return None

    monkeypatch.setattr(analyze, "AsyncOpenAI", FakeClient)
    response = api_client.post(
        "/api/analyze",
        json={
            "title": "Homepage promotion",
            "content": "We guarantee great service.",
            "guidelines": {
                "brand_name": "Test Brand",
                "preferred_tone": "Friendly and professional",
                "target_audience": "Customers",
            },
        },
    )

    assert response.status_code == 503
    assert "retry" in response.json()["detail"].lower()


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
