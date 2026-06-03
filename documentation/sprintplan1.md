# Sprint 1 Plan

## HabiMatch

| Field | Value |
|---|---|
| Document name | Sprint 1 Plan |
| Product name | HabiMatch |
| Team name | Team HabiMatch |
| Sprint completion date | April 21, 2026 |
| Revision number | 1.0 |
| Revision date | April 7, 2026 |

## Goal

Set up the foundation of HabiMatch and get user accounts working. By the end of this sprint a new user should be able to register with an email and password, log in, and start building a profile by answering the lifestyle questions. This sprint is about getting the infrastructure, authentication, and basic profile creation in place so that later sprints have something solid to build the matching features on.

## Task Listing (by User Story)

User stories are listed in priority order, most important first.

### User Story 1 (US-101): As a new user, I want to register with my email and password so that I can create an account. (3 SP)

| Task | Time estimate |
|---|---|
| T-101a: Set up the project repository, backend scaffold, and the users database schema. | 4 hrs |
| T-101b: Build the registration API endpoint with email and password, including password hashing and input validation. | 4 hrs |
| T-101c: Implement authentication and the login flow with session or token handling. | 3 hrs |
| T-101d: Build the registration and login UI. | 3 hrs |
| **Total for User Story 1 (US-101)** | **14 hours** |

### User Story 2 (US-102): As a user, I want to answer a lifestyle profile with relevant questions so that I can be matched with compatible roommates. (5 SP)

| Task | Time estimate |
|---|---|
| T-102a: Write the lifestyle profile questions based on the design document. | 2 hrs |
| T-102b: Build the profile API endpoint to save and load user lifestyle answers. | 4 hrs |
| T-102c: Build the lifestyle questionnaire UI. | 4 hrs |
| T-102d: Connect the questionnaire UI to the profile API so the answers save to the user profile. | 3 hrs |
| **Total for User Story 2 (US-102)** | **13 hours** |

### User Story 3 (US-103): As a user, I want to upload a profile photo so that potential matches can see who I am. (3 SP)

| Task | Time estimate |
|---|---|
| T-103a: Build the profile photo upload API endpoint with image storage. | 4 hrs |
| T-103b: Build the profile photo upload UI with a preview. | 3 hrs |
| **Total for User Story 3 (US-103)** | **7 hours** |

**Total planned effort for Sprint 1: 34 ideal hours (14 story points)**

## Team Roles

| Team member | Role(s) for this sprint |
|---|---|
| Mary Tarevern | Scrum Master, Backend Developer |
| Koa Wolfe | Backend Developer |
| Drake Griffin | Frontend Developer |
| James Yeh | Frontend Developer |
| Ethan Nguyen | Product Owner, Full-stack Developer |

## Initial Task Assignment

| Team member | User story | Initial task |
|---|---|---|
| Mary Tarevern | US-101 | T-101a: Set up the repository, backend scaffold, and users database schema. |
| Koa Wolfe | US-101 | T-101b: Build the registration API endpoint with hashing and validation. |
| James Yeh | US-101 | T-101d: Build the registration and login UI. |
| Ethan Nguyen | US-102 | T-102b: Build the profile API endpoint for lifestyle answers. |
| Drake Griffin | US-102 | T-102c: Build the lifestyle questionnaire UI. |

## Initial Burnup Chart

Sprint 1, HabiMatch. The physical, labeled burnup chart is posted in the lab. The total planned scope is 34 ideal hours over the two week sprint, and the planned (ideal) burnup rises from 0 to 34 at about 2.43 ideal hours per day. At the start of the sprint no work is completed yet.

| Sprint day | Total scope (ideal hrs) | Planned (ideal) burnup |
|---|---|---|
| 0 | 34 | 0.0 |
| 2 | 34 | 4.9 |
| 4 | 34 | 9.7 |
| 6 | 34 | 14.6 |
| 8 | 34 | 19.4 |
| 10 | 34 | 24.3 |
| 12 | 34 | 29.1 |
| 14 | 34 | 34.0 |

## Initial Scrum Board

Sprint 1, HabiMatch. The physical scrum (task) board is posted in the lab and labeled with the sprint number and project name. Each task sits in the same row as its user story. At the start of the sprint nothing is in the Tasks Completed column, and the tasks that have an owner are placed in Tasks In Progress.

| User Stories | Tasks Not Started | Tasks In Progress | Tasks Completed |
|---|---|---|---|
| US-101 | T-101c | T-101a, T-101b, T-101d | |
| US-102 | T-102a, T-102d | T-102b, T-102c | |
| US-103 | T-103a, T-103b | | |

## Scrum Times

The team will hold Scrum meetings at the following times each week. The TA or tutor will visit the Friday lab time meeting, as arranged.

| Day | Time | Notes |
|---|---|---|
| Monday | 10:00 to 10:15 AM | Daily Scrum (stand-up) |
| Wednesday | 10:00 to 10:15 AM | Daily Scrum (stand-up) |
| Friday | 2:00 to 3:00 PM | Lab time Scrum, TA or tutor visits |

## Release Plan

No changes were made to the release plan during Sprint 1 planning, so no updated release plan is submitted with this document.