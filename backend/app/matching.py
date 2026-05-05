from __future__ import annotations

from datetime import date
from math import sqrt
from typing import Literal

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
    ok_with_smoking: bool
    uses_marijuana: bool
    ok_with_marijuana: bool
    drinks_alcohol: bool
    ok_with_alcohol: bool
    has_pets: bool
    ok_with_pets: bool
    partner_stays_over: bool
    ok_with_partners_staying: bool
    shares_food: bool
    ok_with_coed: bool
    study_or_wfh: bool
    preferred_age_min: int = Field(ge=18, le=120)
    preferred_age_max: int = Field(ge=18, le=120)
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
    cohabitation_behavior_score: int = Field(ge=SCORE_MIN, le=SCORE_MAX)
    cohabitation_tolerance_score: int = Field(ge=SCORE_MIN, le=SCORE_MAX)

    @model_validator(mode="after")
    def validate_ranges(self) -> "MatchPreferences":
        if self.preferred_age_max < self.preferred_age_min:
            raise ValueError("preferred_age_max must be greater than or equal to preferred_age_min")
        if self.budget_max < self.budget_min:
            raise ValueError("budget_max must be greater than or equal to budget_min")
        return self


class MatchParticipant(BaseModel):
    user_id: str | None = None
    age: int = Field(ge=18, le=120)
    gender: Literal["man", "woman"] | None = None
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
    age_compatible: bool
    coed_compatible: bool
    smoking_compatible: bool
    marijuana_compatible: bool
    alcohol_compatible: bool
    pets_compatible: bool
    guests_compatible: bool
    food_sharing_compatible: bool
    food_sharing_score: float


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


def _boolean_pair_compatible(
    left_behavior: bool,
    left_tolerance: bool,
    right_behavior: bool,
    right_tolerance: bool,
) -> bool:
    if left_behavior and not right_tolerance:
        return False
    if right_behavior and not left_tolerance:
        return False
    return True


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
    age_compatible = (
        right_p.preferred_age_min <= left.age <= right_p.preferred_age_max
        and left_p.preferred_age_min <= right.age <= left_p.preferred_age_max
    )
    coed_compatible = True
    if left.gender and right.gender and left.gender != right.gender:
        coed_compatible = left_p.ok_with_coed and right_p.ok_with_coed
    food_sharing_compatible = left_p.shares_food == right_p.shares_food

    return FilterDetails(
        budget_overlap=budget_overlap,
        budget_overlap_ratio=round(budget_overlap_ratio, 4),
        move_in_compatible=move_in_compatible,
        move_in_gap_days=move_in_gap_days,
        move_in_score=round(move_in_score, 4),
        age_compatible=age_compatible,
        coed_compatible=coed_compatible,
        smoking_compatible=_boolean_pair_compatible(
            left_p.smokes,
            left_p.ok_with_smoking,
            right_p.smokes,
            right_p.ok_with_smoking,
        ),
        marijuana_compatible=_boolean_pair_compatible(
            left_p.uses_marijuana,
            left_p.ok_with_marijuana,
            right_p.uses_marijuana,
            right_p.ok_with_marijuana,
        ),
        alcohol_compatible=_boolean_pair_compatible(
            left_p.drinks_alcohol,
            left_p.ok_with_alcohol,
            right_p.drinks_alcohol,
            right_p.ok_with_alcohol,
        ),
        pets_compatible=_boolean_pair_compatible(
            left_p.has_pets,
            left_p.ok_with_pets,
            right_p.has_pets,
            right_p.ok_with_pets,
        ),
        guests_compatible=_boolean_pair_compatible(
            left_p.partner_stays_over,
            left_p.ok_with_partners_staying,
            right_p.partner_stays_over,
            right_p.ok_with_partners_staying,
        ),
        food_sharing_compatible=food_sharing_compatible,
        food_sharing_score=1.0 if food_sharing_compatible else 0.5,
    )


def _filter_failures(details: FilterDetails) -> list[str]:
    failures: list[str] = []
    if not details.budget_overlap:
        failures.append("Budget ranges do not overlap.")
    if not details.move_in_compatible:
        failures.append("Move-in timelines are too far apart.")
    if not details.age_compatible:
        failures.append("Age preferences are not mutually compatible.")
    if not details.coed_compatible:
        failures.append("Coed living preference is not mutually compatible.")
    if not details.smoking_compatible:
        failures.append("Smoking preference is not mutually compatible.")
    if not details.marijuana_compatible:
        failures.append("Marijuana preference is not mutually compatible.")
    if not details.alcohol_compatible:
        failures.append("Alcohol preference is not mutually compatible.")
    if not details.pets_compatible:
        failures.append("Pet preference is not mutually compatible.")
    if not details.guests_compatible:
        failures.append("Overnight guest preference is not mutually compatible.")
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
        (details.budget_overlap_ratio * 0.45)
        + (details.move_in_score * 0.45)
        + (details.food_sharing_score * 0.10)
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
    guests_score = _threshold_score(
        left_p.guest_behavior_score,
        left_p.guest_tolerance_score,
        right_p.guest_behavior_score,
        right_p.guest_tolerance_score,
    )
    conflict_score = _paired_similarity_score(
        left_p.conflict_behavior_score,
        left_p.conflict_tolerance_score,
        right_p.conflict_behavior_score,
        right_p.conflict_tolerance_score,
    )
    cohabitation_score = _paired_similarity_score(
        left_p.cohabitation_behavior_score,
        left_p.cohabitation_tolerance_score,
        right_p.cohabitation_behavior_score,
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
        "food_sharing": round(details.food_sharing_score, 4),
        "cleaning": round(cleaning_score, 4),
        "cooking": round(cooking_score, 4),
    }

    weights = dict(BASE_DOMAIN_WEIGHTS)
    if left_p.study_or_wfh or right_p.study_or_wfh:
        weights["noise"] *= NOISE_WFH_MULTIPLIER

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
