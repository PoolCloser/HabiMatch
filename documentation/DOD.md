# HabiMatch Definition of Done

## Purpose

This Definition of Done (DoD) is the minimum quality bar for HabiMatch work. A
story, bug fix, or technical task is not done until it is implemented,
verified, reviewed, documented where needed, and safe to merge into `main`.

HabiMatch includes:

- React Native and Expo mobile code in `mobile/`
- Python FastAPI backend and matching logic in `backend/`
- Supabase SQL migrations, policies, and configuration in `supabase/`
- Project documentation in `documentation/`

Use this document with `documentation/style_guide.md` and
`documentation/questionnaire_design.md`.

## Done for Every Change

A change is done only when all applicable items below are true:

- The work satisfies the user story, bug report, or task goal as written.
- Any unclear requirement was resolved before implementation or documented as
  an explicit assumption in the pull request.
- The change is scoped to the intended behavior and does not include unrelated
  refactors, formatting churn, generated files, secrets, local environment
  files, caches, or build artifacts.
- Code follows `documentation/style_guide.md` and the conventions already used
  in nearby files.
- New or changed behavior is covered by the right level of testing.
- Existing tests and relevant manual checks pass.
- User-facing behavior has clear loading, empty, disabled, validation, and
  error states where those states can occur.
- Security-sensitive behavior does not expose secrets, tokens, stack traces, or
  internal implementation details to users.
- API contracts, data fields, and naming are consistent across mobile,
  backend, and Supabase boundaries.
- Documentation is updated when behavior, setup, commands, questionnaire
  fields, matching formulas, migrations, or known limitations change.
- The pull request explains what changed, why it changed, and how it was
  tested.
- At least one teammate has reviewed the pull request before merge.
- `main` remains stable after merge.

## Done for User Stories

A user story is done when the completed product behavior can be accepted by the
team without relying on future cleanup work.

- All acceptance criteria are implemented and verified.
- The main happy path and important failure paths are tested or manually
  verified.
- The story works through the full affected flow, not only the individual
  screen, endpoint, helper, or migration.
- Mobile screens affected by the story were checked in Expo on at least one
  target runtime, such as device, simulator, emulator, or web.
- Backend behavior affected by the story is covered by pytest tests when the
  change touches API validation, authentication, persistence, or matching logic.
- Supabase schema or row-level-security changes include a migration or SQL file
  that can be reviewed and rerun safely where practical.
- The Product Owner or team accepts that the implemented behavior matches the
  intended user outcome.

## Done for Development Tasks

A development task is done when it is complete enough to support its parent
story or technical goal.

- The required code, configuration, SQL, or documentation change is complete.
- The change builds or runs in the relevant local environment.
- Affected tests pass locally, or any missing test infrastructure is called out
  in the pull request with the manual verification performed.
- The task is linked to the correct story, issue, or pull request.
- Any follow-up work is recorded as a separate issue or checklist item instead
  of being hidden inside the completed task.

## Mobile Checklist

Mobile work in `mobile/` is done when:

- TypeScript remains strict-compatible and avoids `any` unless there is a
  documented reason.
- Screen components in `mobile/src/screens/` and helpers in `mobile/src/lib/`
  keep a focused responsibility.
- Supabase calls handle loading, success, empty, and failure states.
- Forms validate required input before submitting.
- Buttons that cannot run are visibly disabled and functionally disabled.
- Auth and profile flows handle missing or expired sessions gracefully.
- User-facing errors use friendly copy and route technical details away from the
  UI.
- Interactive controls without visible text have useful accessibility labels or
  hints.
- Layouts were manually checked for obvious breakage on small and large
  screens.
- For changed mobile flows, the Expo app was started with:

```bash
cd mobile
npx expo start --clear
```

## Backend Checklist

Backend work in `backend/` is done when:

- FastAPI route handlers stay thin and reusable business logic lives in helper
  modules where appropriate.
- Endpoints that return structured data use Pydantic models or existing schema
  patterns.
- Protected routes use the authentication dependency consistently.
- Request validation rejects invalid input with predictable status codes and
  messages.
- Changes to matching, profile, lifestyle, or auth behavior include pytest
  coverage for success, validation, authentication, and important failure cases.
- Matching logic remains deterministic and independently testable.
- Public functions and API-facing code use type hints where they improve
  clarity.
- The backend test suite passes from the repository root:

```bash
pytest
```

## Matching and Questionnaire Checklist

Changes to `mobile/src/screens/QuestionnaireScreen.tsx`,
`backend/app/matching.py`, lifestyle models, or questionnaire storage are done
when:

- Mobile questionnaire fields map deliberately to backend and Supabase field
  names.
- New scoring inputs define their `0..4` scale or boolean meaning clearly.
- Hard filters and scored compatibility domains are updated together when a new
  roommate constraint is added.
- Matching tests cover compatible pairs, incompatible pairs, edge values, and
  one-sided tolerance mismatches.
- Changes to domain weights, hard-filter rules, subdomain output, or formulas
  are reflected in `documentation/questionnaire_design.md`.
- Any temporary mismatch between frontend, backend, and database fields is
  documented with a removal path.

## Supabase and Data Checklist

Supabase work is done when:

- Schema changes are represented by timestamped migrations under
  `supabase/migrations/` unless the change is intentionally a local scratch SQL
  file.
- Table, column, constraint, and policy names use snake_case.
- User-owned tables have row level security enabled.
- Policies grant only the permissions required by the app.
- Policy names clearly describe who can do what.
- Migrations are focused, readable, and safe to rerun where practical through
  `if not exists`, `drop policy if exists`, or equivalent guards.
- Changes that affect application code are reflected in backend schemas,
  mobile data mapping, tests, and documentation.
- No seed data, test accounts, service-role keys, or private project values are
  committed.

## Documentation Checklist

Documentation work is done when:

- Commands, paths, filenames, and architecture descriptions match the current
  repository.
- The document states whether guidance is required, recommended, temporary, or
  a known gap.
- Related docs are updated together when a change crosses boundaries. For
  example, questionnaire scoring changes should update both tests and
  `documentation/questionnaire_design.md`.

## Pull Request Checklist

Every pull request should include:

- A short summary of what changed.
- The reason for the change.
- Screenshots or screen recordings for visible mobile UI changes when useful.
- A list of tests and manual checks performed.
- Notes about migrations, environment variables, setup changes, or deployment
  steps.
- Known limitations or follow-up issues, if any.

Before requesting review, run the checks that apply to the files changed:

```bash
pytest
```

```bash
cd mobile
npx prettier --check .
npx eslint .
```

```bash
cd backend
ruff check .
black --check .
pytest
```

If a listed tool is not installed or not yet configured in the project, record
that in the pull request and include the strongest available substitute check.

## Acceptance Criteria vs. Definition of Done

Acceptance criteria describe what a specific story must do from a user's point
of view. This Definition of Done describes the quality bar that every completed
story or task must meet.

Example:

- Acceptance criterion: A user can complete the lifestyle questionnaire and see
  compatible roommate recommendations.
- Definition of Done criterion: The questionnaire fields save correctly, the
  matching inputs are validated, relevant backend tests pass, the flow was
  manually checked in Expo, and `documentation/questionnaire_design.md` is
  updated if scoring behavior changed.

## Maintaining This Document

Revisit this DoD during retrospectives or after defects escape review. If the
team repeatedly misses the same kind of issue, update this document with a
specific, checkable criterion that would have caught it.
