# HabiMatch Sprint 3 Report

Team HabiMatch

Project HabiMatch

Mary Tarevern, Koa Wolfe, Drake Griffin, James Yeh, Ethan Nguyen

May 19, 2026

## Actions to Stop Doing

As a team, we should stop leaving the user facing piece of a feature for last. The notification system works end to end on the backend, but the preference toggle in the profile UI never got finished, so from a user's point of view notifications are not fully controllable yet. We treated the UI as the easy part that could wait, and that is the exact piece that ended up unfinished.

We should also stop putting an entire feature on a single person. Filtering was almost completely owned by one teammate. It got done and it got done well, but it created a single point of failure and made it harder for anyone else to review the work or jump in if something had gone wrong.

## Actions to Start Doing

We should start finishing one feature fully before spreading ourselves across the next one. We had a lot of stubs in flight at the same time, which made it hard to tell what was actually usable versus what was only wired up.

We should also start writing a short manual test checklist for any feature that needs two users, like messaging. Testing direct messages and group chat properly meant coordinating two accounts on two devices, and because we often tested alone, we found some issues later than we should have.

For the next sprint, we should pull the UI tasks earlier in the sprint so they are not the thing that gets left unfinished at the end. The notification toggle would have been done if we had not saved it for last.

## Actions to Keep Doing

We should keep using the stub then real pattern. Building a stub endpoint first for notifications, messaging, and filtering let the frontend start right away against fixture data, and then we swapped in the real backend and connected the UI. This kept the frontend and backend moving in parallel instead of waiting on each other.

We should also keep pairing on the bigger backend pieces. Drake and Ethan pairing on the messaging backend helped a lot, since the conversations, participants, and messages schema with the group flag was the trickiest part of the sprint.

We should keep breaking each user story into small lettered tasks. Splitting each story into tasks A through F made the board easy to read and made it obvious who owned what and how far along each story was.

## Definition of Done

For this sprint, done means that a matched user can be notified of a mutual like, message their matches one on one or in a group, and filter potential matches by preferences such as age and gender.

A completed story should include the schema or migration, the backend logic or endpoint, a working UI, and enough integration that the feature can be used and tested with live data instead of only fixtures. The feature does not need to be fully polished, but it should be usable and clearly show the intended behavior.

## Work Completed

**US-302: As a user, I want to send and receive direct messages with my matches or create a group chat so that I can communicate with potential roommates.**
→ This story was completed. Koa designed and migrated the messaging schema using conversations, participants, and messages tables, with a single is_group flag so that direct messages and group chats share the same structure. Drake and Ethan built the stub messaging API and the DM conversation UI, then implemented the real messaging backend with database reads and writes. Drake built the group chat creation UI and connected the messaging UI to the live API. Users can now message their matches one on one or in a group.

**US-303: As a user, I want to filter potential matches by certain preferences (age, gender, etc) so that I can narrow my search.**
→ This story was completed. Drake added the filter fields to the profile schema, and Koa built the stub filter endpoint, the filter UI panel with dropdowns and sliders, the real filter logic as a parameterized query against profiles, and the connection from the UI to the live endpoint. Users can now narrow their matches by preferences like age and gender.

**US-301: As a user, I want the option to receive notifications when another user and I mutually like each other.**
→ This story was mostly completed but is not fully done. James added the notifications_enabled field to the profile schema and built the stub notification service. Mary built the mutual match detection logic against the likes table using seeded test data, wired real detection into the notification trigger, and integrated the service end to end so that detection, delivery, and the preference check all work together. The one remaining piece is the notification preference toggle in the profile UI, which is still in progress, so users cannot yet turn notifications on or off from their profile.

The following related tasks were completed:

- US-301-A: Added a notifications_enabled boolean to the user profile schema with a migration and a profile endpoint update.
- US-301-B: Built a stub notification service so that sendNotification returns a hardcoded success.
- US-301-C: Built the mutual match detection logic that detects when both users have liked each other, using seeded test data.
- US-301-D: Wired real match detection into the notification trigger so the stub is replaced with an actual call when a mutual like is recorded.
- US-301-F: Integrated the notification service end to end so that real detection, real delivery, and the preference check all work together.
- US-302-A: Designed and migrated the messaging schema with conversations, participants, and messages tables and an is_group flag.
- US-302-B: Built the stub messaging API for creating conversations and sending and reading messages.
- US-302-C: Built the DM conversation UI rendering fixture data.
- US-302-D: Built the group chat creation UI with a participant selector.
- US-302-E: Implemented the real messaging backend with database reads and writes.
- US-302-F: Connected the messaging UI to the real API and removed the fixture data.
- US-303-A: Added the filter fields to the profile schema.
- US-303-B: Built the stub filter endpoint.
- US-303-C: Built the filter UI panel with dropdowns and sliders.
- US-303-D: Implemented the real filter logic as a parameterized query against profiles.
- US-303-E: Connected the filter UI to the real endpoint and verified results update with live data.

## Work Not Completed

**US-301: As a user, I want the option to receive notifications when another user and I mutually like each other.**
This story is not fully completed. The backend is finished and the notification flow works end to end, but the user facing control is missing.

- US-301-E: Add the notification preference toggle to the profile UI. This task is still in progress. The notification system already honors the preference check on the backend, so this is the last piece needed for users to control notifications themselves, and we are carrying it forward.

## Work Completion Rate

During this sprint, the team completed 2 user stories out of the 3 planned sprint stories.

Completed user stories:

- US-302
- US-303

Not fully completed:

- US-301 (notification backend is done and works end to end, the notification preference toggle in the profile UI is still in progress)

User story completion rate: 2 out of 3 user stories completed

Completion percentage: 67%

Estimated ideal work hours completed: 44 out of 47 planned hours

Total sprint length: 2 weeks

User stories per day: 2/14 of a user story completed per day

Ideal work hours per day: 44/14 = 3.143 hours per day

For this sprint, the team finished the two larger communication and discovery features and got the notification system working end to end on the backend. The only remaining item is the notification preference toggle in the profile UI, which is a small piece with the backend already in place behind it. Overall the sprint was successful, and matched users can now message each other, create group chats, and filter their matches, which brings the core HabiMatch experience close to complete.