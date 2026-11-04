import os
import socket
import subprocess
import sys
import time
from pathlib import Path

import httpx


def test_saved_records_survive_backend_restart(tmp_path: Path) -> None:
    database_path = tmp_path / "restart-test.db"
    backend_path = Path(__file__).resolve().parents[1]
    environment = {
        **os.environ,
        "BRANDGUARD_DATABASE_PATH": str(database_path),
        "OPENAI_API_KEY": "",
        "JWT_SECRET_KEY": "restart-test-secret-key-that-is-at-least-thirty-two-characters",
        "JWT_ACCESS_TOKEN_EXPIRE_MINUTES": "30",
    }
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        port = listener.getsockname()[1]

    def start_backend() -> subprocess.Popen[bytes]:
        process = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "main:app",
                "--host",
                "127.0.0.1",
                "--port",
                str(port),
            ],
            cwd=backend_path,
            env=environment,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        deadline = time.monotonic() + 20
        while time.monotonic() < deadline:
            if process.poll() is not None:
                raise AssertionError(
                    f"Backend exited before becoming ready: {process.returncode}"
                )
            try:
                response = httpx.get(
                    f"http://127.0.0.1:{port}/api/health",
                    timeout=0.5,
                )
                if response.status_code == 200:
                    return process
            except httpx.HTTPError:
                time.sleep(0.2)
        process.terminate()
        process.wait(timeout=5)
        raise AssertionError("Backend did not become ready within 20 seconds.")

    process = start_backend()
    try:
        base_url = f"http://127.0.0.1:{port}/api"
        registration = httpx.post(
            f"{base_url}/auth/register",
            json={
                "name": "Restart Test User",
                "email": "restart-test@example.com",
                "password": "restart-test-password",
            },
            timeout=5,
        )
        assert registration.status_code == 201
        login = httpx.post(
            f"{base_url}/auth/login",
            json={
                "email": "restart-test@example.com",
                "password": "restart-test-password",
            },
            timeout=5,
        )
        assert login.status_code == 200
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        brand_response = httpx.post(
            f"{base_url}/brands",
            json={
                "brand_name": "Restart Test",
                "tone": "Friendly",
                "target_audience": "Customers",
            },
            headers=headers,
            timeout=5,
        )
        assert brand_response.status_code == 201
        brand_id = brand_response.json()["id"]

        review_response = httpx.post(
            f"{base_url}/reviews",
            json={
                "brand_profile_id": brand_id,
                "content_title": "Persisted after restart",
                "original_content": "Original copy remains saved.",
                "analysis_mode": "rule-based",
                "compliance_score": 88,
                "analysis_summary": "One human-reviewed finding.",
                "issues": [
                    {
                        "id": "restart-issue",
                        "category": "Potentially risky claim",
                        "exact_text": "Original copy",
                        "explanation": "Review this wording.",
                        "severity": "medium",
                        "suggested_correction": "Consider clearer wording.",
                        "requires_human_verification": True,
                        "suggestion_decision": "edited",
                        "final_text": "Reviewer-edited text.",
                        "reviewed": True,
                    }
                ],
                "review_status": "approved",
            },
            headers=headers,
            timeout=5,
        )
        assert review_response.status_code == 201, review_response.text
        review_id = review_response.json()["id"]

        process.terminate()
        process.wait(timeout=10)
        process = start_backend()

        restored_brand = httpx.get(
            f"{base_url}/brands/{brand_id}", headers=headers, timeout=5
        )
        restored_review = httpx.get(
            f"{base_url}/reviews/{review_id}", headers=headers, timeout=5
        )
        assert restored_brand.status_code == 200
        assert restored_review.status_code == 200
        restored = restored_review.json()
        assert restored["review_status"] == "approved"
        assert restored["original_content"] == "Original copy remains saved."
        assert restored["issues"][0]["suggestion_decision"] == "edited"
        assert restored["issues"][0]["final_text"] == "Reviewer-edited text."
    finally:
        if process.poll() is None:
            process.terminate()
            process.wait(timeout=10)
