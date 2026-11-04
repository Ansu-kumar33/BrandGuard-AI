from fastapi.testclient import TestClient


def test_review_decisions_status_and_history(
    api_client: TestClient,
    brand_payload: dict[str, object],
    review_payload: dict[str, object],
) -> None:
    brand_response = api_client.post("/api/brands", json=brand_payload)
    assert brand_response.status_code == 201
    brand_id = brand_response.json()["id"]

    create_payload = {
        **review_payload,
        "brand_profile_id": brand_id,
    }
    created = api_client.post("/api/reviews", json=create_payload)
    assert created.status_code == 201
    review = created.json()
    review_id = review["id"]
    issue_id = review["issues"][0]["id"]

    assert api_client.get(f"/api/reviews/{review_id}").json()["content_title"] == (
        "Homepage promotion"
    )
    assert any(
        item["id"] == review_id for item in api_client.get("/api/reviews").json()
    )

    latest_issues = review["issues"]
    for decision, final_text in (
        ("accepted", None),
        ("rejected", None),
        ("edited", "A human-edited alternative."),
    ):
        response = api_client.put(
            f"/api/reviews/{review_id}/suggestions/{issue_id}",
            json={
                "issue_id": issue_id,
                "decision": decision,
                "final_text": final_text,
            },
        )
        assert response.status_code == 200
        issue = response.json()["issues"][0]
        assert issue["suggestion_decision"] == decision
        assert issue["final_text"] == final_text
        latest_issues = response.json()["issues"]

    for state in ("reviewed", "approved", "rejected", "pending"):
        response = api_client.put(
            f"/api/reviews/{review_id}",
            json={"review_status": state, "issues": latest_issues},
        )
        assert response.status_code == 200
        assert response.json()["review_status"] == state
        assert response.json()["issues"][0]["suggestion_decision"] == "edited"

    deletion = api_client.delete(f"/api/brands/{brand_id}")
    assert deletion.status_code == 409


def test_review_invalid_and_missing_records(
    api_client: TestClient,
    brand_payload: dict[str, object],
    review_payload: dict[str, object],
) -> None:
    invalid = api_client.post(
        "/api/reviews",
        json={
            **review_payload,
            "brand_profile_id": "00000000-0000-0000-0000-000000000000",
            "compliance_score": 101,
        },
    )
    assert invalid.status_code == 422

    missing_id = "00000000-0000-0000-0000-000000000000"
    assert api_client.get(f"/api/reviews/{missing_id}").status_code == 404
    assert api_client.put(
        f"/api/reviews/{missing_id}",
        json={"review_status": "reviewed", "issues": []},
    ).status_code == 404
    assert api_client.put(
        f"/api/reviews/{missing_id}/suggestions/unknown",
        json={"issue_id": "unknown", "decision": "accepted"},
    ).status_code == 404

    bad_brand = api_client.post("/api/brands", json=brand_payload)
    assert bad_brand.status_code == 201
    orphan_review = api_client.post(
        "/api/reviews",
        json={
            **review_payload,
            "brand_profile_id": missing_id,
        },
    )
    assert orphan_review.status_code == 404
