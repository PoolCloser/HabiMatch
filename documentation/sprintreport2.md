# HabiMatch Sprint 2 Report

Team HabiMatch

Project HabiMatch

Mary Tarevern, Koa Wolfe, Drake Griffin, James Yeh, Ethan Nguyen

May 05, 2026

## Actions to Stop Doing

As a team, we should stop waiting too long to push changes. When changes stay local for too long, it becomes harder for the rest of the team to know what is actually finished and what still needs work. It also makes integration more stressful near the end of the sprint.

We should also stop vaguely separating user stories into tasks. Some tasks were clear, but others could have been broken down more specifically. When tasks are not specific enough, it is harder to track progress and know who is responsible for each part.

## Actions to Start Doing

We should start pushing changes more often throughout the sprint. Even if a feature is not completely perfect yet, smaller updates make it easier for the team to review work, catch issues earlier, and stay on the same page.

We should also start writing tasks with clearer ownership and a clearer definition of what "done" means. For example, instead of only saying that a user story needs a compatibility breakdown, we should specify whether that includes the backend score, the UI, mock data, or full integration.

For the next sprint, we should also check in earlier on tasks that depend on another teammate's work. The compatibility score breakdown was close to finished, but we were not fully sure if that part was completed. A quicker mid-sprint check-in would help avoid that confusion.

## Actions to Keep Doing

We should keep breaking larger user stories into smaller tasks. This helped us make progress on the matching algorithm, roommate feed, and compatibility breakdown without treating each user story as one huge piece of work.

We should also keep using mock data when needed. Using hardcoded roommate profiles and mock scores made it easier to build the feed UI and compatibility UI before everything was fully connected.

We should keep focusing on the core matching experience first. This sprint was centered on the main feature of the app: helping users find compatible roommates. That was the right priority because the matching algorithm and feed are the main parts of HabiMatch.

## Definition of Done

For this sprint, "done" means that the app has an adequate matching algorithm and a user interface that allows users to view and evaluate suggested roommate matches.

A completed story should include the necessary backend logic or mock endpoint, a working UI, and enough integration for the feature to be tested in the app. The feature does not need to be final-polished, but it should be usable and clearly show the intended behavior.

## Work Completed

**US-201: As a user, I want the app to match me based on what matters most to me as a housemate.**
→ This was completed through the scoring algorithm task. The team designed and implemented the matching logic using weights, inputs, and scoring rules.

**US-202: As a user, I want a swipeable feed of suggested roommates so that I can evaluate potential matches.**
→ This was completed through the feed API endpoint, roommate feed UI, and feed integration tasks. The app can now show suggested roommate profiles using the feed.

**US-203: As a user, I want to see my compatibility score and a brief breakdown on a profile.**
→ This story was completed during the sprint. The team built the compatibility breakdown UI using mock score data, which lets users see their compatibility score and a short explanation on a roommate profile. This helps users understand why a match is being suggested instead of only seeing a number.

The following related tasks were completed:

- T-201: Designed and implemented the scoring algorithm with weights, inputs, and logic.
- T-202a: Built the feed API endpoint that returns a hardcoded list of mock roommate profiles.
- T-202b: Built the roommate feed UI.
- T-202c: Integrated the feed UI with the live feed API endpoint.
- T-203a: Build the compatibility breakdown UI.
- Refined questionnaire: Updated the questionnaire to better follow the structure outlined in the design document.

## Work Not Completed

None.

## Work Completion Rate

During this sprint, the team completed 3 user stories out of the planned sprint stories.

Completed user stories:

- US-201
- US-202
- US-203

Not fully completed:

- None

User story completion rate: 3 out of 3 user stories completed

Completion percentage: 100%

Estimated ideal work hours completed: 20 hours

Total sprint length: 2 weeks

User stories per day: 3/14 of a user story completed per day

Ideal work hours per day: 20/14 = 1.429 hours per day

For this sprint, the team made strong progress and finished the main matching and feed features. The only major item that still needs review is the compatibility score breakdown. Overall, the sprint was mostly successful, with the app's core matching flow now close to working end-to-end.