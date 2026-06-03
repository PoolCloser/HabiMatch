# HabiMatch Product Design Document

**Product:** HabiMatch 1.0  
**Author:** Koa Wolfe -- Product Owner  
**Release target:** June 2, 2026  
**Last revised:** June 2, 2026

## Product Vision

HabiMatch helps people find compatible roommates by collecting lifestyle,
housing, and cohabitation preferences, then ranking potential roommates by
compatibility. The 1.0 MVP should feel like a focused roommate-matching app:
create an account, complete onboarding, answer the questionnaire, review ranked
roommate cards, save discovery decisions, see in-app mutual-match feedback, and
message matches.

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
| Lifestyle questionnaire | Implemented | One question at a time. Cigarette, marijuana, and alcohol questions collect self-use only. |
| Compatibility scoring | Implemented | Python backend algorithm and TypeScript mobile mirror must stay aligned; substance-use choices are not hard filters. |
| Roommate feed | Implemented | Shows one top ranked card at a time from up to 8 ranked candidates. |
| Like/dislike decisions | Implemented | Saves to `discovery_decisions` and removes the card. |
| Gender, age, and lifestyle filters | Implemented | Client-side filters on ranked feed, including substance-use and pet-owner visibility filters. |
| Profile editing | Implemented | Edit display name, bio, location, avatar, and questionnaire preferences. |
| Mutual match detection | Implemented | A mutual like creates or reveals a match relationship and shows in-app feedback. |
| Match notifications | Not implemented | Push/local notifications remain backlog scope. In-app match notice exists. |
| Direct messaging | Implemented | Let mutual matches exchange messages. |
| Group chat / roommate planning | Implemented | Support group conversations with eligible mutual matches. |
| Messaging tab | Implemented | Chat entry point for mutual matches, direct conversations, and groups. |
| Delete account | Placeholder | Visible but disabled. |
| Questionnaire editing | Implemented | Available from the Profile tab with existing answer prefill. |

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
10. The user can filter, pull to refresh, like, dislike, or switch tabs.
11. A mutual like shows an in-app match notice and the matched user appears in
    Messages.
12. The user can open Messages to chat with direct matches or create a group
    conversation.
13. The user can edit profile fields, update questionnaire preferences, or sign
    out from Profile settings.

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

**PO notes:** The questionnaire is the most product-critical onboarding
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
- Supports pull-to-refresh.

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
- Swipe gestures with directional accept/reject feedback.
- Error banners.
- Bottom tab bar with Messages, Feed, and Profile.

**PO notes:** The feed is intentionally card-forward and lightweight.
Pagination, undo, and detailed compatibility explanations are not required for
1.0. Mutual-match feedback should stay short and should direct users to
Messages instead of expanding the feed into a chat surface.

### 9. Home / Profile Screen

Profile tab inside Home.

**Feature behavior:**

- Displays current avatar, display name, gender, age, and location.
- Lets the user update avatar through image picker.
- Lets the user edit display name, bio, and location.
- Requires display name and location before saving.
- Saves profile edits to Supabase.
- Opens questionnaire edit mode with existing preference prefill.
- Supports sign out from the Profile settings modal.
- Shows Delete Account as disabled.
- Settings icon opens account actions.

**Editable fields:**

- Display name.
- Bio.
- Location.
- Profile photo.
- Questionnaire responses.

**Not editable in MVP 1.0:**

- Email address.
- Birth date.
- Gender.
- Discovery decisions.

**UI elements:**

- Top bar with `HM` and settings icon.
- Large circular avatar with camera badge.
- Profile name and metadata.
- Text inputs for display name, bio, and location.
- Save profile button.
- Update Preferences button.
- Profile settings modal.
- Sign out action.
- Disabled Delete Account action with explanatory hint.
- Success and error messages.

### 10. Messages Tab

The Messages tab is present in the bottom navigation and is the entry point for
direct and group messaging between matched users.

**Feature behavior:**

- Users can open Messages from the bottom navigation after onboarding.
- Users can only start or view conversations with mutual matches.
- A mutual match is created when the current user likes a profile that has
  already liked them, or when another user later likes them back.
- Conversation lists show match name or group name, avatar or group icon, last
  message preview, participant count for groups, and most recent activity time.
- Direct message threads show sent and received messages in chronological
  order.
- Sending a message persists the message and updates the conversation's latest
  activity.
- Group chat supports conversations involving more than two matched users.
- Group creation only allows eligible mutual matches.
- Empty states distinguish between no mutual matches and no messages yet.

**UI elements:**

- Bottom-tab Messages entry.
- Conversation list.
- Conversation row with avatar, name, preview, and timestamp.
- Chat thread header with participant name or group name.
- Message bubbles for sent and received messages.
- Text composer.
- Send button.
- New group button.
- Group name input and selectable participant list.
- Loading, empty, and error states.

**PO guidance:** Do not ship fake or local-only messages. Messaging must persist
to the backend/Supabase data model and must be limited to mutual matches.

### 11. Match Notifications

Push notifications are not implemented in the current release. The app provides
in-app feedback when a mutual match is created, and push/local notification
support remains backlog scope.

**Future behavior:**

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

**PO notes:** Notifications support the matching loop but should not block
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
| `conversations` | Direct and group conversation metadata. |
| `participants` | Users participating in each conversation. |
| `messages` | Persisted chat messages, exposed to realtime updates. |

Substance-use fields store whether the user smokes cigarettes, uses marijuana,
or drinks alcohol at home. The legacy tolerance fields for those habits should
not drive 1.0 matching.

Mutual matches are derived from reciprocal `like` rows in
`discovery_decisions`. Direct and group messaging use Supabase RPCs and RLS so
only conversation participants can view messages, and direct/group conversation
creation is limited to eligible mutual matches.

Future push notification work will need persistent notification tokens or
delivery preferences. That storage is not part of the current release.

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

Supabase RPCs and policies support the implemented mobile-first flows for
completed profile reads, discovery decisions, mutual-match checks, direct
conversation creation, group conversation creation, conversation listing, and
realtime message delivery.

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

The release plan remains useful for roadmap context. This design document now
distinguishes implemented 1.0 MVP behavior from remaining backlog scope.

| Release-plan item | 1.0 decision |
|---|---|
| Mutual match notifications | In-app mutual match notice is implemented. Push/local notifications remain backlog scope. |
| Direct messaging | Implemented for mutual matches. |
| Group chat | Implemented for eligible mutual matches. |
| Profile and match preferences editable at any time | Implemented for display name, bio, location, avatar, and questionnaire preferences. Birth date, gender, email, and discovery decisions are not editable. |
| Advanced filters | Implemented for age, gender, substance-use visibility, and pet-owner visibility. Filter persistence remains backlog scope. |
| Web app | Deferred as a product target, though Expo web preview may be used for development/demo. |
| Algorithm math | Matching uses Python standard math and a TypeScript mirror. |
| EAS distribution | Planned release path, not a screen-level MVP feature. |

## Engineering Guidance from PO

- Prioritize correctness and trust over feature breadth. A smaller accurate
  matching flow is better than a broader but inconsistent app.
- Keep messaging persistent and mutual-match gated; do not add local-only or
  fake chat behavior.
- Treat push notifications as separate backlog scope until permission handling,
  token storage, delivery, and user controls are designed and tested.
- Keep onboarding linear until the team designs re-entry and partial-completion
  behavior.
- Treat questionnaire changes as cross-stack changes, not mobile-only copy work.
- When removing a questionnaire tolerance question, update storage, matching,
  feed filters, test data, and documentation together.
- Keep the UI consistent: blue brand background for onboarding, white cards,
  clear selected states, obvious disabled states, and short direct copy.
- Preserve the disabled Delete Account affordance as a visible roadmap signal.
- Update `documentation/DOD.md` and `documentation/questionnaire_design.md`
  whenever the quality bar or matching behavior changes.

## Related Documents

- [DOD.md](DOD.md) - Definition of Done for stories, tasks, and review.
- [questionnaire_design.md](questionnaire_design.md) - Questionnaire order,
  stored fields, hard filters, scoring formulas, and domain weights.
- [style_guide.md](style_guide.md) - Code style and implementation standards.
- [test_plan_and_report.md](test_plan_and_report.md) - System scenarios,
  automated test coverage, and release test results.
