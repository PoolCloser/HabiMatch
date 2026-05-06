# test_profile.py
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from uuid import uuid4
from jose import JWTError
from backend.app.main import app
from backend.models.auth import require_auth
from backend.models.database import get_db
from datetime import datetime, date

client = TestClient(app, raise_server_exceptions=False)

TEST_USER_ID = str(uuid4())

VALID_PROFILE = {
    "full_name": "Jane Doe",
    "bio": "I like a clean but relaxed home.",
    "birthdate": "1999-06-15",
    "gender": "female",
    "location": "San Francisco, CA",
}

def mock_current_user():
    return {"sub": TEST_USER_ID}

def make_mock_profile(**overrides):
    data = {**VALID_PROFILE, **overrides}
    profile = MagicMock()
    profile.id = TEST_USER_ID
    profile.avatar_url = None
    profile.birthdate = date(1999, 6, 15)
    profile.created_at = datetime(2024, 1, 1, 0, 0, 0)
    profile.updated_at = datetime(2024, 1, 1, 0, 0, 0)
    for key, value in data.items():
        setattr(profile, key, value)
    return profile

def make_mock_db(existing_profile=None):
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = existing_profile
    mock_db.refresh.side_effect = lambda obj: (
        setattr(obj, "created_at", datetime(2024, 1, 1, 0, 0, 0)),
        setattr(obj, "updated_at", datetime(2024, 1, 1, 0, 0, 0)),
    )
    return mock_db

@pytest.fixture(autouse=True)
def reset_dependency_overrides():
    app.dependency_overrides[require_auth] = mock_current_user
    yield
    app.dependency_overrides.clear()

def override_db(mock_db):
    def _override():
        yield mock_db
    return _override


class TestCreateProfile:

    def test_create_profile_success(self):
        mock_db = make_mock_db(existing_profile=None)
        app.dependency_overrides[get_db] = override_db(mock_db)
        response = client.post("/profile/", json=VALID_PROFILE, headers={"Authorization": "Bearer faketoken"})
        assert response.status_code == 200
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

    def test_create_profile_all_fields_optional(self):
        mock_db = make_mock_db(existing_profile=None)
        app.dependency_overrides[get_db] = override_db(mock_db)
        response = client.post("/profile/", json={}, headers={"Authorization": "Bearer faketoken"})
        assert response.status_code == 200

    def test_create_profile_already_exists(self):
        mock_profile = make_mock_profile()
        mock_db = make_mock_db(existing_profile=mock_profile)
        app.dependency_overrides[get_db] = override_db(mock_db)
        response = client.post("/profile/", json=VALID_PROFILE, headers={"Authorization": "Bearer faketoken"})
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]

    def test_create_profile_bio_too_long(self):
        bad_data = {**VALID_PROFILE, "bio": "x" * 501}
        response = client.post("/profile/", json=bad_data, headers={"Authorization": "Bearer faketoken"})
        assert response.status_code == 422

    def test_create_profile_invalid_birthdate_format(self):
        bad_data = {**VALID_PROFILE, "birthdate": "not-a-date"}
        response = client.post("/profile/", json=bad_data, headers={"Authorization": "Bearer faketoken"})
        assert response.status_code == 422

    def test_create_profile_bio_optional(self):
        no_bio = {k: v for k, v in VALID_PROFILE.items() if k != "bio"}
        mock_db = make_mock_db(existing_profile=None)
        app.dependency_overrides[get_db] = override_db(mock_db)
        response = client.post("/profile/", json=no_bio, headers={"Authorization": "Bearer faketoken"})
        assert response.status_code == 200

    def test_create_profile_no_auth(self):
        app.dependency_overrides.clear()
        response = client.post("/profile/", json=VALID_PROFILE)
        assert response.status_code in (401, 403)


class TestUpdateProfile:

    def test_update_profile_success(self):
        mock_profile = make_mock_profile()
        mock_db = make_mock_db(existing_profile=mock_profile)
        app.dependency_overrides[get_db] = override_db(mock_db)
        response = client.put("/profile/", json={"full_name": "Updated Name"}, headers={"Authorization": "Bearer faketoken"})
        assert response.status_code == 200

    def test_update_profile_not_found(self):
        mock_db = make_mock_db(existing_profile=None)
        app.dependency_overrides[get_db] = override_db(mock_db)
        response = client.put("/profile/", json={"full_name": "Updated Name"}, headers={"Authorization": "Bearer faketoken"})
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_update_profile_partial_fields(self):
        mock_profile = make_mock_profile()
        mock_db = make_mock_db(existing_profile=mock_profile)
        app.dependency_overrides[get_db] = override_db(mock_db)
        response = client.put("/profile/", json={"bio": "Updated bio only."}, headers={"Authorization": "Bearer faketoken"})
        assert response.status_code == 200

    def test_update_profile_invalid_birthdate(self):
        response = client.put("/profile/", json={"birthdate": "not-a-date"}, headers={"Authorization": "Bearer faketoken"})
        assert response.status_code == 422

    def test_update_profile_bio_too_long(self):
        response = client.put("/profile/", json={"bio": "x" * 501}, headers={"Authorization": "Bearer faketoken"})
        assert response.status_code == 422

    def test_update_profile_no_auth(self):
        app.dependency_overrides.clear()
        response = client.put("/profile/", json={"full_name": "Jane"})
        assert response.status_code in (401, 403)


class TestGetProfile:

    def test_get_profile_success(self):
        mock_profile = make_mock_profile()
        mock_db = make_mock_db(existing_profile=mock_profile)
        app.dependency_overrides[get_db] = override_db(mock_db)
        response = client.get("/profile/", headers={"Authorization": "Bearer faketoken"})
        assert response.status_code == 200

    def test_get_profile_not_found(self):
        mock_db = make_mock_db(existing_profile=None)
        app.dependency_overrides[get_db] = override_db(mock_db)
        response = client.get("/profile/", headers={"Authorization": "Bearer faketoken"})
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_get_profile_no_auth(self):
        app.dependency_overrides.clear()
        response = client.get("/profile/")
        assert response.status_code in (401, 403)


class TestAuth:

    def test_invalid_token(self):
        app.dependency_overrides.clear()
        with patch("backend.models.auth._get_jwks", return_value={}), \
            patch("backend.models.auth.jwt.decode", side_effect=JWTError("bad token")):
            response = client.get("/profile/", headers={"Authorization": "Bearer invalidtoken"})
        assert response.status_code == 401

    def test_token_missing_sub(self):
        app.dependency_overrides.clear()
        with patch("backend.models.auth.jwt.decode", return_value={}):
            response = client.get("/profile/", headers={"Authorization": "Bearer nosubtoken"})
        assert response.status_code == 500