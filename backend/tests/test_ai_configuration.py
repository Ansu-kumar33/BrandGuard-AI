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


@pytest.mark.parametrize(
    ("provider_quote", "expected_quote"),
    [
        ("We guarantee great service.", "We guarantee great service."),
        ("We guarantee great service", "We guarantee great service"),
        ("We promise exceptional support.", None),
        ("we GUARANTEE great SERVICE.", "We guarantee great service."),
        ("We, GUARANTEE great service!", "We guarantee great service."),
        ("We   guarantee\ngreat service.", "We guarantee great service."),
        (None, None),
        ("", None),
    ],
)
def test_analysis_returns_only_exact_original_issue_quotes(
    api_client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    provider_quote: str | None,
    expected_quote: str | None,
) -> None:
    import analyze

    content = "We guarantee great service."
    monkeypatch.setenv("GROQ_API_KEY", "test-groq-key")
    issue: dict[str, object] = {
        "category": "Potentially risky claim",
        "explanation": "Review this wording.",
        "severity": "high",
        "suggested_correction": "Use supportable wording.",
        "requires_human_verification": True,
    }
    if provider_quote is not None:
        issue["exact_text"] = provider_quote
    provider_response = {
        "compliance_score": 72,
        "summary": "Review the claim.",
        "issues": [issue],
        "matched_approved_facts": [],
    }

    class FakeCompletions:
        async def create(self, **_: object) -> SimpleNamespace:
            message = SimpleNamespace(content=json.dumps(provider_response))
            return SimpleNamespace(choices=[SimpleNamespace(message=message)])

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
            "content": content,
            "guidelines": {
                "brand_name": "Test Brand",
                "preferred_tone": "Friendly and professional",
                "target_audience": "Customers",
            },
        },
    )

    assert response.status_code == 200
    returned_issues = response.json()["issues"]
    if expected_quote is None:
        assert returned_issues == []
    else:
        assert len(returned_issues) == 1
        assert returned_issues[0]["exact_text"] == expected_quote
        assert returned_issues[0]["exact_text"] in content


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
