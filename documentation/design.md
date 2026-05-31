# HabiMatch Product Design Document

**Product:** HabiMatch 1.0  
**Author:** Koa Wolfe -- Product Owner  
**Release target:** June 2, 2026  
**Last revised:** May 18, 2026

## Product Vision

HabiMatch helps people find compatible roommates by collecting lifestyle,
housing, and cohabitation preferences, then ranking potential roommates by
compatibility. The 1.0 MVP should feel like a focused roommate-matching app:
create an account, complete onboarding, answer the questionnaire, review ranked
roommate cards, save discovery decisions, receive mutual-match notifications,
and message matches.

This document was written for the direction of the engineering
team. It defines the MVP feature scope, user flows, screen-level expectations,
and product rules that should guide implementation.

## MVP Users and Scope

**Primary user:** A person actively looking for a roommate who wants stronger
compatibility signals than a generic listing or social post provides.

**MVP scope:** A single user type. No landlords, property listings, payments,
admin tooling, or web-only workflows.

## MVP Feature Summary

| Feature | MVP status | Product guidance |
|---|---|---|
| Email/password registration | Implemented | Required for account creation. |
| Email/password login | Implemented | Required for returning users. |
| Password reset request | Implemented | Available from Login. |
| Session persistence | Implemented | Users should stay signed in across app restarts. |
| Supabase setup guard | Implemented | Missing env vars must show a setup message, not a broken app. |
| Linear onboarding | Implemented | Basic Info -> Profile Photo -> Questionnaire -> Home. |
| Basic profile info | Implemented | Name, location, birth date, and binary gender. |
| Profile photo setup | Implemented | Upload from library or skip with default avatar. |
| Lifestyle questionnaire | Implemented, update required | One question at a time. Cigarette, marijuana, and alcohol questions should collect self-use only. |
| Compatibility scoring | Implemented, update required | Python backend algorithm and TypeScript mobile mirror must stay aligned; substance-use hard filters should be removed. |
| Roommate feed | Implemented | Shows one top ranked card at a time from up to 8 ranked candidates. |
| Like/dislike decisions | Implemented | Saves to `discovery_decisions` and removes the card. |
| Gender and age filters | Implemented | Client-side filters on ranked feed. |
| Substance-use feed filters | Planned for 1.0 | Let users hide profiles based on cigarette, marijuana, or alcohol use. |
| Profile editing | Implemented | Edit display name, bio, location, and avatar. |
| Mutual match detection | Planned for 1.0 | A mutual like should create a match relationship. |
| Match notifications | Planned for 1.0 | Notify users when a mutual match occurs. |
| Direct messaging | Planned for 1.0 | Let mutual matches exchange messages. |
| Group chat / roommate planning | Planned for 1.0 | Support group conversation or sharing when planning rooms larger than two people. |
| Messaging tab | Planned for 1.0 | Currently disabled placeholder; must become the chat entry point. |
| Delete account | Placeholder | Visible but disabled. |
| Questionnaire editing | Deferred | Not available after onboarding. |

## Core Product Rules

- Users must complete onboarding before entering the Home experience.
- A complete profile requires basic info, an avatar URL, and completed
  questionnaire responses.
- Only profiles with `questionnaire_complete = true` are eligible for the feed.
- The current user must never appear in their own feed.
- Profiles already liked or disliked by the current user must not reappear.
- Discovery decisions are permanent for MVP 1.0; there is no undo or history
  screen.
- A mutual match occurs when both users have liked each other.
- Users should only be able to message people they have mutually matched with.
- Cigarette smoking, marijuana use, and alcohol use are self-reported lifestyle
  attributes, not matching hard filters.
- Users who do not want to see roommates with those substance-use habits should
  control that from the Roommate Feed filter panel.
- Hard-filter failures are allowed to appear after passing matches, but they
  must be labeled `Filtered` instead of showing a score.
- Numeric questionnaire scores are internal. User-facing copy must use plain
  language.
- Any change to questionnaire fields must update the mobile questionnaire,
  Supabase data shape, matching model, tests, and
  `documentation/questionnaire_design.md`.

## User Flow

1. User opens the app.
2. If Supabase environment variables are missing, the app shows a setup
   instruction screen.
3. If signed out, the user sees Login or can navigate to Register.
4. After authentication, the app validates the session and loads onboarding
   status from `profiles`.
5. If basic info is missing, the user completes Basic Info.
6. If `avatar_url` is missing, the user completes Profile Photo setup.
7. If `questionnaire_complete` is false, the user completes the questionnaire.
8. When onboarding is complete, the user enters Home.
9. Home defaults to the Roommate Feed.
10. The user can filter, refresh, like, dislike, or switch to Profile.
11. The user can edit limited profile fields or sign out from Profile.

## Screen Specifications

### 1. Supabase Setup Screen

Shown when `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_ANON_KEY` is
missing.

**UI elements:**

- White full-screen state.
- Title: `Configure Supabase`.
- Body copy explaining the required `mobile/.env` keys.

**PO notes:** This screen is a developer/demo safety net. It should remain
plain and specific so configuration failures are easy to diagnose.

### 2. Login Screen

Entry screen for signed-out users.

**Feature behavior:**

- Accepts email and password.
- Validates both fields are present.
- Uses Supabase password sign-in.
- Supports password reset by email.
- Preserves friendly error handling through `formatAuthError`.
- Shows loading state while sign-in is running.

**UI elements:**

- HabiMatch wordmark and tagline.
- White card on blue background.
- Email input.
- Password input with show/hide icon.
- Forgot password action.
- Primary `Sign In` button.
- Link to Register.
- Error banner when needed.

### 3. Register Screen

Account creation screen for signed-out users.

**Feature behavior:**

- Accepts email, password, and confirm password.
- Requires all fields.
- Requires matching passwords.
- Requires password length of at least 8 characters.
- Calls Supabase sign-up.
- Shows a confirmation instruction if Supabase does not return a session.

**UI elements:**

- HabiMatch wordmark and tagline.
- White card on blue background.
- Email input.
- Password input with show/hide icon.
- Confirm password input.
- Primary `Create Account` button.
- Link back to Login.
- Error and info banners.

**PO guidance:** If production auth requires email confirmation, the app must
keep the confirmation-message path. For local development, the current Supabase
config does not require confirmation.

### 4. Session and Onboarding Status States

After auth, the app validates the session and loads onboarding status.

**Feature behavior:**

- Shows a full-screen spinner while validating auth or profile state.
- If session validation fails due to connectivity, shows a retryable blocking
  state.
- Invalid sessions are cleared locally.

**UI elements:**

- Loading spinner.
- Blocking error title: `Session check failed`.
- Error body.
- `Try again` button.

### 5. Basic Info Screen

First onboarding step. Collects the minimum profile data needed for feed cards.

**Fields:**

| Field | Input | MVP rule |
|---|---|---|
| Full name | Text | Required |
| Location | Text | Required |
| Birth date | Date picker | User must be at least 18 |
| Gender | Man/Woman option buttons | Required |

**Feature behavior:**

- Split into `Profile` and `Date of Birth / Gender` steps.
- Saves to `profiles` with `id`, `full_name`, `location`, `birthdate`,
  `gender`, and `updated_at`.
- Uses upsert on the current user's profile row.
- Disables progression until required fields are valid.

**UI elements:**

- HabiMatch wordmark and onboarding tagline.
- White card on blue background.
- Section label.
- Large question text.
- Text inputs for name and location.
- Spinner-style date picker.
- Man/Woman selection buttons.
- `Next`, `Continue`, and `Back` actions.
- Inline age error.

**PO guidance:** The gender field is intentionally limited to Man/Woman because
the current feed filter supports those values. Do not add more options without
also updating filtering, data normalization, and product copy.

### 6. Profile Photo Screen

Second onboarding step. Ensures every completed profile has an avatar URL.

**Feature behavior:**

- Requests media-library permission.
- Opens the image picker with editing enabled.
- Enforces a 1:1 aspect ratio at selection time.
- Shows a circular preview.
- Uploads selected image to the `profile-photos` Supabase storage bucket.
- Saves the public URL to `profiles.avatar_url`.
- Allows skipping by saving a generated default avatar URL.

**UI elements:**

- HabiMatch wordmark and tagline.
- White card on blue background.
- Upload frame with dashed border.
- Circular preview or upload icon.
- `Choose image` / `Choose a different image` button.
- Primary `Continue` button.
- `Skip for now` text action.
- Error banner and saving spinner.

**PO guidance:** Skipping must still produce a visible avatar in the feed. Do
not let skipped profiles enter Home with a missing or broken image URL.

### 7. Lifestyle Questionnaire Screen

Final onboarding step and the core source of matching data.

**Feature behavior:**

- Displays one question at a time.
- Shows a progress bar based on effective, non-skipped questions.
- Supports Back navigation.
- Validates budget min/max before continuing.
- Converts move-in timing to a concrete ISO date.
- Converts bedtime from a time picker to a `0..4` score.
- Asks whether the user smokes cigarettes, uses marijuana, or drinks alcohol at
  home.
- Does not ask whether the user is willing to live with someone who smokes
  cigarettes, uses marijuana, or drinks alcohol.
- Saves to `lifestyle_preferences`.
- Sets `profiles.questionnaire_complete = true`.

**Question groups:**

- Logistics: budget and move-in timing.
- Lifestyle: cigarette smoking, marijuana use, and alcohol use as self-reported
  behavior only.
- Home Life: pets and overnight guests.
- Sleep & Schedule: bedtime, late-night noise tolerance, work/study from home.
- Noise & Environment: usual noise behavior and focus tolerance.
- Guests & Social: guest frequency and tolerance.
- Cleanliness: shared-space cleaning and cooking behavior/tolerance.
- Conflict Style: conflict behavior and tolerance.
- Cohabitation Style: desired roommate interaction level.

**UI elements:**

- HabiMatch wordmark and tagline.
- Progress track and fill.
- Category label.
- Large question text.
- Option buttons with selected state.
- Budget min/max dollar inputs.
- Time picker for bedtime.
- `Back`, `Next`, and `Finish` buttons.
- Error banner and saving spinner.

**PO guidance:** The questionnaire is the most product-critical onboarding
surface. Keep copy conversational and avoid exposing internal numeric values.
Substance-use tolerance questions should not appear in the questionnaire; user
control for those preferences belongs in the Roommate Feed filter panel. Any new
or removed question must have a matching storage-field decision, matching-model
mapping, test coverage, and documentation update.

### 8. Home / Roommate Feed Screen

Primary post-onboarding screen. Shows ranked roommate recommendations.

**Feature behavior:**

- Loads completed profiles and lifestyle preferences from Supabase.
- Excludes the current user.
- Excludes users with existing discovery decisions.
- Converts valid profiles/preferences into match participants.
- Calculates compatibility in `mobile/src/lib/matching.ts`.
- Sorts passing matches ahead of filtered matches, then by score.
- Limits the ranked set to 8.
- Displays the first visible match after filters.
- Applies user-selected feed filters after ranking, including gender, age, and
  substance-use filters.
- Saves like/dislike decisions to `discovery_decisions`.
- Removes decided cards immediately.
- Supports manual refresh.

**Feed card content:**

- Name or generated fallback.
- Gender, age, and location line.
- Compatibility percentage or `Filtered` label.
- Square profile photo or initial fallback.
- Bio.
- Budget range.
- Move-in date.
- Substance-use indicators for cigarette, marijuana, and alcohol habits when
  needed to make feed filtering transparent.
- Top two scoring compatibility domains, or the first hard-filter failure.

**Filtering behavior:**

- Filter panel toggled from the top-right filter button.
- Gender filter supports Man and Woman.
- Age range supports minimum and maximum numeric inputs.
- Minimum age is clamped to 18 on blur.
- Substance-use filters let users hide profiles that smoke cigarettes, use
  marijuana, or drink alcohol at home.
- Substance-use filters are user-controlled visibility filters, not scoring
  penalties and not automatic hard-filter failures.
- Active filters change the filter button styling.
- If ranked matches exist but filters hide all of them, show `No matches for
  filters`.

**Empty and loading states:**

- Loading state: `Scoring matches...`
- No completed visible profiles: `No matches yet`
- No results after filters: `No matches for filters`
- Footer metadata shows ranked count, filtered count, or incomplete skipped
  count.

**UI elements:**

- Top bar with `HM`, `Roommate Feed`, and Filter button.
- Optional filter panel with gender controls, age range inputs, and
  substance-use toggles or checkboxes.
- Large match card.
- Score pill.
- Photo area.
- Info rows.
- Circular dislike and like action buttons.
- Error banners.
- Refresh button.
- Bottom tab bar with Messages, Feed, and Profile.

**PO guidance:** The feed is intentionally card-forward and lightweight.
Pagination, undo, and detailed compatibility explanations are not required for
1.0. Mutual-match and chat entry points are required for 1.0, but they should be
added through the dedicated messaging and notification scope rather than as
ad-hoc feed behavior.

### 9. Home / Profile Screen

Profile tab inside Home.

**Feature behavior:**

- Displays current avatar, display name, gender, age, and location.
- Lets the user update avatar through image picker.
- Lets the user edit display name, bio, and location.
- Requires display name and location before saving.
- Saves profile edits to Supabase.
- Supports sign out.
- Shows Delete Account as disabled.
- Settings icon is visible but disabled.

**Editable fields:**

- Display name.
- Bio.
- Location.
- Profile photo.

**Not editable in MVP 1.0:**

- Email address.
- Birth date.
- Gender.
- Questionnaire responses.
- Discovery decisions.

**UI elements:**

- Top bar with `HM` and disabled settings icon.
- Large circular avatar with camera badge.
- Profile name and metadata.
- Text inputs for display name, bio, and location.
- Save profile button.
- Sign out button.
- Disabled Delete Account action.
- Success and error messages.

**PO guidance:** Do not add questionnaire re-entry from this screen for MVP 1.0.
That requires a separate design decision because changing preferences can affect
matching, existing discovery decisions, and feed expectations.

### 10. Messages Tab

The Messages tab is present in the bottom navigation and is currently disabled.
For 1.0, it must become the entry point for direct and group messaging between
matched users.

**Planned 1.0 behavior:**

- Users can open Messages from the bottom navigation after onboarding.
- Users can only start or view conversations with mutual matches.
- A mutual match is created when the current user likes a profile that has
  already liked them, or when another user later likes them back.
- Conversation lists should show the match name, avatar, last message preview,
  and most recent activity time.
- Direct message threads should show sent and received messages in chronological
  order.
- Sending a message should persist the message and update the conversation's
  latest activity.
- Group chat or multi-roommate planning should support conversations involving
  more than two matched users if Sprint 3 scope remains unchanged.
- Empty states should distinguish between no mutual matches and no messages yet.

**UI elements:**

- Bottom-tab Messages entry.
- Conversation list.
- Conversation row with avatar, name, preview, and timestamp.
- Chat thread header with participant name or group name.
- Message bubbles for sent and received messages.
- Text composer.
- Send button.
- Loading, empty, and error states.

**PO guidance:** Do not ship fake or local-only messages. Messaging must persist
to the backend/Supabase data model and must be limited to mutual matches.

### 11. Match Notifications

Notifications are planned for the 1.0 release and should alert users when a
mutual match is created.

**Planned 1.0 behavior:**

- The app requests notification permission at a contextually appropriate time,
  not immediately on first launch.
- A user receives a notification when another user likes them back and creates a
  mutual match.
- Tapping the notification should take the user toward the relevant match or
  conversation when technically feasible.
- If permission is denied, matching and messaging still work in-app.
- Notification copy should be short, friendly, and privacy-conscious.

**UI elements:**

- Permission prompt entry point or explanatory pre-prompt.
- In-app success path for newly created mutual matches.
- Notification deep-link target if supported by the final implementation.

**PO guidance:** Notifications support the matching loop but should not block
core app use. Do not require notification permission before onboarding, feed
use, liking, or messaging.

## Compatibility and Matching Guidance

The matching algorithm is the core product differentiator. The Python
implementation in `backend/app/matching.py` is the backend reference, and the
mobile mirror in `mobile/src/lib/matching.ts` powers the current feed.

**Hard filters:**

| Filter | Rule |
|---|---|
| Budget | Budget ranges must overlap. |
| Move-in date | Move-in dates must be within 90 days. |
| Pets | A pet owner must match with someone okay with pets. |

**Not hard filters:**

| Attribute | Matching rule |
|---|---|
| Cigarette smoking | Collected as self-reported behavior and filterable in the feed. Does not automatically fail compatibility. |
| Marijuana use | Collected as self-reported behavior and filterable in the feed. Does not automatically fail compatibility. |
| Alcohol use at home | Collected as self-reported behavior and filterable in the feed. Does not automatically fail compatibility. |

**Scored domains:**

| Domain | Base weight | Product meaning |
|---|---:|---|
| Logistics | 0.10 | Budget overlap and move-in timing. |
| Sleep | 0.20 | Bedtime and late-night noise compatibility. |
| Cleanliness | 0.20 | Cleaning and cooking fit. |
| Noise | 0.15 | General noise behavior and tolerance. |
| Guests | 0.15 | General and overnight guest compatibility. |
| Cohabitation | 0.20 | Desired roommate interaction level. |
| Conflict | 0.10 | Conflict behavior and preferred conflict handling. |

Noise weight may be boosted up to `1.25x` when either user works or studies from
home, scaled by noise sensitivity, then all weights are normalized.

**PO rules:**

- Remaining hard filters stay absolute unless the PO explicitly changes the
  matching strategy.
- Cigarette smoking, marijuana use, and alcohol use must not produce
  compatibility failures or `Filtered` labels by themselves.
- Substance-use preferences belong in the Roommate Feed filters so each user can
  decide what they want to see.
- Passing matches display a whole-number percentage.
- Filtered matches display `Filtered`, not a percentage.
- The top two domain labels shown on a passing feed card must be computed from
  actual domain scores.
- The Python and TypeScript algorithms must produce equivalent outcomes for the
  same inputs.

See `documentation/questionnaire_design.md` for detailed field mapping and
formula documentation.

## Data Model Summary

The current app expects these Supabase resources:

| Resource | Purpose |
|---|---|
| `auth.users` | Supabase-managed user identity and authentication. |
| `profiles` | Name, avatar URL, bio, birthdate, gender, location, and questionnaire completion state. |
| `lifestyle_preferences` | Questionnaire responses used for compatibility scoring. |
| `discovery_decisions` | Current user's like/dislike decisions for candidate profiles. |
| `profile-photos` | Supabase storage bucket for uploaded avatar images. |

Substance-use fields should store whether the user smokes cigarettes, uses
marijuana, or drinks alcohol at home. The legacy tolerance fields for those
habits should not drive 1.0 matching once the questionnaire and matching update
is complete.

Planned 1.0 messaging and notification work will also need persistent resources
for mutual matches, conversations, messages, conversation participants, and
notification tokens or delivery preferences. Exact table names are an
engineering decision, but the data model must enforce that only matched users
can participate in direct conversations.

**PO guidance:** Keep user-owned data protected by row-level security. Completed
profiles must be readable enough to power the feed, but users should only be
able to write their own profile, preferences, photos, and decisions.

## Backend/API Scope

The backend is a FastAPI app with:

- `/health` for public health checks.
- Protected profile routes under `/profile`.
- Protected lifestyle routes under `/lifestyle`.
- Protected compatibility route under `/matching/compatibility`.
- A legacy/mock `/feed` endpoint that should not be treated as the implemented
  production feed source.

**PO guidance:** The backend matching endpoint is useful for validation and
future server-side ranking. For the current MVP mobile flow, the feed is driven
by Supabase reads plus the TypeScript matching mirror.

## Non-Functional Requirements

- The app must run through Expo on iOS, Android, and web preview for demo use.
- User-facing failures must show friendly messages.
- Session tokens and private Supabase values must never be logged or committed.
- `.env` files must remain untracked.
- TypeScript strict mode must stay enabled.
- Profile photo picking should enforce square cropping before upload.
- Age gating is enforced during Basic Info and profile display ignores invalid
  ages.
- Backend protected routes must require authentication.
- The feed must avoid blank states by showing loading, error, empty, and
  filtered-empty states.
- Messaging must not expose conversations to users who are not participants.
- Notifications must not include sensitive profile, location, or private message
  content.

## Release Plan Reconciliation

The release plan remains useful for roadmap context. Because HabiMatch is still
pre-1.0, this design document distinguishes the implemented pre-release feature
set from the remaining planned 1.0 scope.

| Release-plan item | 1.0 decision |
|---|---|
| Mutual match notifications | Planned for 1.0. Not implemented yet. |
| Direct messaging | Planned for 1.0. Messages tab is currently disabled until implemented. |
| Group chat | Planned for 1.0 if Sprint 3 scope remains unchanged. |
| Profile and match preferences editable at any time | Partially implemented. Profile fields are editable; questionnaire responses are not. |
| Advanced filters | Expanded for 1.0. Age and gender filters exist; cigarette, marijuana, and alcohol filters should be added. |
| Web app | Deferred as a product target, though Expo web preview may be used for development/demo. |
| NumPy algorithm math | Not used in current implementation. Matching uses Python standard math and a TypeScript mirror. |
| EAS distribution | Planned release path, not a screen-level MVP feature. |

## Engineering Guidance from PO

- Prioritize correctness and trust over feature breadth. A smaller accurate
  matching flow is better than a broader but inconsistent app.
- Build messaging and notifications as scoped 1.0 features, not as mock
  placeholder behavior.
- Keep onboarding linear until the team designs re-entry and partial-completion
  behavior.
- Treat questionnaire changes as cross-stack changes, not mobile-only copy work.
- When removing a questionnaire tolerance question, update storage, matching,
  feed filters, test data, and documentation together.
- Keep the UI consistent: blue brand background for onboarding, white cards,
  clear selected states, obvious disabled states, and short direct copy.
- Preserve the disabled Delete Account affordance as a visible roadmap signal.
  The Messages affordance should become interactive when the 1.0 messaging scope
  is implemented.
- Update `documentation/DOD.md` and `documentation/questionnaire_design.md`
  whenever the quality bar or matching behavior changes.

## Related Documents

- [DOD.md](DOD.md) - Definition of Done for stories, tasks, and review.
- [questionnaire_design.md](questionnaire_design.md) - Questionnaire order,
  stored fields, hard filters, scoring formulas, and domain weights.
- [style_guide.md](style_guide.md) - Code style and implementation standards.
