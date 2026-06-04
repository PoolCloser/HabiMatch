# HabiMatch Sprint 3 Plan

Team HabiMatch

Project HabiMatch

Mary Tarevern, Koa Wolfe, Drake Griffin, James Yeh, Ethan Nguyen

| Field | Value |
|---|---|
| Document name | Sprint 3 Plan |
| Product name | HabiMatch |
| Team name | Team HabiMatch |
| Sprint completion date | May 19, 2026 |
| Revision number | 1.0 |
| Revision date | May 6, 2026 |

## Goal

Build the features that let matched users connect and refine their search now that core matching is in place. This sprint focuses on mutual like notifications, direct and group messaging, and preference based filtering so that users can actually act on their matches instead of just seeing them.

## Task Listing (by User Story)

User stories are listed in priority order, most important first.

### User Story 1 (US-301), Priority High: As a user, I want the option to receive notifications when another user and I mutually like each other.

| Task | Time estimate |
|---|---|
| US-301-A: Add a notifications_enabled boolean to the user profile schema (DB migration plus an update to the profile endpoint). | 2 hrs |
| US-301-B: Build a stub notification service so that sendNotification(userId, type, payload) returns a hardcoded success. | 2 hrs |
| US-301-C: Build the mutual match detection logic that queries the likes table, detects when both users have liked each other, and returns the matched pair (uses seeded test data, not real likes). | 3 hrs |
| US-301-D: Wire real match detection into the notification trigger, replacing the stub with an actual call when a mutual like is recorded. | 2 hrs |
| US-301-E: Add the notification preference toggle to the profile UI (calls the real profile endpoint, notification sending can still be stubbed). | 3 hrs |
| US-301-F: Integrate the notification service end to end so that real detection, real delivery, and the preference check all work together. | 3 hrs |
| **Total for User Story 1 (US-301)** | **15 hours** |

### User Story 2 (US-302), Priority High: As a user, I want to send and receive direct messages with my matches or create a group chat so that I can communicate with potential roommates.

| Task | Time estimate |
|---|---|
| US-302-A: Design and migrate the messaging schema with conversations, participants, and messages tables, where a single is_group flag supports both DM and group chat. | 3 hrs |
| US-302-B: Build a stub messaging API for POST /conversations, POST /conversations/:id/messages, and GET /conversations/:id/messages that returns hardcoded fixtures. | 3 hrs |
| US-302-C: Build the DM conversation UI that renders hardcoded fixture data, with the send button wired but not yet active. | 4 hrs |
| US-302-D: Build the group chat creation UI with a participant selector that submits to the stub endpoint. | 3 hrs |
| US-302-E: Implement the real messaging backend, replacing the stubs with database reads and writes. | 4 hrs |
| US-302-F: Connect the messaging UI to the real API, removing fixture data and wiring send and receive to the live endpoints. | 4 hrs |
| **Total for User Story 2 (US-302)** | **21 hours** |

### User Story 3 (US-303), Priority Medium: As a user, I want to filter potential matches by certain preferences (age, gender, etc) so that I can narrow my search.

| Task | Time estimate |
|---|---|
| US-303-A: Add filter fields to the profile schema if not already present (age, gender, and so on), migration only. | 1 hr |
| US-303-B: Build a stub filter endpoint, GET /matches with age_min, age_max, and gender parameters, that returns a hardcoded list regardless of the parameters. | 2 hrs |
| US-303-C: Build the filter UI panel with dropdowns and sliders that calls the stub endpoint and renders results. | 3 hrs |
| US-303-D: Implement the real filter logic in the backend, replacing the stub with a parameterized query against profiles. | 3 hrs |
| US-303-E: Connect the filter UI to the real endpoint and verify results update correctly with live data. | 2 hrs |
| **Total for User Story 3 (US-303)** | **11 hours** |

**Total planned effort for Sprint 3: 47 ideal hours**

## Team Roles

| Team member | Role(s) for this sprint |
|---|---|
| Koa Wolfe | Product Owner, Full-stack Developer |
| Mary Tarevern | Scrum Master, Backend Developer |
| Drake Griffin | Frontend Developer |
| James Yeh | Frontend Developer |
| Ethan Nguyen | Backend Developer |

## Initial Task Assignment

| Team member | User story | Initial task |
|---|---|---|
| Mary Tarevern | US-301 | US-301-C: Build the mutual match detection logic. |
| James Yeh | US-301 | US-301-A: Add the notifications_enabled boolean to the profile schema. |
| Koa Wolfe | US-302 | US-302-A: Design and migrate the messaging schema. |
| Drake Griffin | US-302 | US-302-B: Build the stub messaging API (with Ethan). |
| Ethan Nguyen | US-302 | US-302-B: Build the stub messaging API (with Drake). |

## Initial Burnup Chart

| Sprint day | Total scope (ideal hrs) | Planned (ideal) burnup |
|---|---|---|
| 0 | 47 | 0.0 |
| 2 | 47 | 6.7 |
| 4 | 47 | 13.4 |
| 6 | 47 | 20.1 |
| 8 | 47 | 26.9 |
| 10 | 47 | 33.6 |
| 12 | 47 | 40.3 |
| 14 | 47 | 47.0 |


<img width="600" height="371" alt="image" src="https://github.com/user-attachments/assets/395a4a9b-8113-4af3-aa91-15ca8b8efadd" />


## Initial Scrum Board

Sprint 3, HabiMatch. The physical scrum (task) board is posted in the lab and labeled with the sprint number and project name. Each task sits in the same row as its user story. At the start of the sprint nothing is in the Tasks Completed column, and the tasks that have an owner are in Tasks In Progress.

| User Stories | Tasks Not Started | Tasks In Progress | Tasks Completed |
|---|---|---|---|
| US-301 | US-301-B, US-301-D, US-301-E, US-301-F | US-301-A, US-301-C | |
| US-302 | US-302-C, US-302-D, US-302-E, US-302-F | US-302-A, US-302-B | |
| US-303 | US-303-A, US-303-B, US-303-C, US-303-D, US-303-E | | |

## Scrum Times

**Monday**
- 4:00 PM to 5:00 PM: Team Meeting with TA
- 5:00 PM to 5:30 PM: Team Meeting

**Thursday**
- 1:30 PM to 2:30 PM: Team Meeting

**Friday**
- 3:30 PM to 4:00 PM: Team Meeting

The TA visits the Monday 4:00 PM to 5:00 PM meeting.

## Release Plan

No changes were made to the release plan during Sprint 3 planning, so no update to the related plan was submitted.
