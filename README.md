# HabiMatch

HabiMatch is a roommate-matching platform like a dating app, but for finding compatible roommates. Users create a profile, answer a lifestyle questionnaire, and are shown ranked recommendations based on compatibility. Built as a team project for CSE 115A.

---

## Architecture Overview

The app is divided into four main layers:

### Frontend
The client-facing application. Handles user interaction including profile creation, questionnaire flow, and browsing match recommendations. Communicates with the backend exclusively through the API.

### Backend / API
The server layer. Handles routing, authentication, and business logic. Acts as the bridge between the frontend and the database, and orchestrates calls to the matching algorithm.

### Database
Stores all persistent data: user accounts, profile details, questionnaire responses, and precomputed or cached match data.

### Matching Algorithm
Takes a user's questionnaire responses and compares them against other users' data to produce a ranked list of compatible roommates. Lives as a module within the backend, keeping the logic encapsulated and independently testable.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React Native |
| Backend + Algorithm | Python |
| Database | Supabase |

> Note: The matching algorithm is not a separate service, it lives as a module within the backend.

---

## Git Best Practices

To keep our codebase clean and avoid stepping on each other's work, follow these guidelines:

### Never push directly to `main`
`main` should always reflect a working, stable version of the app. All changes go through branches and pull requests.

### Branch for everything
Create a new branch for each feature, bug fix, or task you're working on. Use descriptive names that make the purpose clear:
- `feature/user-profile-page`
- `fix/login-redirect-bug`
- `chore/update-dependencies`

### Keep branches short-lived
Branches that diverge from `main` for a long time become harder to merge. Break work into small, focused chunks and merge often.

### Open a Pull Request (PR) when your work is ready
When your branch is ready to merge, open a PR. Write a short description of what changed and why.

### Get at least one teammate to review your PR
Don't merge your own PR without a second set of eyes. Reviewers help catch bugs, inconsistencies, and things the author may have missed. Aim for at least one approval before merging.

### Pull before you push
Before starting work or opening a PR, pull the latest changes from `main` to minimize merge conflicts:
```
git checkout main
git pull
git checkout your-branch
git merge main
```

### Write meaningful commit messages
A good commit message explains what changed and why, not just how:
- Bad: `fix stuff`
- Good: `fix redirect loop on login when session token is missing`
