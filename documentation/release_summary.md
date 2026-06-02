# Habimatch – Release Summary

**Product Name** : Habimatch

---

# User Stories & Acceptance Criteria

## User Story 1: User Registration - Sprint 1 - 3 Story Points

**As a new user, I want to register with my email and password so that I can create an account.**

### Acceptance Criteria

* The user can register using a valid email address and password.
* The system validates that the email address is in a valid format.
* The password must meet defined security requirements.
* An error message is displayed if the email is already associated with an existing account.

---

## User Story 2: Lifestyle Profile Creation - Sprint 1 - 5 Story Points

**As a user, I want to answer a lifestyle profile with relevant questions so that I can be matched with compatible roommates.**

### Acceptance Criteria

* The user is presented with a lifestyle questionnaire during profile setup.
* Questions cover relevant roommate compatibility topics such as cleanliness, sleep schedule, guests, pets, smoking, and social habits.
* The user can save and submit their responses.
* All required questions must be completed before submission.
* The user's responses are stored and used in the roommate matching process.

---

## User Story 3: Profile Photo Upload - Sprint 1 - 3 Story Points

**As a user, I want to upload a profile photo so that potential matches can see who I am.**

### Acceptance Criteria

* The user can upload a profile photo from their device.
* Supported image formats include JPG, JPEG, HEIC, HEIF, and PNG.
* The uploaded image is displayed on the user's profile.
* The user can replace or remove their profile photo at any time.

---

## User Story 4: Compatibility-Based Matching - Sprint 2 - 8 Story Points

**As a user, I want the app to match me based on what matters most to me as a housemate, so that I can see how well I match with a potential roommate.**

### Acceptance Criteria

* The system calculates compatibility using lifestyle questionnaire responses.
* The matching algorithm prioritizes factors identified as important by the user.
* Users are shown potential roommates ranked by compatibility.
* Compatibility scores are generated consistently based on stored profile data.
* Match results update when a user changes their profile or preferences.

---

## User Story 5: Swipeable Roommate Feed - Sprint 2 - 5 Story Points

**As a user, I want a swipeable feed of suggested roommates so that I can evaluate potential matches.**

### Acceptance Criteria

* Users are presented with a feed of recommended roommate profiles.
* Users can swipe right to express interest and swipe left to pass.
* Profiles that have already been swiped on are not repeatedly displayed.
* Additional profiles load automatically as the user continues swiping.

---

## User Story 6: Compatibility Score & Match Breakdown - Sprint 2 - 3 Story Points

**As a user, I want to see my compatibility score and a brief breakdown on a profile so that I understand why someone was suggested to me.**

### Acceptance Criteria

* Each suggested roommate profile displays a compatibility score.
* Users can view a brief explanation of key compatibility factors.
* The breakdown highlights both similarities and potential differences.
* Compatibility information is based on the latest profile and questionnaire data.
* The score and explanation are easy to understand and visually accessible.

---

## User Story 7: Match Notifications - Sprint 3 - 5 Story Points

**As a user, I want the option to receive notifications when another user and I mutually like each other.**

### Acceptance Criteria

* Users can enable or disable match notifications in settings.
* A notification is generated when two users mutually like each other.
* Users do not receive notifications when the feature is disabled.

---

## User Story 8: Messaging & Group Chats - Sprint 3 - 5 Story Points

**As a user, I want to send and receive direct messages with my matches or create a group chat so that I can communicate with potential roommates.**

### Acceptance Criteria

* Users can send and receive direct messages with matched users.
* Messages are delivered and displayed in real time or near real time.
* Users can view message history within conversations.
* Users can create a group chat and invite eligible participants.
* Group chat members can send and receive messages within the group.
* Users receive notifications for new messages when notifications are enabled.

---

## User Story 9: Match Filters - Sprint 3 - 3 Story Points

**As a user, I want to filter potential matches by certain preferences (age, gender, etc.) so that I can narrow my search.**

### Acceptance Criteria

* Users can apply filters such as age range, gender, smoking preferences, pet preferences, and other available criteria.
* Filter selections are applied to roommate recommendations.
* Users can update or clear filters at any time.
* Filter preferences are saved between sessions.
* The system displays only profiles that meet the selected filter criteria.

---

## User Story 10: View & Edit Profile - Sprint 4 - 3 Story Points

**As a user, I want to view and edit my profile so that I can keep my information up to date.**

### Acceptance Criteria

* Users can view all profile information from a dedicated profile page.
* Users can edit personal information, lifestyle preferences, and profile details.
* Users can update their profile photo.
* Changes are saved successfully and reflected immediately in the user's profile.
* Users receive confirmation when profile updates are successfully saved.

---

# Known Problems:
Swiping feature is occasionally buggy and may not consistently register user swipe actions.

# Product Backlog:
## User Story 11: Enable Push Notifications
As a user, I want to receive a push notification when I get a new match so that I can quickly connect with compatible roommates.

# Release Goal

The goal of this release is to provide users with a complete roommate-matching experience, including account creation, profile setup, compatibility-based matching, profile discovery, communication tools, notifications, and profile management.
