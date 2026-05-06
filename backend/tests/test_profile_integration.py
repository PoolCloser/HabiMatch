import os
import pytest
import httpx
from dotenv import load_dotenv
from fastapi.testclient import TestClient
from backend.app.main import app

load_dotenv()

os.environ["SUPABASE_URL"] = os.environ.get("EXPO_PUBLIC_SUPABASE_URL", "")
os.environ["SUPABASE_KEY"] = os.environ.get("EXPO_PUBLIC_SUPABASE_ANON_KEY", "")

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]

if not SUPABASE_URL:
    pytest.skip("Supabase env vars not set — skipping integration tests", allow_module_level=True)


client = TestClient(app)

TEST_EMAIL = "test@gmail.com"
TEST_PASSWORD = "SuperMonkey"
VALID_PROFILE = {
    "full_name": "Integration Test User",
    "bio": "Test bio.",
    "birthdate": "1999-06-15",
    "gender": "female",
    "location": "San Francisco, CA",
}


# --- Helpers ---

def _delete_profile(token: str):
    client.delete("/lifestyle/", headers={"Authorization": f"Bearer {token}"})
    client.delete("/profile/", headers={"Authorization": f"Bearer {token}"})


def _sign_up(email: str, password: str) -> dict:
    response = httpx.post(
        f"{SUPABASE_URL}/auth/v1/signup",
        headers={"apikey": SUPABASE_KEY, "Content-Type": "application/json"},
        json={"email": email, "password": password},
    )
    return response.json()


def _sign_in(email: str, password: str) -> str:
    response = httpx.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={"apikey": SUPABASE_KEY, "Content-Type": "application/json"},
        json={"email": email, "password": password},
    )
    assert response.status_code == 200, (
        f"Login failed after signup attempt. "
        f"Status: {response.status_code}, Body: {response.json()}\n\n"
        f"If email confirmation is required in your Supabase project, "
        f"go to Authentication → Providers → Email and disable 'Confirm email'."
    )
    return response.json()["access_token"]


# --- Session-scoped auth token ---

@pytest.fixture(scope="session")
def auth_token():
    _sign_up(TEST_EMAIL, TEST_PASSWORD)
    return _sign_in(TEST_EMAIL, TEST_PASSWORD)


# --- Wipes profile (and lifestyle) before and after every test ---

@pytest.fixture(autouse=True)
def cleanup(auth_token):
    _delete_profile(auth_token)
    yield
    _delete_profile(auth_token)


# --- Create Profile Tests ---

class TestCreateProfileIntegration:

    def test_create_profile_success(self, auth_token):
        response = client.post(
            "/profile/",
            json=VALID_PROFILE,
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == VALID_PROFILE["full_name"]
        assert data["birthdate"] == VALID_PROFILE["birthdate"]
        assert data["bio"] == VALID_PROFILE["bio"]
        assert "id" in data
        assert "created_at" in data

    def test_create_profile_already_exists(self, auth_token):
        setup = client.post(
            "/profile/",
            json=VALID_PROFILE,
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert setup.status_code == 200, f"Setup failed: {setup.json()}"

        response = client.post(
            "/profile/",
            json=VALID_PROFILE,
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]

    def test_create_profile_all_fields_optional(self, auth_token):
        response = client.post(
            "/profile/",
            json={},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 200

    def test_create_profile_bio_too_long(self, auth_token):
        bad_data = {**VALID_PROFILE, "bio": "x" * 501}
        response = client.post(
            "/profile/",
            json=bad_data,
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 422

    def test_create_profile_invalid_birthdate_format(self, auth_token):
        bad_data = {**VALID_PROFILE, "birthdate": "not-a-date"}
        response = client.post(
            "/profile/",
            json=bad_data,
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 422


# --- Get Profile Tests ---

class TestGetProfileIntegration:

    def test_get_profile_success(self, auth_token):
        setup = client.post(
            "/profile/",
            json=VALID_PROFILE,
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert setup.status_code == 200, f"Setup failed: {setup.json()}"

        response = client.get("/profile/", headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == VALID_PROFILE["full_name"]
        assert data["birthdate"] == VALID_PROFILE["birthdate"]

    def test_get_profile_not_found(self, auth_token):
        response = client.get("/profile/", headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 404


# --- Update Profile Tests ---

class TestUpdateProfileIntegration:

    def test_update_profile_success(self, auth_token):
        setup = client.post(
            "/profile/",
            json=VALID_PROFILE,
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert setup.status_code == 200, f"Setup failed: {setup.json()}"

        response = client.put(
            "/profile/",
            json={"full_name": "Updated Name", "birthdate": "1995-03-20"},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "Updated Name"
        assert data["birthdate"] == "1995-03-20"

    def test_update_profile_not_found(self, auth_token):
        response = client.put(
            "/profile/",
            json={"full_name": "Nobody"},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 404

    def test_update_profile_partial_fields(self, auth_token):
        setup = client.post(
            "/profile/",
            json=VALID_PROFILE,
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert setup.status_code == 200, f"Setup failed: {setup.json()}"

        response = client.put(
            "/profile/",
            json={"bio": "Updated bio only."},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 200
        assert response.json()["bio"] == "Updated bio only."
        assert response.json()["full_name"] == VALID_PROFILE["full_name"]


# --- Auth Tests ---

class TestAuthIntegration:

    def test_invalid_token(self):
        response = client.get("/profile/", headers={"Authorization": "Bearer totallyinvalidtoken"})
        assert response.status_code == 401

    def test_no_auth(self):
        response = client.get("/profile/")
        assert response.status_code == 401