def test_health_no_auth(client):
    assert client.get("/health").status_code == 200


def test_protected_no_token(client):
    # HTTPBearer returns 403 when Authorization header is missing entirely
    assert client.get("/protected").status_code == 403


def test_protected_valid_token(client, make_token):
    response = client.get("/protected", headers={"Authorization": f"Bearer {make_token()}"})
    assert response.status_code == 200
    assert response.json()["user_id"] == "user-123"


def test_protected_expired_token(client, make_token):
    response = client.get("/protected", headers={"Authorization": f"Bearer {make_token(exp_offset=-1)}"})
    assert response.status_code == 401


def test_protected_invalid_signature(client, make_token):
    tampered = make_token() + "bad"
    response = client.get("/protected", headers={"Authorization": f"Bearer {tampered}"})
    assert response.status_code == 401


def test_protected_wrong_audience(client, make_token):
    response = client.get("/protected", headers={"Authorization": f"Bearer {make_token(aud='wrong')}"})
    assert response.status_code == 401


def test_feed_no_token(client):
    # The feed is user-specific, so it should reject requests without an auth token.
    assert client.get("/feed").status_code == 403


def test_feed_valid_token(client, make_token):
    # Verifies the temporary mock feed response shape the mobile feed can render against.
    response = client.get("/feed", headers={"Authorization": f"Bearer {make_token()}"})

    assert response.status_code == 200
    data = response.json()
    assert "suggestions" in data
    assert len(data["suggestions"]) > 0
    assert data["suggestions"][0]["id"]
    assert data["suggestions"][0]["full_name"]
