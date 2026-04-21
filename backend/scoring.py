import numpy as np
from dataclasses import dataclass
from typing import Optional

@dataclass
class UserPrefs:
    user_id: str
    sleep_time_score: int
    sleep_tolerance_score: int
    clean_behavior_score: int
    clean_tolerance_score: int
    noise_behavior_score: int
    noise_tolerance_score: int
    guest_behavior_score: int
    guest_tolerance_score: int
    conflict_style: int
    smokes: bool
    ok_with_smoking: bool
    has_pets: bool
    ok_with_pets: bool
    study_or_wfh: bool
    budget_min: Optional[int]
    budget_max: Optional[int]

# Weights must sum to 1.0
# Behavior-tolerance pairs are weighted together per domain
DOMAIN_WEIGHTS = np.array([
    0.25,  # sleep
    0.25,  # cleanliness
    0.20,  # noise
    0.20,  # guests
    0.10,  # conflict style
])

def _hard_filter_pass(a: UserPrefs, b: UserPrefs) -> bool:
    """Returns False if any hard mismatch — score is 0.0, skip immediately."""
    if a.smokes and not b.ok_with_smoking:
        return False
    if b.smokes and not a.ok_with_smoking:
        return False
    if a.has_pets and not b.ok_with_pets:
        return False
    if b.has_pets and not a.ok_with_pets:
        return False
    return True

def _budget_overlap(a: UserPrefs, b: UserPrefs) -> float:
    """Returns 0.0 if ranges don't overlap, 1.0 if fully overlap, partial otherwise."""
    if not all([a.budget_min, a.budget_max, b.budget_min, b.budget_max]):
        return 1.0  # no budget data = don't penalise
    overlap_start = max(a.budget_min, b.budget_min)
    overlap_end   = min(a.budget_max, b.budget_max)
    if overlap_start > overlap_end:
        return 0.0
    overlap = overlap_end - overlap_start
    avg_range = ((a.budget_max - a.budget_min) + (b.budget_max - b.budget_min)) / 2
    return min(overlap / max(avg_range, 1), 1.0)

def _domain_score(behavior_a, tolerance_a, behavior_b, tolerance_b) -> float:
    """
    Cross-match: A's behavior vs B's tolerance, and B's behavior vs A's tolerance.
    Both must be comfortable — worst case wins (min).
    """
    max_diff = 4.0  # 1–5 scale, max possible diff

    # How compatible is A's behavior with B's tolerance?
    a_into_b = 1 - abs(behavior_a - tolerance_b) / max_diff

    # How compatible is B's behavior with A's tolerance?
    b_into_a = 1 - abs(behavior_b - tolerance_a) / max_diff

    # Use min — both people need to be comfortable
    return min(a_into_b, b_into_a)

def _conflict_score(a: int, b: int) -> float:
    """
    Conflict style: matched styles are best (both direct, both avoidant).
    But direct + moderate is fine; direct + avoid is the worst pairing.
    Max diff = 3 on a 1–4 scale.
    """
    return 1 - abs(a - b) / 3.0

def compatibility_score(a: UserPrefs, b: UserPrefs) -> dict:
    """
    Returns a dict with overall score (0.0–1.0) and per-domain breakdown.
    """
    # Step 1: hard filters
    if not _hard_filter_pass(a, b):
        return {"score": 0.0, "disqualified": True, "breakdown": {}}

    # Step 2: per-domain scores
    sleep   = _domain_score(a.sleep_time_score,     a.sleep_tolerance_score,
                            b.sleep_time_score,     b.sleep_tolerance_score)
    clean   = _domain_score(a.clean_behavior_score, a.clean_tolerance_score,
                            b.clean_behavior_score, b.clean_tolerance_score)
    noise   = _domain_score(a.noise_behavior_score, a.noise_tolerance_score,
                            b.noise_behavior_score, b.noise_tolerance_score)
    guests  = _domain_score(a.guest_behavior_score, a.guest_tolerance_score,
                            b.guest_behavior_score, b.guest_tolerance_score)
    conflict = _conflict_score(a.conflict_style, b.conflict_style)

    scores = np.array([sleep, clean, noise, guests, conflict])
    weighted = float(np.dot(scores, DOMAIN_WEIGHTS))

    # Step 3: budget multiplier (soft penalty, not a hard filter)
    budget_factor = _budget_overlap(a, b)
    final_score = round(weighted * (0.8 + 0.2 * budget_factor), 3)

    # WFH adjustment — if both WFH, noise/guest compatibility matters more
    if a.study_or_wfh and b.study_or_wfh:
        wfh_adjustment = (noise + guests) / 2 * 0.05
        final_score = round(min(final_score + wfh_adjustment, 1.0), 3)

    return {
        "score": final_score,
        "disqualified": False,
        "breakdown": {
            "sleep":    round(sleep, 3),
            "clean":    round(clean, 3),
            "noise":    round(noise, 3),
            "guests":   round(guests, 3),
            "conflict": round(conflict, 3),
            "budget":   round(budget_factor, 3),
        }
    }