# HabiMatch Questionnaire and Matching

This document is the current reference for:

- how the mobile questionnaire is ordered
- which fields are collected
- how the backend compatibility score is computed

It is intended to match the code in:

- `mobile/src/screens/QuestionnaireScreen.tsx`
- `backend/app/matching.py`

## Core idea

HabiMatch collects two kinds of signal:

- hard filters: housing constraints and dealbreakers that can eliminate a pair immediately
- compatibility scores: logistics fit plus lifestyle behavior and tolerance values on a `0..4` scale

The backend first checks hard filters. If a pair fails any hard filter, the match score is `0.0`.
If they pass, the backend computes scored domains and combines them with fixed weights.

## Current onboarding order

The questionnaire is ordered for lower-friction onboarding while still surfacing strong dealbreakers early.

1. Move-in timing
2. Smoking behavior and tolerance
3. Marijuana behavior and tolerance
4. Alcohol behavior and tolerance
5. Pets behavior and tolerance
6. Overnight guest behavior and tolerance
7. Coed preference
8. Food-sharing expectation
9. Budget range
10. Preferred roommate age range
11. Work/study-from-home flag
12. Lifestyle scoring questions

The first section is intentionally heavy on quick tap-based questions before numeric inputs.

## Stored fields

### Hard filters and logistics

- `smokes`
- `ok_with_smoking`
- `uses_marijuana`
- `ok_with_marijuana`
- `drinks_alcohol`
- `ok_with_alcohol`
- `has_pets`
- `ok_with_pets`
- `partner_stays_over`
- `ok_with_partners_staying`
- `shares_food`
- `ok_with_coed`
- `study_or_wfh`
- `preferred_age_min`
- `preferred_age_max`
- `budget_min`
- `budget_max`
- `move_in_date`

### Lifestyle score fields

All score fields use integers from `0` to `4`.

- `sleep_behavior_score`
- `sleep_tolerance_score`
- `clean_behavior_score`
- `clean_tolerance_score`
- `cooking_behavior_score`
- `cooking_tolerance_score`
- `noise_behavior_score`
- `noise_tolerance_score`
- `guest_behavior_score`
- `guest_tolerance_score`
- `conflict_behavior_score`
- `conflict_tolerance_score`
- `cohabitation_behavior_score`
- `cohabitation_tolerance_score`

## Current scored domains

### 1. Logistics

Inputs:

- budget overlap
- move-in date gap
- food-sharing expectation match

Scoring style:

- soft scored domain after minimum viability checks
- budget and move-in can still fail the pair if they are not viable
- food sharing is only a soft preference signal

Subscore weights:

- budget overlap: 45%
- move-in timing: 45%
- food sharing: 10%

### 2. Sleep

Questions:

- behavior: usual weeknight sleep time
- tolerance: response to noise at 1am

Scoring style:

- threshold-based

### 3. Cleanliness

Questions:

- cleaning behavior
- cleaning tolerance
- cooking behavior
- cooking tolerance

Scoring style:

- threshold-based
- implemented as the average of:
  - cleaning subscore
  - cooking subscore

### 4. Noise

Questions:

- daytime apartment noise level
- tolerance for roommate noise while focusing

Scoring style:

- threshold-based
- if either user answers `study_or_wfh = true`, the noise domain weight is increased by 25% before weights are renormalized

### 5. Guests

Questions:

- guest frequency behavior
- tolerance for frequent roommate guests

Scoring style:

- threshold-based

### 6. Conflict style

Questions:

- how the user raises issues
- how the user wants issues raised with them

Scoring style:

- similarity-based
- behavior similarity and tolerance similarity are averaged

### 7. Cohabitation style

Questions:

- typical roommate interaction behavior
- ideal amount of roommate interaction at home

Scoring style:

- similarity-based
- behavior similarity and preference similarity are averaged

## Hard-filter rules

The backend rejects a pair if any of the following fail.

### Boolean compatibility pairs

These are symmetric. A pair fails if either person does the behavior and the other person is not okay with it.

- smoking
- marijuana
- alcohol
- pets
- overnight guests

### Budget overlap

The pair fails if the monthly budget ranges do not overlap.

Overlap rule:

```text
max(left.budget_min, right.budget_min) <= min(left.budget_max, right.budget_max)
```

If the pair passes, budget overlap also contributes to the logistics domain. The score is the overlap divided by the narrower of the two budget ranges.

### Move-in compatibility

The questionnaire currently stores a single derived `move_in_date`, not a full availability range.

Current backend rule:

- pass if the absolute gap between move-in dates is `<= 90` days
- fail otherwise

If the pair passes, move-in timing also contributes to the logistics domain:

```text
move_in_score = 1 - move_in_gap_days / 90
```

### Food sharing

Food sharing is no longer a hard filter.

- if both people answer the same way, `food_sharing_score = 1.0`
- if their expectations differ, `food_sharing_score = 0.5`

This lets food expectations affect ranking without disqualifying otherwise strong matches.

### Age preference compatibility

The pair fails unless:

- left age is inside right preferred age range
- right age is inside left preferred age range

### Coed compatibility

Current backend rule:

- if genders differ, both people must have `ok_with_coed = true`
- if genders match, the pair passes this filter
- if gender is unavailable for either user, this filter is not enforced

## Domain formulas

### Threshold formula

Used for:

- sleep
- cleaning
- cooking
- noise
- guests

Formula:

```text
left_fit  = 1 - max(0, right_behavior - left_tolerance) / 4
right_fit = 1 - max(0, left_behavior - right_tolerance) / 4
score     = sqrt(left_fit * right_fit)
```

The result is clamped to `0.0..1.0`.

Interpretation:

- `1.0` means both people can comfortably live with each other's level
- a severe one-sided mismatch can pull the domain near zero instead of being averaged away

### Similarity formula

Used for:

- conflict behavior
- conflict tolerance
- cohabitation behavior
- cohabitation preference

Single-value similarity:

```text
score = 1 - abs(left_value - right_value) / 4
```

Paired similarity:

```text
behavior_similarity  = 1 - abs(left_behavior - right_behavior) / 4
tolerance_similarity = 1 - abs(left_tolerance - right_tolerance) / 4
score = (behavior_similarity + tolerance_similarity) / 2
```

The result is clamped to `0.0..1.0`.

## Domain weights

Base weights:

| Domain | Weight |
|--------|--------|
| Logistics | 0.10 |
| Sleep | 0.20 |
| Cleanliness | 0.20 |
| Noise | 0.15 |
| Guests | 0.15 |
| Cohabitation | 0.20 |
| Conflict | 0.10 |

If either user works or studies from home:

- noise weight is multiplied by `1.25`
- all weights are then renormalized so they still sum to `1.0`

## Final score

If any hard filter fails:

```text
overall_score = 0.0
```

Otherwise:

```text
overall_score = sum(domain_score * normalized_weight)
```

The backend returns:

- `passed_filters`
- `overall_score`
- `failures`
- `filter_details`
- `weights`
- `domains`
- `subdomains`

`subdomains` currently includes:

- `budget`
- `move_in`
- `food_sharing`
- `cleaning`
- `cooking`

## Notes on current implementation gaps

The following are intentionally documented as current-state tradeoffs:

- `move_in_date` is matched by date-gap threshold because the current questionnaire stores a single target date, not a true range
- `shares_food` is a soft preference because the current questionnaire does not capture a separate tolerance field

If the questionnaire expands later, these are the main places where the matching model can become more expressive without rewriting the whole scoring pipeline.
