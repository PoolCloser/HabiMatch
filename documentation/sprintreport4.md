# HabiMatch Sprint 4 Report

Team HabiMatch

Project HabiMatch

Mary Tarevern, Koa Wolfe, Drake Griffin, James Yeh, Ethan Nguyen

June 2, 2026

## Actions to Stop Doing

As a team, we should stop adding new scope this late in the project. Because this was the final sprint, a few nice to have ideas came up that we had to set aside to keep the profile editing and the swipe experience solid for the presentation. We should stop letting late ideas pull us away from finishing what we already committed to.

We should also stop letting one person own too much of a single area. A lot of the profile and feed work landed on one teammate, and while it got done, it made the work harder for others to review and would have been risky if that person had gotten busy. Spreading ownership earlier would have made the sprint safer.

## Actions to Start Doing

We should start doing a full run through of the app before any presentation, going through it as if we were a brand new user, so we catch rough edges before anyone else does.

We should also start writing down the small bugs we notice as we find them instead of fixing them on the spot and forgetting the rest. A short running list would have made the final polish more organized.

If we kept working past this sprint, we would also start splitting the larger feature areas across more people from day one so that no single area depends on one person.

## Actions to Keep Doing

We should keep reusing existing flows instead of rebuilding them. Reusing the questionnaire for preference editing saved a lot of time and kept the editing experience consistent with the original onboarding.

We should also keep polishing the core interactions. The swipe gestures and the default photo fix made the app feel much more finished, and small touches like these had a big effect on how complete the product feels.

We should keep breaking each user story into small lettered tasks. As in the earlier sprints, this kept the board readable and made it clear who owned what.

## Definition of Done

For this sprint, done means a user can view and edit their profile and update their preferences, and can browse potential roommates by swiping with their real profile photos showing.

A completed story should include the UI, the backend or endpoint behavior, and enough integration that the feature works reliably with live data. The feature does not need further polish beyond this, but it should be stable enough to demo.

## Work Completed

**US-401: As a user, I want to view and edit my profile so that I can keep my information up to date.**
→ This story was completed. Drake moved the account actions behind the profile settings gear, added the update preferences entry point that sends users back into the questionnaire flow, supported a questionnaire edit mode by reusing the current questionnaire, and improved profile editing persistence so edits remain reliable. Mary hardened the profile update endpoint with server side validation and clear error handling. Ethan added profile photo validation and storage handling and collaborated on the default photo fix. Users can now view and edit their profile and update their preferences reliably.

**US-402: As a user, I want to browse potential roommates by swiping so that finding matches feels fast and natural.**
→ This story was completed. Drake fixed the default photo selection by removing the hardwired "HA" profile picture so each profile shows its own photo, and added swiping so users swipe left or right depending on preference and swipe down to refresh. Koa added a refresh endpoint that returns a fresh batch of suggested profiles on swipe down. James added swipe animations and visual feedback with card tilt and like and pass overlays. Browsing potential roommates now feels fast and natural.

The following related tasks were completed:

- US-401-A: Moved the account actions into the profile settings gear to clean up the profile tab.
- US-401-B: Added the update preferences entry point that sends the user back into the questionnaire flow.
- US-401-C: Supported a questionnaire edit mode by reusing the current questionnaire for preference updates.
- US-401-D: Improved profile editing persistence so profile info edits remain reliable.
- US-401-E: Hardened the profile update endpoint with server side validation and clear error handling.
- US-401-F: Added profile photo validation and storage handling, in collaboration on the default photo fix.
- US-402-A: Fixed the default photo selection by removing the hardwired "HA" profile picture (issue #51).
- US-402-B: Added swiping so users swipe left or right for preference and down to refresh (issue #52).
- US-402-C: Added a refresh endpoint that returns a fresh batch of suggested profiles on swipe down.
- US-402-D: Added swipe animations and visual feedback with card tilt and like and pass overlays.

## Work Not Completed

None. All planned tasks for this sprint were completed.

## Work Completion Rate

During this sprint, the team completed 2 user stories out of the 2 planned sprint stories.

Completed user stories:

- US-401
- US-402

Not fully completed:

- None

User story completion rate: 2 out of 2 user stories completed

Completion percentage: 100%

Estimated ideal work hours completed: 28 out of 28 planned hours

Total sprint length: 2 weeks

User stories per day: 2/14 of a user story completed per day

Ideal work hours per day: 28/14 = 2.0 hours per day

This was the final development sprint, focused on polishing the profile experience and the swipe feed ahead of the final presentation. With these features done, HabiMatch now covers the full experience, from creating a profile and getting matched, to being notified of a mutual like, messaging and group chatting with matches, filtering potential matches, and viewing and editing your own profile. The sprint was a success and the product is ready to demo.