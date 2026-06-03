# Chore UX Notes

## Default Profile Avatars

### Problem

Skipping profile photo upload used a hardcoded HabiMatch avatar, which produced
generic initials instead of user-specific initials.

### Change

The skip flow now reads the saved `profiles.full_name`, derives initials from
the first one or two name parts, and saves a UI Avatars URL to `avatar_url`.

### Behavior

- `Jane` -> `J`
- `Jane Doe` -> `JD`
- `Jane Marie Doe` -> `JM`
- Blank or missing name -> `H`

### Files

- `mobile/src/screens/ProfilePhotoScreen.tsx`
- `backend/tests/test_profile_photo_contract.py`

### Validation

- `npx tsc --noEmit`
- Direct Python execution of `backend/tests/test_profile_photo_contract.py`

## Roommate Feed Swipe UX

### Goal

Replace the visible X/check action buttons with physical card swipes:

- Swipe left to skip a profile.
- Swipe right to like a profile.
- Pull down on the feed to refresh rankings.

### Existing Logic To Reuse

- `loadRankings` already loads profile data, questionnaire preferences,
  previous discovery decisions, and compatibility-ranked matches.
- `handleDiscoveryDecision` already writes `like` or `dislike` to
  `discovery_decisions`, checks for mutual matches on likes, and removes the
  decided profile from the local feed.

The swipe implementation should call these existing functions instead of adding
new database write paths.

### Planned Interaction

The top match card should be wrapped in an animated gesture container. As the
user drags horizontally, the card physically moves with the finger and rotates
slightly.

Directional feedback should appear while dragging:

- Dragging left fades in an X icon on the left side of the card area.
- Dragging right fades in a checkmark icon on the right side of the card area.

On release:

- Past the left threshold, animate the card offscreen and submit `dislike`.
- Past the right threshold, animate the card offscreen and submit `like`.
- Below the threshold, spring the card back to center.

If saving the decision fails, the card should return to center and show the
existing decision error message.

### Pull-To-Refresh

The feed should remove the visible Refresh button and attach React Native's
`RefreshControl` to the feed `ScrollView`.

Pull refresh should call `loadRankings`, but use a separate refreshing state so
the feed does not flash back to the initial full-screen scoring state during a
manual refresh.

### Implementation Notes

- Use React Native `Animated` and `PanResponder`; no extra gesture dependency is
  required for this screen.
- Keep `savingDecision` as the guard against double submissions.
- Consider passing the swiped match into `handleDiscoveryDecision` to avoid
  stale `topMatch` references during animation cleanup.

### Validation

- `npx tsc --noEmit`
- Manual swipe left/right on the feed.
- Manual pull-to-refresh on the feed.
- Confirm mutual-match notice still appears after a right swipe creates a match.
