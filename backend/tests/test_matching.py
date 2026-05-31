from copy import deepcopy


def _participant(**overrides):
    participant = {
        "user_id": "user-1",
        "preferences": {
            "smokes": False,
            "ok_with_smoking": False,
            "uses_marijuana": False,
            "ok_with_marijuana": False,
            "drinks_alcohol": True,
            "ok_with_alcohol": True,
            "has_pets": False,
            "ok_with_pets": True,
            "partner_stays_over": 1,
            "ok_with_partners_staying": 2,
            "study_or_wfh": False,
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
        preferences={
            "budget_min": 2000,
            "budget_max": 2400,
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
    assert body["failures"] == ["Budget ranges do not overlap."]


def test_matching_accepts_lifestyle_answers_without_tolerances(client, make_token):
    left = _participant()
    right = _participant(
        user_id="user-2",
        preferences={
            "smokes": True,
            "uses_marijuana": True,
            "drinks_alcohol": True,
            "has_pets": True,
            "ok_with_smoking": None,
            "ok_with_marijuana": None,
            "ok_with_alcohol": None,
            "ok_with_pets": None,
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
    assert body["filter_details"]["smoking_compatible"] is True
    assert body["filter_details"]["marijuana_compatible"] is True
    assert body["filter_details"]["alcohol_compatible"] is True
    assert body["filter_details"]["pets_compatible"] is True


def test_matching_returns_weighted_domain_breakdown(client, make_token):
    left = _participant()
    right = _participant(
        user_id="user-2",
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
    assert set(body["subdomains"].keys()) == {"budget", "move_in", "cleaning", "cooking"}
    assert body["filter_details"]["budget_overlap"] is True
    assert body["filter_details"]["move_in_compatible"] is True
    assert 0 < body["subdomains"]["budget"] < 1
    assert 0 < body["subdomains"]["move_in"] < 1
    assert 0 < body["domains"]["logistics"] < 1


def test_matching_boosts_noise_weight_for_noise_sensitive_wfh(client, make_token):
    left = _participant(preferences={"study_or_wfh": True, "noise_tolerance_score": 0})
    right = _participant(user_id="user-2")

    body = client.post(
        "/matching/compatibility",
        json={"left": left, "right": right},
        headers={"Authorization": f"Bearer {make_token()}"},
    ).json()

    base_noise_weight = client.post(
        "/matching/compatibility",
        json={"left": _participant(), "right": right},
        headers={"Authorization": f"Bearer {make_token()}"},
    ).json()["weights"]["noise"]

    assert body["passed_filters"] is True
    assert body["weights"]["noise"] > base_noise_weight


def test_matching_no_noise_boost_for_noise_tolerant_wfh(client, make_token):
    left = _participant(preferences={"study_or_wfh": True, "noise_tolerance_score": 4})
    right = _participant(user_id="user-2")

    body = client.post(
        "/matching/compatibility",
        json={"left": left, "right": right},
        headers={"Authorization": f"Bearer {make_token()}"},
    ).json()

    base_noise_weight = client.post(
        "/matching/compatibility",
        json={"left": _participant(), "right": right},
        headers={"Authorization": f"Bearer {make_token()}"},
    ).json()["weights"]["noise"]

    assert body["passed_filters"] is True
    assert body["weights"]["noise"] == base_noise_weight


def test_matching_threshold_score_penalizes_one_sided_severe_mismatch(client, make_token):
    left = _participant(preferences={"noise_behavior_score": 0, "noise_tolerance_score": 0})
    right = _participant(
        user_id="user-2",
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
