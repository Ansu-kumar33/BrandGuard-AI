from fastapi.testclient import TestClient

from auth import verify_password
from database import SessionLocal
from models import User


def register_user(
    client: TestClient,
    email: str = "second@example.com",
    password: str = "a-long-test-password",
) -> dict[str, object]:
    response = client.post(
        "/api/auth/register",
        json={"name": "Second User", "email": email, "password": password},
    )
    assert response.status_code == 201
    return response.json()


def login_token(client: TestClient, email: str, password: str) -> str:
    response = client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def test_registration_hashes_password_and_normalizes_email(
    api_client: TestClient,
) -> None:
    response = api_client.post(
        "/api/auth/register",
        json={
            "name": "  New User  ",
            "email": " New.User@Example.com ",
            "password": "a-long-test-password",
        },
    )

    assert response.status_code == 201
    assert response.json()["name"] == "New User"
    assert response.json()["email"] == "new.user@example.com"
    assert "password" not in response.json()
    with SessionLocal() as db:
        user = db.query(User).filter_by(email="new.user@example.com").one()
        assert user.password_hash != "a-long-test-password"
        assert verify_password("a-long-test-password", user.password_hash)

    duplicate = api_client.post(
        "/api/auth/register",
        json={
            "name": "New User",
            "email": "new.user@example.com",
            "password": "a-long-test-password",
        },
    )
    assert duplicate.status_code == 409


def test_login_returns_bearer_token_and_rejects_bad_credentials(
    api_client: TestClient,
) -> None:
    response = api_client.post(
        "/api/auth/login",
        json={"email": "TEST@example.com", "password": "test-password-123"},
    )

    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"
    assert response.json()["expires_in"] == 1800
    assert api_client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {response.json()['access_token']}"},
    ).status_code == 200

    invalid = api_client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "wrong-password"},
    )
    assert invalid.status_code == 401


def test_invalid_and_missing_tokens_cannot_access_protected_routes(
    api_client: TestClient,
    brand_payload: dict[str, object],
) -> None:
    api_client.headers.pop("Authorization")
    assert api_client.get("/api/brands").status_code == 401
    assert api_client.get("/api/reviews").status_code == 401
    assert api_client.post("/api/brands", json=brand_payload).status_code == 401
    assert api_client.post(
        "/api/analyze",
        json={
            "title": "Protected analysis",
            "content": "This request needs authentication.",
            "guidelines": {
                "brand_name": "Test Brand",
                "preferred_tone": "Friendly",
                "target_audience": "Customers",
            },
        },
    ).status_code == 401

    invalid = api_client.get(
        "/api/brands",
        headers={"Authorization": "Bearer not-a-valid-jwt"},
    )
    assert invalid.status_code == 401
    assert invalid.headers["www-authenticate"] == "Bearer"


def test_users_cannot_read_or_modify_another_users_records(
    api_client: TestClient,
    brand_payload: dict[str, object],
    review_payload: dict[str, object],
) -> None:
    created_brand = api_client.post("/api/brands", json=brand_payload)
    assert created_brand.status_code == 201
    brand_id = created_brand.json()["id"]
    created_review = api_client.post(
        "/api/reviews",
        json={**review_payload, "brand_profile_id": brand_id},
    )
    assert created_review.status_code == 201
    review_id = created_review.json()["id"]
    issue_id = created_review.json()["issues"][0]["id"]

    register_user(api_client)
    second_token = login_token(
        api_client, "second@example.com", "a-long-test-password"
    )
    api_client.headers["Authorization"] = f"Bearer {second_token}"

    assert api_client.get("/api/brands").json() == []
    assert api_client.get(f"/api/brands/{brand_id}").status_code == 404
    assert api_client.put(
        f"/api/brands/{brand_id}", json={**brand_payload, "tone": "Changed"}
    ).status_code == 404
    assert api_client.delete(f"/api/brands/{brand_id}").status_code == 404
    assert api_client.post(
        "/api/reviews",
        json={**review_payload, "brand_profile_id": brand_id},
    ).status_code == 404
    assert api_client.get("/api/reviews").json() == []
    assert api_client.get(f"/api/reviews/{review_id}").status_code == 404
    assert api_client.put(
        f"/api/reviews/{review_id}",
        json={"review_status": "approved", "issues": []},
    ).status_code == 404
    assert api_client.put(
        f"/api/reviews/{review_id}/suggestions/{issue_id}",
        json={"issue_id": issue_id, "decision": "accepted"},
    ).status_code == 404
