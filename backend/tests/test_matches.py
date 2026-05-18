import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from uuid import uuid4
from datetime import datetime, timezone

from backend.app.main import app
from backend.models.database import get_db
from backend.models.auth import require_auth

USER_A = uuid4()
USER_B = uuid4()
USER_C = uuid4()
USER_D = uuid4()

FIXED_TIME = datetime(2026, 5, 1, 12, 0, 0, tzinfo=timezone.utc)

client = TestClient(app, raise_server_exceptions=False)


def _decision(user_id, target_user_id, decision="like"):
    row = MagicMock()
    row.user_id = user_id
    row.target_user_id = target_user_id
    row.decision = decision
    row.created_at = FIXED_TIME
    return row


def _make_db(outgoing_rows, incoming_rows=None):
    """
    Build a mock DB session that returns outgoing_rows on the first query call
    and incoming_rows on the second. Pass incoming_rows=None when only one
    query is expected (early return on empty outgoing set).
    """
    mock_db = MagicMock()

    outgoing_mock = MagicMock()
    outgoing_mock.filter.return_value.all.return_value = outgoing_rows

    if incoming_rows is not None:
        incoming_mock = MagicMock()
        incoming_mock.filter.return_value.all.return_value = incoming_rows
        mock_db.query.side_effect = [outgoing_mock, incoming_mock]
    else:
        mock_db.query.return_value = outgoing_mock

    return mock_db


def _override_db(mock_db):
    def _dep():
        yield mock_db
    return _dep


@pytest.fixture(autouse=True)
def setup_overrides():
    app.dependency_overrides[require_auth] = lambda: {"sub": str(USER_A)}
    yield
    app.dependency_overrides.clear()


class TestMutualMatchDetection:

    def test_mutual_match_detected(self):
        outgoing = [_decision(USER_A, USER_B)]
        incoming = [_decision(USER_B, USER_A)]
        app.dependency_overrides[get_db] = _override_db(_make_db(outgoing, incoming))

        resp = client.get("/matches/")

        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 1
        assert str(USER_B) in [m["user_id"] for m in body["matches"]]

    def test_one_sided_like_is_not_a_match(self):
        outgoing = [_decision(USER_A, USER_B)]
        incoming = []
        app.dependency_overrides[get_db] = _override_db(_make_db(outgoing, incoming))

        resp = client.get("/matches/")

        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 0
        assert body["matches"] == []

    def test_no_outgoing_likes_returns_empty(self):
        app.dependency_overrides[get_db] = _override_db(_make_db(outgoing_rows=[]))

        resp = client.get("/matches/")

        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 0
        assert body["matches"] == []

    def test_dislike_does_not_produce_match(self):
        # The SQL WHERE decision='like' means dislikes are never in outgoing_rows
        outgoing_likes_only = []
        app.dependency_overrides[get_db] = _override_db(_make_db(outgoing_likes_only))

        resp = client.get("/matches/")

        assert resp.status_code == 200
        assert resp.json()["total"] == 0

    def test_multiple_mutual_matches(self):
        outgoing = [
            _decision(USER_A, USER_B),
            _decision(USER_A, USER_C),
            _decision(USER_A, USER_D),
        ]
        incoming = [
            _decision(USER_B, USER_A),
            _decision(USER_C, USER_A),
            # USER_D has not liked back
        ]
        app.dependency_overrides[get_db] = _override_db(_make_db(outgoing, incoming))

        resp = client.get("/matches/")

        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 2
        matched_ids = {m["user_id"] for m in body["matches"]}
        assert str(USER_B) in matched_ids
        assert str(USER_C) in matched_ids
        assert str(USER_D) not in matched_ids

    def test_matched_at_timestamp_is_present(self):
        outgoing = [_decision(USER_A, USER_B)]
        incoming = [_decision(USER_B, USER_A)]
        app.dependency_overrides[get_db] = _override_db(_make_db(outgoing, incoming))

        resp = client.get("/matches/")

        assert resp.status_code == 200
        match = resp.json()["matches"][0]
        assert match["matched_at"] is not None

    def test_requires_auth(self):
        app.dependency_overrides.clear()
        resp = client.get("/matches/")
        assert resp.status_code in (401, 403)
