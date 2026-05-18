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

The questionnaire is ordered to surface hard logistical mismatches first, then binary dealbreakers while momentum is high, then scored lifestyle questions at the end.

1. Budget range
2. Move-in timing
3. Smoking behavior and tolerance
4. Marijuana behavior and tolerance
5. Alcohol behavior and tolerance
6. Pets behavior and tolerance
7. Sleep bedtime
8. Sleep noise tolerance
9. Work/study-from-home flag
10. Noise behavior and tolerance
11. Overnight guest frequency and tolerance
12. Overnight guest hard yes/no (frequency-based, scored)
13. Cleanliness behavior and tolerance
14. Cooking behavior and tolerance
15. Conflict style behavior and tolerance
16. Cohabitation preference

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
- `study_or_wfh`
- `budget_min`
- `budget_max`
- `move_in_date`

### Lifestyle score fields

All score fields use integers from `0` to `4`.

- `sleep_behavior_score`
- `sleep_tolerance_score`
- `noise_behavior_score`
- `noise_tolerance_score`
- `guest_behavior_score`
- `guest_tolerance_score`
- `partner_stays_over` — overnight guest frequency (0 = never, 4 = several times a week)
- `ok_with_partners_staying` — overnight guest tolerance (0 = never ok, 4 = no limit)
- `clean_behavior_score`
- `clean_tolerance_score`
- `cooking_behavior_score`
- `cooking_tolerance_score`
- `conflict_behavior_score`
- `conflict_tolerance_score`
- `cohabitation_tolerance_score`

## Current scored domains

### 1. Logistics

Inputs:

- budget overlap
- move-in date gap

Scoring style:

- soft scored domain after minimum viability checks
- budget and move-in can still fail the pair as hard filters if they are not viable

Subscore weights:

- budget overlap: 50%
- move-in timing: 50%

### 2. Sleep

Questions:

- behavior: usual weeknight sleep time (time picker, converted to 0–4 score)
- tolerance: response to roommate noise at 1am

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
- if either user works or studies from home, the noise domain weight is boosted before renormalization
- boost scales with the WFH user's `noise_tolerance_score`: a fully noise-sensitive WFH user gets the full `1.25×` multiplier; a fully noise-tolerant WFH user gets no boost

### 5. Guests

Questions:

- general guest frequency behavior
- general guest tolerance
- overnight guest frequency (`partner_stays_over`, 0–4)
- overnight guest tolerance (`ok_with_partners_staying`, 0–4)

Scoring style:

- threshold-based
- domain score is the average of the general guest subscore and the overnight guest subscore

### 6. Conflict style

Questions:

- how the user raises issues
- how the user wants issues raised with them

Scoring style:

- similarity-based
- behavior similarity and tolerance similarity are averaged

### 7. Cohabitation style

Question:

- ideal amount of roommate interaction at home

Scoring style:

- similarity-based
- single similarity between the two users' preference scores

## Hard-filter rules

The backend rejects a pair if any of the following fail.

### Boolean compatibility pairs

These are symmetric. A pair fails if either person does the behavior and the other person is not okay with it.

- smoking
- marijuana
- alcohol
- pets

### Budget overlap

The pair fails if the monthly budget ranges do not overlap.

Overlap rule:

```text
max(left.budget_min, right.budget_min) <= min(left.budget_max, right.budget_max)
```

If the pair passes, budget overlap also contributes to the logistics domain. The score is the overlap divided by the narrower of the two budget ranges.

### Move-in compatibility

The questionnaire stores a single derived `move_in_date`, not a full availability range.

Current backend rule:

- pass if the absolute gap between move-in dates is `<= 90` days
- fail otherwise

If the pair passes, move-in timing also contributes to the logistics domain:

```text
move_in_score = 1 - move_in_gap_days / 90
```

## Domain formulas

### Threshold formula

Used for:

- sleep
- cleaning
- cooking
- noise
- guests (general and overnight)

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

- conflict style (paired: behavior + tolerance averaged)
- cohabitation preference (single value)

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

Note: these sum to `1.10`. The backend normalizes them to `1.0` before computing the final score.

If either user works or studies from home, the noise weight is boosted proportionally to how noise-sensitive that user is, then all weights are renormalized.

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
- `cleaning`
- `cooking`

