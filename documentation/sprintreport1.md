# HabiMatch Sprint 1 Report

Mary Tarevern, Koa Wolfe, Drake Griffin, James Yeh, Ethan Nguyen

April 21, 2026

## Actions to Stop Doing

As a team, we should stop underestimating how long setup and infrastructure takes. Getting the repository, backend scaffold, and database schema ready took longer than we expected, and that pushed some of the other work later into the sprint than we wanted.

We should also stop treating big pieces of work like authentication as a single task. Authentication ended up being larger than one task, and because it was not broken down, it was hard to tell how far along it actually was until late in the sprint.

## Actions to Start Doing

We should also start writing clearer acceptance criteria for each task so that we all agree on what counts as done. For example, instead of saying a task is just registration, we should say whether that includes the API, the validation, etc.

For the next sprint, we should check in earlier on tasks that block other people. The database schema and authentication were both things that the UI work depended on, and a quicker check-in would have helped the frontend get started sooner.

## Actions to Keep Doing

We should keep pairing up on the harder backend pieces. Pairing on authentication helped us catch problems with session handling earlier than we would have alone.

We should also keep using a shared design document for the questionnaire and profile structure. Having the lifestyle questions written down ahead of time made it much easier to build the questionnaire UI and the profile endpoint.


## Definition of Done

For this sprint, done means that a new user can register with an email and password, log in through a working login UI, and create a profile by answering the lifestyle questions. A completed story should include the backend logic or endpoint, a working UI, and enough integration that the feature can actually be used and tested in the app. The work does not need to be fully polished, but it should clearly show the intended behavior.

## Work Completed

**US-101: As a new user, I want to register with my email and password so that I can create an account.**
This story was completed. A new user can now register with an email and password and log in to the app. Mary set up the repository, backend scaffold, and the users database schema. Koa built the registration API endpoint with password hashing and input validation, and Koa and Mary paired on the authentication and login flow. James built the registration and login UI and connected it to the endpoints.

**US-102: As a user, I want to answer a lifestyle profile with relevant questions so that I can be matched with compatible roommates.**
This story was completed. Users can now answer the lifestyle questions and have their answers saved to their profile. Ethan wrote the lifestyle questions from the design document and built the profile API endpoint to save and load the answers. Drake built the questionnaire UI, and Drake and Ethan connected it to the profile endpoint so the answers persist.

The following related tasks were completed:

- T-101a: Set up the project repository, backend scaffold, and users database schema.
- T-101b: Built the registration API endpoint with email and password, hashing, and validation.
- T-101c: Implemented authentication and the login flow with session handling.
- T-101d: Built the registration and login UI.
- T-102a: Wrote the lifestyle profile questions based on the design document.
- T-102b: Built the profile API endpoint to save and load user lifestyle answers.
- T-102c: Built the lifestyle questionnaire UI.
- T-102d: Connected the questionnaire UI to the profile API so answers save to the user profile.
- T-103a: Built the profile photo upload API endpoint with image storage.

## Work Not Completed

**US-103: As a user, I want to upload a profile photo so that potential matches can see who I am.**
This story was not fully completed. The backend side is done, since Koa built the photo upload API endpoint with image storage (T-103a). The part that is left is the profile photo upload UI with a preview (T-103b). James started on it but the foundation and authentication work took priority, so the UI was not finished in time to integrate and test. We are carrying T-103b into the next sprint.

## Work Completion Rate

During this sprint, the team completed 2 user stories out of the 3 planned sprint stories.

Completed user stories:

- US-101
- US-102

Not fully completed:

- US-103 (photo upload API is done, photo upload UI is not finished)

User story completion rate: 2 out of 3 user stories completed

Completion percentage: 67%

Estimated ideal work hours completed: 31 out of 34 planned hours

Total sprint length: 2 weeks

User stories per day: 2/14 of a user story completed per day

Ideal work hours per day: 31/14 = 2.214 hours per day

For this sprint, the team got the foundation in place and finished the account and profile features that everything else depends on. The main piece left over is the profile photo upload UI, which is small and already has its backend ready. Overall the sprint was a solid start, and HabiMatch now has working registration, login, and profile creation.
