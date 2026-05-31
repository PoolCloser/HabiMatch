from __future__ import annotations

from datetime import date
from math import sqrt
from pydantic import BaseModel, Field, model_validator

SCORE_MIN = 0
SCORE_MAX = 4
MOVE_IN_MAX_GAP_DAYS = 90
NOISE_WFH_MULTIPLIER = 1.25

BASE_DOMAIN_WEIGHTS = {
    "logistics": 0.10,
    "sleep": 0.20,
    "cleanliness": 0.20,
    "noise": 0.15,
    "guests": 0.15,
    "cohabitation": 0.20,
    "conflict": 0.10,
}


class MatchPreferences(BaseModel):
    smokes: bool
    ok_with_smoking: bool | None = None
    uses_marijuana: bool
    ok_with_marijuana: bool | None = None
    drinks_alcohol: bool
    ok_with_alcohol: bool | None = None
    has_pets: bool
    ok_with_pets: bool | None = None
    partner_stays_over: int = Field(ge=SCORE_MIN, le=SCORE_MAX)
    ok_with_partners_staying: int = Field(ge=SCORE_MIN, le=SCORE_MAX)
    study_or_wfh: bool
    budget_min: int = Field(ge=0)
    budget_max: int = Field(ge=0)
    move_in_date: date
    sleep_behavior_score: int = Field(ge=SCORE_MIN, le=SCORE_MAX)
    sleep_tolerance_score: int = Field(ge=SCORE_MIN, le=SCORE_MAX)
    clean_behavior_score: int = Field(ge=SCORE_MIN, le=SCORE_MAX)
    clean_tolerance_score: int = Field(ge=SCORE_MIN, le=SCORE_MAX)
    cooking_behavior_score: int = Field(ge=SCORE_MIN, le=SCORE_MAX)
    cooking_tolerance_score: int = Field(ge=SCORE_MIN, le=SCORE_MAX)
    noise_behavior_score: int = Field(ge=SCORE_MIN, le=SCORE_MAX)
    noise_tolerance_score: int = Field(ge=SCORE_MIN, le=SCORE_MAX)
    guest_behavior_score: int = Field(ge=SCORE_MIN, le=SCORE_MAX)
    guest_tolerance_score: int = Field(ge=SCORE_MIN, le=SCORE_MAX)
    conflict_behavior_score: int = Field(ge=SCORE_MIN, le=SCORE_MAX)
    conflict_tolerance_score: int = Field(ge=SCORE_MIN, le=SCORE_MAX)
    cohabitation_tolerance_score: int = Field(ge=SCORE_MIN, le=SCORE_MAX)

    @model_validator(mode="after")
    def validate_ranges(self) -> "MatchPreferences":
        if self.budget_max < self.budget_min:
            raise ValueError("budget_max must be greater than or equal to budget_min")
        return self


class MatchParticipant(BaseModel):
    user_id: str | None = None
    preferences: MatchPreferences


class CompatibilityRequest(BaseModel):
    left: MatchParticipant
    right: MatchParticipant


class FilterDetails(BaseModel):
    budget_overlap: bool
    budget_overlap_ratio: float
    move_in_compatible: bool
    move_in_gap_days: int
    move_in_score: float
    smoking_compatible: bool
    marijuana_compatible: bool
    alcohol_compatible: bool
    pets_compatible: bool


class CompatibilityResponse(BaseModel):
    passed_filters: bool
    overall_score: float
    failures: list[str]
    filter_details: FilterDetails
    weights: dict[str, float]
    domains: dict[str, float]
    subdomains: dict[str, float]


def _clamp_unit(value: float) -> float:
    return max(0.0, min(1.0, value))


def _threshold_score(
    left_behavior: int,
    left_tolerance: int,
    right_behavior: int,
    right_tolerance: int,
) -> float:
    left_fit = _directional_tolerance_fit(right_behavior, left_tolerance)
    right_fit = _directional_tolerance_fit(left_behavior, right_tolerance)
    return _clamp_unit(sqrt(left_fit * right_fit))


def _directional_tolerance_fit(behavior: int, tolerance: int) -> float:
    gap = max(0, behavior - tolerance)
    return _clamp_unit(1 - (gap / SCORE_MAX))


def _similarity_score(left_value: int, right_value: int) -> float:
    return _clamp_unit(1 - (abs(left_value - right_value) / 4))


def _paired_similarity_score(
    left_behavior: int,
    left_tolerance: int,
    right_behavior: int,
    right_tolerance: int,
) -> float:
    return (
        _similarity_score(left_behavior, right_behavior)
        + _similarity_score(left_tolerance, right_tolerance)
    ) / 2


def _overlap_ratio(min_a: int, max_a: int, min_b: int, max_b: int) -> float:
    overlap = max(0, min(max_a, max_b) - max(min_a, min_b))
    smaller_range = max(min(max_a - min_a, max_b - min_b), 1)
    return _clamp_unit(overlap / smaller_range)


def _move_in_score(gap_days: int) -> float:
    return _clamp_unit(1 - (gap_days / MOVE_IN_MAX_GAP_DAYS))


def _build_filter_details(left: MatchParticipant, right: MatchParticipant) -> FilterDetails:
    left_p = left.preferences
    right_p = right.preferences
    budget_overlap = max(left_p.budget_min, right_p.budget_min) <= min(left_p.budget_max, right_p.budget_max)
    budget_overlap_ratio = _overlap_ratio(
        left_p.budget_min,
        left_p.budget_max,
        right_p.budget_min,
        right_p.budget_max,
    )
    move_in_gap_days = abs((left_p.move_in_date - right_p.move_in_date).days)
    move_in_compatible = move_in_gap_days <= MOVE_IN_MAX_GAP_DAYS
    move_in_score = _move_in_score(move_in_gap_days)
    return FilterDetails(
        budget_overlap=budget_overlap,
        budget_overlap_ratio=round(budget_overlap_ratio, 4),
        move_in_compatible=move_in_compatible,
        move_in_gap_days=move_in_gap_days,
        move_in_score=round(move_in_score, 4),
        smoking_compatible=True,
        marijuana_compatible=True,
        alcohol_compatible=True,
        pets_compatible=True,
    )


def _filter_failures(details: FilterDetails) -> list[str]:
    failures: list[str] = []
    if not details.budget_overlap:
        failures.append("Budget ranges do not overlap.")
    if not details.move_in_compatible:
        failures.append("Move-in timelines are too far apart.")
    return failures


def calculate_compatibility(left: MatchParticipant, right: MatchParticipant) -> CompatibilityResponse:
    details = _build_filter_details(left, right)
    failures = _filter_failures(details)
    if failures:
        return CompatibilityResponse(
            passed_filters=False,
            overall_score=0.0,
            failures=failures,
            filter_details=details,
            weights={key: round(value, 4) for key, value in BASE_DOMAIN_WEIGHTS.items()},
            domains={key: 0.0 for key in BASE_DOMAIN_WEIGHTS},
            subdomains={},
        )

    left_p = left.preferences
    right_p = right.preferences

    logistics_score = (
        (details.budget_overlap_ratio * 0.50)
        + (details.move_in_score * 0.50)
    )
    sleep_score = _threshold_score(
        left_p.sleep_behavior_score,
        left_p.sleep_tolerance_score,
        right_p.sleep_behavior_score,
        right_p.sleep_tolerance_score,
    )
    cleaning_score = _threshold_score(
        left_p.clean_behavior_score,
        left_p.clean_tolerance_score,
        right_p.clean_behavior_score,
        right_p.clean_tolerance_score,
    )
    cooking_score = _threshold_score(
        left_p.cooking_behavior_score,
        left_p.cooking_tolerance_score,
        right_p.cooking_behavior_score,
        right_p.cooking_tolerance_score,
    )
    cleanliness_score = (cleaning_score + cooking_score) / 2
    noise_score = _threshold_score(
        left_p.noise_behavior_score,
        left_p.noise_tolerance_score,
        right_p.noise_behavior_score,
        right_p.noise_tolerance_score,
    )
    general_guests_score = _threshold_score(
        left_p.guest_behavior_score,
        left_p.guest_tolerance_score,
        right_p.guest_behavior_score,
        right_p.guest_tolerance_score,
    )
    overnight_score = _threshold_score(
        left_p.partner_stays_over,
        left_p.ok_with_partners_staying,
        right_p.partner_stays_over,
        right_p.ok_with_partners_staying,
    )
    guests_score = (general_guests_score + overnight_score) / 2
    conflict_score = _paired_similarity_score(
        left_p.conflict_behavior_score,
        left_p.conflict_tolerance_score,
        right_p.conflict_behavior_score,
        right_p.conflict_tolerance_score,
    )
    cohabitation_score = _similarity_score(
        left_p.cohabitation_tolerance_score,
        right_p.cohabitation_tolerance_score,
    )

    domains = {
        "logistics": round(logistics_score, 4),
        "sleep": round(sleep_score, 4),
        "cleanliness": round(cleanliness_score, 4),
        "noise": round(noise_score, 4),
        "guests": round(guests_score, 4),
        "cohabitation": round(cohabitation_score, 4),
        "conflict": round(conflict_score, 4),
    }
    subdomains = {
        "budget": round(details.budget_overlap_ratio, 4),
        "move_in": round(details.move_in_score, 4),
        "cleaning": round(cleaning_score, 4),
        "cooking": round(cooking_score, 4),
    }

    weights = dict(BASE_DOMAIN_WEIGHTS)
    wfh_sensitivity = max(
        (SCORE_MAX - left_p.noise_tolerance_score) / SCORE_MAX if left_p.study_or_wfh else 0,
        (SCORE_MAX - right_p.noise_tolerance_score) / SCORE_MAX if right_p.study_or_wfh else 0,
    )
    weights["noise"] *= 1 + (NOISE_WFH_MULTIPLIER - 1) * wfh_sensitivity

    total_weight = sum(weights.values())
    normalized_weights = {
        key: round(value / total_weight, 4)
        for key, value in weights.items()
    }

    overall = sum(domains[key] * normalized_weights[key] for key in domains)

    return CompatibilityResponse(
        passed_filters=True,
        overall_score=round(overall, 4),
        failures=[],
        filter_details=details,
        weights=normalized_weights,
        domains=domains,
        subdomains=subdomains,
    )
