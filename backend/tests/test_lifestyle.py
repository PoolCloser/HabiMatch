# test_lifestyle.py
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from uuid import uuid4
from datetime import datetime, date
from backend.app.main import app
from backend.models.auth import require_auth
from backend.models.database import get_db

client = TestClient(app, raise_server_exceptions=False)

TEST_USER_ID = str(uuid4())

VALID_LIFESTYLE = {
    "sleep_behavior_score": 5,
    "sleep_tolerance_score": 5,
    "clean_behavior_score": 7,
    "clean_tolerance_score": 6,
    "noise_behavior_score": 3,
    "noise_tolerance_score": 4,
    "guest_behavior_score": 5,
    "guest_tolerance_score": 5,
    "conflict_behavior_score": 5,
    "conflict_tolerance_score": 5,
    "cooking_behavior_score": 5,
    "cooking_tolerance_score": 5,
    "cohabitation_tolerance_score": 5,
    "smokes": False,
    "ok_with_smoking": False,
    "uses_marijuana": False,
    "ok_with_marijuana": False,
    "drinks_alcohol": False,
    "ok_with_alcohol": True,
    "has_pets": True,
    "ok_with_pets": True,
    "partner_stays_over": False,
    "ok_with_partners_staying": True,
    "study_or_wfh": True,
    "budget_min": 800,
    "budget_max": 1500,
    "move_in_date": "2024-06-01",
}

SCORE_FIELDS = [
    "sleep_behavior_score", "sleep_tolerance_score", "clean_behavior_score",
    "clean_tolerance_score", "noise_behavior_score", "noise_tolerance_score",
    "guest_behavior_score", "guest_tolerance_score", "conflict_behavior_score",
    "conflict_tolerance_score", "cooking_behavior_score", "cooking_tolerance_score",
    "cohabitation_tolerance_score",
]

BOOLEAN_FIELDS = [
    "smokes", "ok_with_smoking", "uses_marijuana", "ok_with_marijuana",
    "drinks_alcohol", "ok_with_alcohol", "has_pets", "ok_with_pets",
    "partner_stays_over", "ok_with_partners_staying", "study_or_wfh",
]

def mock_current_user():
    return {"sub": TEST_USER_ID}

def make_mock_lifestyle(**overrides):
    data = {**VALID_LIFESTYLE, **overrides}
    lifestyle = MagicMock()
    lifestyle.id = str(uuid4())
    lifestyle.user_id = TEST_USER_ID
    lifestyle.created_at = datetime(2024, 1, 1, 0, 0, 0)
    lifestyle.updated_at = datetime(2024, 1, 1, 0, 0, 0)
    lifestyle.move_in_date = date(2024, 6, 1)
    for key, value in data.items():
        setattr(lifestyle, key, value)
    return lifestyle

def make_mock_db(existing=None):
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = existing
    mock_db.refresh.side_effect = lambda obj: (
        setattr(obj, "created_at", datetime(2024, 1, 1, 0, 0, 0)),
        setattr(obj, "updated_at", datetime(2024, 1, 1, 0, 0, 0)),
        setattr(obj, "id", str(uuid4())),
        setattr(obj, "user_id", TEST_USER_ID),
    )
    return mock_db

def override_db(mock_db):
    def _override():
        yield mock_db
    return _override

@pytest.fixture(autouse=True)
def reset_overrides():
    app.dependency_overrides[require_auth] = mock_current_user
    yield
    app.dependency_overrides.clear()


class TestCreateLifestyle:

    def test_create_lifestyle_success(self):
        mock_db = make_mock_db(existing=None)
        app.dependency_overrides[get_db] = override_db(mock_db)
        response = client.post("/lifestyle/", json=VALID_LIFESTYLE, headers={"Authorization": "Bearer faketoken"})
        assert response.status_code == 200
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

    def test_create_lifestyle_all_fields_optional(self):
        mock_db = make_mock_db(existing=None)
        app.dependency_overrides[get_db] = override_db(mock_db)
        response = client.post("/lifestyle/", json={}, headers={"Authorization": "Bearer faketoken"})
        assert response.status_code == 200

    def test_create_lifestyle_already_exists(self):
        mock_lifestyle = make_mock_lifestyle()
        mock_db = make_mock_db(existing=mock_lifestyle)
        app.dependency_overrides[get_db] = override_db(mock_db)
        response = client.post("/lifestyle/", json=VALID_LIFESTYLE, headers={"Authorization": "Bearer faketoken"})
        assert response.status_code == 400
        assert "already exist" in response.json()["detail"]

    def test_create_lifestyle_no_auth(self):
        app.dependency_overrides.clear()
        response = client.post("/lifestyle/", json=VALID_LIFESTYLE)
        assert response.status_code in (401, 403)

    @pytest.mark.parametrize("field", SCORE_FIELDS)
    def test_score_field_below_minimum(self, field):
        bad_data = {**VALID_LIFESTYLE, field: 0}
        response = client.post("/lifestyle/", json=bad_data, headers={"Authorization": "Bearer faketoken"})
        assert response.status_code == 422, f"{field} should reject value 0"

    @pytest.mark.parametrize("field", SCORE_FIELDS)
    def test_score_field_above_maximum(self, field):
        bad_data = {**VALID_LIFESTYLE, field: 11}
        response = client.post("/lifestyle/", json=bad_data, headers={"Authorization": "Bearer faketoken"})
        assert response.status_code == 422, f"{field} should reject value 11"

    @pytest.mark.parametrize("field", SCORE_FIELDS)
    def test_score_field_boundary_values_valid(self, field):
        mock_db = make_mock_db(existing=None)
        app.dependency_overrides[get_db] = override_db(mock_db)
        for boundary in [1, 10]:
            data = {**VALID_LIFESTYLE, field: boundary}
            response = client.post("/lifestyle/", json=data, headers={"Authorization": "Bearer faketoken"})
            assert response.status_code == 200, f"{field}={boundary} should be valid"

    def test_budget_min_negative(self):
        bad_data = {**VALID_LIFESTYLE, "budget_min": -1}
        response = client.post("/lifestyle/", json=bad_data, headers={"Authorization": "Bearer faketoken"})
        assert response.status_code == 422

    def test_budget_max_negative(self):
        bad_data = {**VALID_LIFESTYLE, "budget_max": -1}
        response = client.post("/lifestyle/", json=bad_data, headers={"Authorization": "Bearer faketoken"})
        assert response.status_code == 422

    def test_budget_min_zero_valid(self):
        mock_db = make_mock_db(existing=None)
        app.dependency_overrides[get_db] = override_db(mock_db)
        data = {**VALID_LIFESTYLE, "budget_min": 0}
        response = client.post("/lifestyle/", json=data, headers={"Authorization": "Bearer faketoken"})
        assert response.status_code == 200

    @pytest.mark.parametrize("field", BOOLEAN_FIELDS)
    def test_boolean_fields_accept_true_and_false(self, field):
        mock_db = make_mock_db(existing=None)
        app.dependency_overrides[get_db] = override_db(mock_db)
        for val in [True, False]:
            data = {**VALID_LIFESTYLE, field: val}
            response = client.post("/lifestyle/", json=data, headers={"Authorization": "Bearer faketoken"})
            assert response.status_code == 200, f"{field}={val} should be valid"

    def test_move_in_date_valid(self):
        mock_db = make_mock_db(existing=None)
        app.dependency_overrides[get_db] = override_db(mock_db)
        data = {**VALID_LIFESTYLE, "move_in_date": "2025-01-15"}
        response = client.post("/lifestyle/", json=data, headers={"Authorization": "Bearer faketoken"})
        assert response.status_code == 200

    def test_move_in_date_invalid_format(self):
        bad_data = {**VALID_LIFESTYLE, "move_in_date": "not-a-date"}
        response = client.post("/lifestyle/", json=bad_data, headers={"Authorization": "Bearer faketoken"})
        assert response.status_code == 422


class TestUpdateLifestyle:

    def test_update_lifestyle_success(self):
        mock_lifestyle = make_mock_lifestyle()
        mock_db = make_mock_db(existing=mock_lifestyle)
        app.dependency_overrides[get_db] = override_db(mock_db)
        response = client.put("/lifestyle/", json={"clean_behavior_score": 9}, headers={"Authorization": "Bearer faketoken"})
        assert response.status_code == 200

    def test_update_lifestyle_not_found(self):
        mock_db = make_mock_db(existing=None)
        app.dependency_overrides[get_db] = override_db(mock_db)
        response = client.put("/lifestyle/", json={"clean_behavior_score": 9}, headers={"Authorization": "Bearer faketoken"})
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_update_lifestyle_partial_fields(self):
        mock_lifestyle = make_mock_lifestyle()
        mock_db = make_mock_db(existing=mock_lifestyle)
        app.dependency_overrides[get_db] = override_db(mock_db)
        response = client.put("/lifestyle/", json={"smokes": True, "budget_max": 2000}, headers={"Authorization": "Bearer faketoken"})
        assert response.status_code == 200

    def test_update_lifestyle_invalid_score(self):
        response = client.put("/lifestyle/", json={"sleep_behavior_score": 0}, headers={"Authorization": "Bearer faketoken"})
        assert response.status_code == 422

    def test_update_lifestyle_invalid_budget(self):
        response = client.put("/lifestyle/", json={"budget_min": -100}, headers={"Authorization": "Bearer faketoken"})
        assert response.status_code == 422

    def test_update_lifestyle_no_auth(self):
        app.dependency_overrides.clear()
        response = client.put("/lifestyle/", json={"smokes": True})
        assert response.status_code in (401, 403)


class TestGetLifestyle:

    def test_get_lifestyle_success(self):
        mock_lifestyle = make_mock_lifestyle()
        mock_db = make_mock_db(existing=mock_lifestyle)
        app.dependency_overrides[get_db] = override_db(mock_db)
        response = client.get("/lifestyle/", headers={"Authorization": "Bearer faketoken"})
        assert response.status_code == 200

    def test_get_lifestyle_not_found(self):
        mock_db = make_mock_db(existing=None)
        app.dependency_overrides[get_db] = override_db(mock_db)
        response = client.get("/lifestyle/", headers={"Authorization": "Bearer faketoken"})
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_get_lifestyle_no_auth(self):
        app.dependency_overrides.clear()
        response = client.get("/lifestyle/")
        assert response.status_code in (401, 403)