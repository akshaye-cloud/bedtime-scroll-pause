# Bedtime Scroll Pause

Build a functional, responsive web application called as Pause - a Bedtime Scrolling Assistant.

## 1. Product purpose

Help people who intend to stop using their phones at bedtime record and follow their intended stopping time.

## 2. Target user

People who sometimes continue scrolling beyond their intended stopping time at bedtime.

## 3. Core user journey

The user must be able to:

1. Set a targeted sleep time.
2. Start a pre-bedtime session(60 mins before the sleeping time).
3. Receive an in-product stopping prompt as a new screen(similar to alarm) when the selected time is reached 60 mins in advance.
4. Record whether they stopped or continued for both beyond the sleep time and ahead of the sleeping time.
5. Review their recorded sessions and progress.

## 4. Required screens

* Home / Setup
* Active Session
* Stopping Prompt
* Progress

## 5. Functional requirements

* The stopping-time selector must work.
* The selected time must be saved.
* The session must have a clear active or completed state.
* The stopping prompt must appear when the selected time is reached during an active session.
* The “Stop” and “+5mins” actions must save the selected outcome.
* Session records must persist after the page is refreshed.
* The Progress screen must use the saved session records, not hardcoded example statistics.
* Every button and navigation action must work.
* Empty states and error states must be handled clearly.

## 6. Technical limitations

Do not claim to monitor or block Instagram, YouTube, or other applications.
Do not claim to detect sleep automatically.
The stopping prompt is an in-product prompt, not a guaranteed system-wide notification.
Do not claim that the product improves sleep quality.

## 7. Design requirements

Use a calm, uncluttered interface suitable for bedtime.
Use clear language and accessible text sizes.
Make the primary action obvious on every screen.
Ensure the application works on both mobile and desktop layouts.

## 8. Acceptance criteria

The product is complete only when a user can finish the entire journey, recorded outcomes persist, the progress screen updates from actual user data, and all controls work correctly.

Build the smallest complete version first. Do not add features outside this brief without asking.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cb99b3fd-56bd-4a9d-9f49-16137ac3c279).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
