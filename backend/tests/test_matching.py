from copy import deepcopy


def _participant(**overrides):
    participant = {
        "user_id": "user-1",
        "age": 24,
        "gender": "woman",
        "preferences": {
            "smokes": False,
            "ok_with_smoking": False,
            "uses_marijuana": False,
            "ok_with_marijuana": False,
            "drinks_alcohol": True,
            "ok_with_alcohol": True,
            "has_pets": False,
            "ok_with_pets": True,
            "partner_stays_over": False,
            "ok_with_partners_staying": True,
            "shares_food": False,
            "ok_with_coed": True,
            "study_or_wfh": False,
            "preferred_age_min": 21,
            "preferred_age_max": 30,
            "budget_min": 1200,
            "budget_max": 1800,
            "move_in_date": "2026-06-01",
            "sleep_behavior_score": 2,
            "sleep_tolerance_score": 2,
            "clean_behavior_score": 1,
            "clean_tolerance_score": 2,
            "cooking_behavior_score": 2,
            "cooking_tolerance_score": 2,
            "noise_behavior_score": 1,
            "noise_tolerance_score": 2,
            "guest_behavior_score": 1,
            "guest_tolerance_score": 2,
            "conflict_behavior_score": 2,
            "conflict_tolerance_score": 2,
            "cohabitation_behavior_score": 2,
            "cohabitation_tolerance_score": 2,
        },
    }
    merged = deepcopy(participant)
    for key, value in overrides.items():
        if key == "preferences":
            merged["preferences"].update(value)
        else:
            merged[key] = value
    return merged


def test_matching_requires_auth(client):
    payload = {"left": _participant(), "right": _participant(user_id="user-2")}
    assert client.post("/matching/compatibility", json=payload).status_code == 403


def test_matching_hard_filter_failure_returns_zero_score(client, make_token):
    left = _participant()
    right = _participant(
        user_id="user-2",
        gender="man",
        preferences={
            "smokes": True,
            "ok_with_coed": False,
        },
    )

    response = client.post(
        "/matching/compatibility",
        json={"left": left, "right": right},
        headers={"Authorization": f"Bearer {make_token()}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["passed_filters"] is False
    assert body["overall_score"] == 0.0
    assert "Smoking preference is not mutually compatible." in body["failures"]
    assert "Coed living preference is not mutually compatible." in body["failures"]


def test_matching_returns_weighted_domain_breakdown(client, make_token):
    left = _participant()
    right = _participant(
        user_id="user-2",
        age=26,
        preferences={
            "budget_min": 1400,
            "budget_max": 2000,
            "move_in_date": "2026-06-20",
            "sleep_behavior_score": 3,
            "sleep_tolerance_score": 3,
            "clean_behavior_score": 2,
            "clean_tolerance_score": 3,
            "cooking_behavior_score": 3,
            "cooking_tolerance_score": 3,
            "noise_behavior_score": 2,
            "noise_tolerance_score": 2,
            "guest_behavior_score": 2,
            "guest_tolerance_score": 3,
            "conflict_behavior_score": 3,
            "conflict_tolerance_score": 3,
            "cohabitation_tolerance_score": 3,
        },
    )

    response = client.post(
        "/matching/compatibility",
        json={"left": left, "right": right},
        headers={"Authorization": f"Bearer {make_token()}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["passed_filters"] is True
    assert body["overall_score"] > 0
    assert set(body["domains"].keys()) == {
        "logistics",
        "sleep",
        "cleanliness",
        "noise",
        "guests",
        "cohabitation",
        "conflict",
    }
    assert set(body["subdomains"].keys()) == {"budget", "move_in", "food_sharing", "cleaning", "cooking"}
    assert body["filter_details"]["budget_overlap"] is True
    assert body["filter_details"]["move_in_compatible"] is True
    assert 0 < body["subdomains"]["budget"] < 1
    assert 0 < body["subdomains"]["move_in"] < 1
    assert 0 < body["domains"]["logistics"] < 1


def test_matching_boosts_noise_weight_for_work_from_home(client, make_token):
    left = _participant(preferences={"study_or_wfh": True})
    right = _participant(user_id="user-2", age=25)

    response = client.post(
        "/matching/compatibility",
        json={"left": left, "right": right},
        headers={"Authorization": f"Bearer {make_token()}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["passed_filters"] is True
    assert body["weights"]["noise"] > 0.15


def test_matching_food_sharing_mismatch_is_soft_penalty(client, make_token):
    left = _participant(preferences={"shares_food": False})
    right = _participant(user_id="user-2", age=25, preferences={"shares_food": True})

    response = client.post(
        "/matching/compatibility",
        json={"left": left, "right": right},
        headers={"Authorization": f"Bearer {make_token()}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["passed_filters"] is True
    assert body["filter_details"]["food_sharing_compatible"] is False
    assert body["subdomains"]["food_sharing"] == 0.5
    assert body["failures"] == []


def test_matching_threshold_score_penalizes_one_sided_severe_mismatch(client, make_token):
    left = _participant(preferences={"noise_behavior_score": 0, "noise_tolerance_score": 0})
    right = _participant(
        user_id="user-2",
        age=25,
        preferences={"noise_behavior_score": 4, "noise_tolerance_score": 4},
    )

    response = client.post(
        "/matching/compatibility",
        json={"left": left, "right": right},
        headers={"Authorization": f"Bearer {make_token()}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["passed_filters"] is True
    assert body["domains"]["noise"] == 0.0
