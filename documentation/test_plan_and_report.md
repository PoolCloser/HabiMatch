# Test Plan and Report

**Product name:** HabiMatch  
**Team name:** HabiMatch Team  
**Release version:** HabiMatch 1.0 MVP  
**Date:** May 27, 2026

## Document Purpose

This test plan and report documents the system-level test scenarios and
automated tests used to evaluate the HabiMatch 1.0 MVP release. The scenarios
are tied to the user stories and acceptance criteria in
`documentation/release_summary.md`, with implementation expectations drawn from
`documentation/product_design.md`.

## Test Environment

| Area | Environment |
|---|---|
| Backend | FastAPI backend tested with `pytest` from `backend/.venv` |
| Mobile | Expo/React Native TypeScript code tested with `npm test` in `mobile/` |
| Database/Auth | Supabase-backed production behavior; most automated backend tests use mocks or contract checks |
| Test date | June 2, 2026 |

## System Test Scenarios

### Scenario 1: Register a New User (Pass)

**Related user story:** User Story 1, User Registration.

**Preconditions:**

- Supabase environment variables are configured.
- The email address is not already registered.
- The mobile app is opened from a signed-out state.

**Steps:**

1. Open HabiMatch.
2. Select the Register action from the Login screen.
3. Enter `new-user@example.com` in the email field.
4. Enter `HabiMatchPass9` in the password field.
5. Enter `HabiMatchPass9` in the confirm password field.
6. Press `Create Account`.

**Expected output:**

- The app creates the account or displays the configured email confirmation
  message.
- If Supabase returns a session immediately, the user proceeds into onboarding.
- No raw Supabase error text is shown for known auth errors.

**Release result:** Pass. Auth error mapping is covered by mobile automated
tests, and backend protected route authentication is covered by backend tests.

### Scenario 2: Reject Invalid Registration Input (Pass)

**Related user story:** User Story 1, User Registration.

**Steps:**

1. Open Register.
2. Enter `bad-email` in the email field.
3. Enter `short` in the password field.
4. Enter `different` in the confirm password field.
5. Press `Create Account`.

**Expected output:**

- The app prevents or rejects invalid registration data.
- The user sees a friendly error for invalid credentials, duplicate account,
  disabled sign-up, or password requirement failures.

**Release result:** Pass. Mobile tests cover friendly copy for invalid
credentials, unconfirmed email, duplicate account, password requirement, disabled
sign-up, case-insensitive matching, and unknown message preservation.

### Scenario 3: Complete Lifestyle Questionnaire (Pass)

**Related user story:** User Story 2, Lifestyle Profile Creation.

**Preconditions:**

- User is authenticated.
- Basic profile info and profile photo step have been completed or skipped.

**Steps:**

1. Start the lifestyle questionnaire during onboarding.
2. Answer each displayed question.
3. For budget, enter `1200` as minimum and `1800` as maximum.
4. Select a move-in timing option.
5. Continue through cleanliness, sleep, guest, conflict, cohabitation, pet,
   substance-use, and work-from-home questions.
6. Press `Finish`.

**Expected output:**

- The app does not allow submission until required answers are complete.
- The budget step rejects a maximum lower than the minimum.
- Responses are saved to `lifestyle_preferences`.
- The profile is marked `questionnaire_complete = true`.
- The saved answers are available for compatibility matching.

**Release result:** Pass. Backend lifestyle tests cover create, update, get,
auth failures, score boundaries, boolean fields, budget validation, and move-in
date validation. Mobile contract tests cover questionnaire edit mode and
existing answer prefill.

### Scenario 4: Add or Skip Profile Photo (Pass)

**Related user story:** User Story 3, Profile Photo Upload.

**Preconditions:**

- User is authenticated and has completed Basic Info.

**Steps:**

1. Open the Profile Photo onboarding screen.
2. Select `Choose image`.
3. Pick a JPG, JPEG, HEIC, HEIF, or PNG image from the device library.
4. Confirm the square crop.
5. Press `Continue`.

**Expected output:**

- The selected photo uploads to the `profile-photos` storage bucket.
- The profile row is updated with the public avatar URL.
- The profile photo appears on the user's profile and feed card.

**Alternate steps:**

1. Select `Skip for now`.

**Alternate expected output:**

- The app generates a default avatar using the saved profile name.
- The user can continue onboarding with a visible avatar.

**Release result:** Pass. Backend contract tests verify the default avatar uses
the saved profile name, derives initials, and no longer falls back to a generic
HabiMatch avatar.

### Scenario 5: Calculate Compatibility and Rank Matches (Pass)

**Related user stories:** User Story 4, Compatibility-Based Matching; User Story
6, Compatibility Score and Match Breakdown.

**Preconditions:**

- Two completed user profiles exist.
- Both users have lifestyle questionnaire responses.

**Steps:**

1. Open the Roommate Feed.
2. Load completed candidate profiles.
3. Compare a candidate with overlapping budget ranges, move-in dates within 90
   days, and compatible lifestyle scores.

**Expected output:**

- The candidate receives a compatibility score between `0` and `1`.
- Passing matches are shown before hard-filtered matches.
- Domain scores are available for logistics, sleep, cleanliness, noise, guests,
  cohabitation, and conflict.
- Substance-use fields do not automatically fail compatibility.

**Release result:** Pass. Backend and mobile matching tests cover perfect
matches, budget hard-filter failure, move-in hard-filter failure, combined hard
filter failures, weighted domain breakdowns, work-from-home noise weighting, and
substance-use behavior as feed-filter data rather than hard-filter failures.

### Scenario 6: Show Hard-Filtered Match as Filtered (Pass)

**Related user stories:** User Story 4, Compatibility-Based Matching; User Story
6, Compatibility Score and Match Breakdown.

**Input data:**

- Current user budget range: `1000` to `1300`.
- Candidate budget range: `1500` to `2000`.

**Steps:**

1. Open the Roommate Feed with the above candidate available.
2. Let the app score the candidate.

**Expected output:**

- The candidate fails the budget hard filter.
- Overall score is `0`.
- Failure message is `Budget ranges do not overlap.`
- Feed card displays `Filtered` instead of a percentage if shown after passing
  matches.

**Release result:** Pass. Covered by backend and mobile matching tests.

### Scenario 7: Swipe on Roommate Feed (Pass with Known Risk)

**Related user story:** User Story 5, Swipeable Roommate Feed.

**Preconditions:**

- User is authenticated and onboarding is complete.
- At least one eligible candidate is available in the feed.

**Steps:**

1. Open the Roommate Feed.
2. Swipe right past the acceptance threshold on a candidate.
3. Observe the directional check feedback.
4. Confirm the card is removed from the feed.
5. Refresh the feed.
6. Swipe left past the rejection threshold on another candidate.
7. Observe the directional close feedback.

**Expected output:**

- Swipe right records a `like` discovery decision.
- Swipe left records a `dislike` discovery decision.
- Decided profiles do not reappear in the feed.
- Pull-to-refresh reloads rankings without a separate refresh button.

**Release result:** Pass with risk. Contract tests verify swipe gesture wiring,
directional feedback, and pull-to-refresh. The release summary still notes that
swipe recognition may occasionally be inconsistent on device, so final release
validation should include manual device testing.

### Scenario 8: Apply Match Filters (Partial)

**Related user story:** User Story 9, Match Filters.

**Steps:**

1. Open the Roommate Feed.
2. Open the filter panel.
3. Select gender `Woman`.
4. Enter age minimum `21` and age maximum `30`.
5. Enable lifestyle filters such as hiding smokers, marijuana users, alcohol
   users, or pet owners.

**Expected output:**

- The feed displays only profiles matching the selected filters.
- The active filter button indicates filters are applied.
- If all ranked matches are hidden, the app shows `No matches for filters`.
- Substance-use filters hide profiles from view but do not change compatibility
  scores.

**Release result:** Partial. Age, gender, and lifestyle filter behavior exists
in the mobile feed implementation, and matching tests verify substance-use
choices are not hard filters. Persistent saved filter preferences are not
verified by automated tests.

### Scenario 9: View and Edit Profile (Pass)

**Related user story:** User Story 10, View and Edit Profile.

**Preconditions:**

- User is authenticated and onboarding is complete.

**Steps:**

1. Open the Profile tab.
2. Change display name to `Jordan Lee`.
3. Change location to `San Jose, CA`.
4. Add or edit the bio field.
5. Press `Save profile`.
6. Open Profile settings.
7. Press `Sign out`.

**Expected output:**

- Required display name and location must be present before saving.
- Saved changes are reflected immediately in the Profile tab.
- A success message appears after saving.
- Sign out and Delete account actions are behind the settings gear.
- Delete account is visible but disabled until backend support exists.

**Release result:** Pass. Backend profile tests cover create, update, get,
validation, not-found cases, and auth failures. Mobile contract tests verify the
settings gear placement and profile preference update entry point.

### Scenario 10: Edit Questionnaire Preferences from Profile (Pass)

**Related user story:** User Story 10, View and Edit Profile.

**Preconditions:**

- User is authenticated.
- User has existing lifestyle preferences.

**Steps:**

1. Open the Profile tab.
2. Press `Update Preferences`.
3. Confirm the questionnaire opens in edit mode.
4. Confirm existing saved answers are prefilled.
5. Change one answer.
6. Save the questionnaire.

**Expected output:**

- Questionnaire opens in edit mode.
- Existing `lifestyle_preferences` data is loaded.
- Updated answers are saved back to Supabase.
- The user can cancel and return to Profile.

**Release result:** Pass. Mobile contract tests verify edit-mode wiring,
existing answer loading, prefill conversion, and cancel support.

### Scenario 11: Open Messages and Group Chat (Pass)

**Related user story:** User Story 8, Messaging and Group Chats.

**Preconditions:**

- User is authenticated.
- User has at least one mutual match.

**Steps:**

1. Open the Messages tab.
2. Verify direct mutual matches appear in the inbox.
3. Tap a direct match.
4. Send a message.
5. Return to Messages.
6. Select `New group`.
7. Select at least two mutual matches.
8. Create a group chat.

**Expected output:**

- The inbox shows direct and group conversations.
- Direct conversations are limited to mutual matches.
- Conversation previews show title, avatar or group icon, last message body,
  activity time, and participant count for groups.
- Group creation rejects non-mutual participants.
- Chat screen accepts direct and group conversation metadata.

**Release result:** Pass. Backend contract tests verify mutual-match messaging
SQL, group conversation creation, group participant validation, direct/group
conversation previews, and mobile messaging API contracts. Mobile unit tests
verify inbox preview merging, fallback titles, participant counts, and newest
first ordering.

### Scenario 12: Receive Match Notifications (Not Passed / Not Implemented)

**Related user story:** User Story 7, Match Notifications.

**Steps:**

1. Enable match notifications in settings.
2. Have another user mutually like the current user.
3. Observe whether a notification is delivered.
4. Disable notifications.
5. Repeat the mutual-like event.

**Expected output:**

- A notification is generated only when notifications are enabled.
- No notification is delivered when notifications are disabled.

**Release result:** Not passed for this release. The product documentation lists
notifications as planned 1.0 scope, but there is no completed automated or
manual notification verification in the current test suite.

## Automated Unit and Contract Tests

### Backend Tests

**Command run:**

```powershell
backend\.venv\Scripts\pytest.exe
```

**Result on June 2, 2026:** Pass.

| Test area | Directory/file | Coverage summary | Result |
|---|---|---|---|
| Auth and protected routes | `backend/tests/test_auth.py` | Health route, missing token, valid token, expired token, invalid signature, wrong audience, protected feed shape | Pass |
| Profile API | `backend/tests/test_profile.py` | Create, update, get, optional fields, duplicate profile, validation failures, auth failures | Pass |
| Lifestyle API | `backend/tests/test_lifestyle.py` | Create, update, get, score boundaries, boolean fields, budget validation, move-in date validation, auth failures | Pass |
| Matching API | `backend/tests/test_matching.py` | Auth, hard filters, domain breakdown, subdomains, lifestyle tolerance removal, WFH noise weighting, severe mismatch penalties | Pass |
| Feed swipe contract | `backend/tests/test_feed_swipe_contract.py` | Mobile swipe gesture contract, directional feedback, pull-to-refresh | Pass |
| Messaging/group chat contract | `backend/tests/test_group_chat_contract.py` | Messaging SQL, mutual match enforcement, group creation RPC, mobile direct/group metadata contracts | Pass |
| Profile photo contract | `backend/tests/test_profile_photo_contract.py` | Default avatar uses saved name, initials generation, UI Avatars URL | Pass |
| Supabase integration profile tests | `backend/tests/test_profile_integration.py` | Live Supabase profile integration | Skipped when Supabase env vars are not set |

**Observed result:** `114 passed, 1 skipped`. The skipped tests are live
Supabase integration tests that require environment variables.

### Mobile Tests

**Command run:**

```powershell
npm test
```

Run from `mobile/`.

**Result on June 2, 2026:** Pass.

| Test area | Directory/file | Coverage summary | Result |
|---|---|---|---|
| Auth error formatting | `mobile/tests/authErrors.test.ts` | Known Supabase auth messages, sign-up failures, case-insensitive matching, unknown message preservation | Pass |
| Compatibility scoring | `mobile/tests/matching.test.ts` | Perfect match, hard-filter failures, lifestyle filter separation, partial overlap scoring, WFH noise weighting | Pass |
| Messaging previews | `mobile/tests/messagingPreview.test.ts` | Direct/group inbox merge, mutual-match-only direct previews, fallback titles, participant counts, newest-first ordering | Pass |
| Profile/edit contracts | `mobile/tests/profileEditContract.test.ts` | Settings gear account actions, questionnaire edit entry point, existing preference prefill, messages empty-state icon | Pass |

**Observed result:** `18 passed`.

## Remaining Testing Risks

- System-level end-to-end tests are still mostly manual; the current automated
  suite focuses on backend API behavior, pure mobile logic, and contract checks.
- Live Supabase profile integration tests are skipped unless Supabase
  environment variables are configured.
- Push/match notifications are not implemented or verified.
- Swipe gestures have contract coverage, but the release summary notes possible
  device-level inconsistency; manual testing on iOS/Android is still needed.
- Mobile UI rendering and user interaction are not covered by a React Native
  testing library or Detox-style end-to-end test suite.

## Review Readiness

The automated tests can be rerun during project review with:

```powershell
backend\.venv\Scripts\pytest.exe
```

```powershell
cd mobile
npm test
```
