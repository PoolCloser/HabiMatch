# HabiMatch Style Guide

This guide defines the baseline code style for HabiMatch. It is based on common industry standards

HabiMatch currently uses:

- TypeScript with React Native and Expo in `mobile/`
- Python with FastAPI, Pydantic, SQLAlchemy, and pytest in `backend/`
- SQL migrations and policies for Supabase in `supabase/`

## General Standards

- Prefer clear, direct code over abstractions.
- Name things after the domain concept they represent.
- Avoid unrelated refactors in feature or bug-fix changes.
- Keep formatting consistent with nearby code.
- Use comments sparingly. Add comments only when they explain non-obvious reasoning, constraints, or business rules.
- Do not commit secrets, API keys, local environment files, generated caches, or build artifacts.
- Treat tests as part of the implementation. Add or update tests when behavior changes.

## File Organization

- Keep mobile UI screens in `mobile/src/screens/`.
- Keep reusable mobile helpers and service wrappers in `mobile/src/lib/`.
- Keep backend route and app wiring in `backend/app/`.
- Keep backend domain models, schemas, and API routers in `backend/models/`.
- Keep backend tests in `backend/tests/`.
- Keep Supabase schema and policy changes in timestamped files under `supabase/migrations/`.
- Prefer one focused responsibility per file. Split files when unrelated concerns start accumulating.

## TypeScript and React Native

Use TypeScript's strict mode as the baseline. The project already enables `"strict": true` in `mobile/tsconfig.json`.

### Formatting

- Use two-space indentation.
- Use single quotes for strings unless interpolation or escaping makes another form clearer.
- Use semicolons.
- Keep imports grouped in this order:
  - React and React Native imports
  - third-party package imports
  - local imports
- Prefer named exports for shared utilities and types.
- Use default exports for React screen components when consistent with existing screen files.

### Types

- Avoid `any`. Use explicit types, unions, generics, or `unknown` with narrowing.
- Define local component props with a `Props` type near the component.
- Use string literal unions for fixed sets of values.
- Prefer `type` for object shapes and unions unless an interface is needed for extension.
- Keep API-facing types aligned with backend schemas.
- Use camelCase in TypeScript even when backend or database fields use snake_case. Convert deliberately at API boundaries.

### React Components

- Use function components.
- Keep state as local as possible.
- Derive values from state instead of duplicating state.
- Keep event handlers small and named by intent, such as `handleNext` or `handleSelect`.
- Avoid large components that mix data fetching, transformation, and rendering. Extract helpers or child components when the split improves readability.
- Prefer `StyleSheet.create` for React Native styles.
- Keep shared colors, spacing, and reusable style tokens as constants when they are used in multiple places.
- Follow React hooks rules: only call hooks at the top level, never inside conditions or loops. List all reactive values in `useEffect` dependency arrays — do not suppress exhaustive-deps warnings without a comment explaining why.

### Mobile UX Code

- Handle loading, empty, disabled, and error states explicitly.
- Validate user input before submitting.
- Make buttons visibly disabled when an action cannot run.
- Avoid hard-coded values that make layouts brittle across device sizes.
- Keep user-facing copy concise and consistent in tone.
- Add `accessibilityLabel` and `accessibilityHint` to interactive elements that lack visible text labels, such as icon buttons and image-only touchables.

## Python

Follow PEP 8 as the default Python style, with modern type hints where they improve clarity.

### Formatting

- Use four-space indentation.
- Use snake_case for functions, variables, modules, and test names.
- Use PascalCase for classes and Pydantic models.
- Use UPPER_SNAKE_CASE for constants.
- Keep imports grouped in this order:
  - standard library
  - third-party packages
  - local application imports
- Keep lines at or under 88 characters. Prefer wrapping expressions over dense one-liners. (88 matches Black's default and avoids reformatting conflicts.)

### Types and Models

- Use type hints for public functions, helpers with non-obvious inputs, and API-facing code.
- Use Pydantic models for request and response validation.
- Put validation close to the data model when possible.
- Prefer explicit return types for functions that are used across modules.
- Avoid broad `dict` structures for API contracts when a Pydantic model is practical.

### FastAPI

- Keep route handlers thin. Move reusable business logic into helper modules.
- Use `Depends` for authentication and request-scoped dependencies.
- Set `response_model` for endpoints that return structured data.
- Return predictable error messages and status codes.
- Keep mock/demo data clearly marked and replace it with database-backed behavior when implementing production flows.

### Business Logic

- Keep matching and scoring logic deterministic and independently testable.
- Store important constants at module level with descriptive names.
- Prefer pure helper functions for calculations.
- Round externally visible numeric scores consistently.
- Keep frontend mirrors of backend logic explicitly documented and synchronized.

## SQL and Supabase

Use readable, migration-oriented SQL. Every database change should be repeatable and reviewable.

### Migrations

- Put migrations in `supabase/migrations/` using Supabase's timestamped naming convention.
- Use lowercase SQL keywords.
- Use snake_case for table names, column names, constraints, and policies.
- Prefer explicit constraints for required domain rules.
- Include `if not exists` or `drop policy if exists` where it makes migrations safe to re-run.
- Keep one migration focused on one schema or policy change.

### Row Level Security

- Enable row level security for user-owned tables.
- Write policies with clear names that describe who can do what.
- Keep policy checks explicit, such as `auth.uid() = user_id`.
- Grant only the permissions needed by the application.

## Testing

### Python Tests

- Use pytest for backend tests.
- Name test files `test_*.py`.
- Name tests by behavior, such as `test_matching_requires_auth`.
- Arrange tests as setup, action, assertion.
- Prefer fixtures for repeated setup.
- Cover authentication, validation, successful behavior, and important failure cases.
- Add regression tests when fixing bugs.

### Mobile Tests

The current mobile app does not include a configured test runner. Until one is added:

- Keep logic-heavy code in testable helper functions under `mobile/src/lib/`.
- Manually verify changed screens in Expo.
- Add a test setup before introducing complex shared UI or business logic.

## Error Handling

- Show user-friendly messages in the mobile app.
- Preserve useful technical detail in backend errors and logs.
- Avoid swallowing errors silently.
- Convert unknown error values safely before reading properties.
- Do not expose secrets, tokens, or internal stack traces to users.

## API and Data Naming

- Use snake_case for Python, SQL, and Supabase fields.
- Use camelCase for TypeScript variables and object properties.
- Convert names explicitly at boundaries instead of mixing styles throughout a module.
- Keep shared concepts named consistently across frontend, backend, and database.
- Document temporary compatibility mappings when frontend and backend names differ.

## Pull Requests and Reviews

- Branch from the latest `main`.
- Use descriptive branch names, such as `feature/profile-photo-upload` or `fix/login-token-error`.
- Keep commits focused. Write messages in the imperative with a short subject line, e.g. `fix login token refresh` or `add profile photo upload`. Mention what changed and why if the reason is not obvious from the diff.
- Open a pull request for review before merging.
- Include what changed, why it changed, and how it was tested.
- Review for correctness, security, edge cases, naming, and test coverage.

## Recommended Commands

From the repository root:

```bash
cd backend
pytest
```

```bash
cd mobile
npm install
npx expo start --clear
```

Run the following checks before opening a pull request:

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
