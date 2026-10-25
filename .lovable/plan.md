# Welcome page with name, email and password

Your answers mixed two ideas: "just collect details", but the demo accounts should work as logins and sessions should be saved per account. Both of those need real accounts, so this plan uses real sign-up and sign-in. People still only type name, email and password.

## What you will see
- A new first page at "/" with three required fields: **Name**, **Email**, **Password**, and a **Continue** button.
  - New email: an account is created with those details and you go straight into Pause.
  - Email that already exists: it signs you in when the password matches, or shows "Wrong password".
  - Empty fields, a bad email, or a password under 6 characters show a clear message under the field.
- The current Home (sleep time) moves to `/home`. Session, Alarm, Progress and Continue open only after you sign in. Signed-out visitors are sent back to the welcome page.
- The header shows your name and a **Sign out** button.
- 15 demo accounts are ready to use, for example `demo1@pause.app` to `demo15@pause.app`, each with password `PauseDemo1!` to `PauseDemo15!`. I'll list them in chat after building. They have made-up names.
- Sessions and progress are saved to each account, so they appear on any device after sign-in. The sleep time and the running session stay on the device, so alarms keep working offline.

## Technical details
- Enable Lovable Cloud with email/password and auto-confirm, so sign-up logs in at once with no email step.
- Migration: a `profiles` table (id → auth.users, name), a sign-up trigger that copies `name` from the sign-up details, and a `session_records` table (user_id plus the existing SessionRecord fields). Both get GRANTs and RLS limited to the owner. Seed the 15 users into auth.users/auth.identities with bcrypt passwords, plus their profiles.
- Routes: new `src/routes/index.tsx` for the welcome form (zod validation; signUp, then signInWithPassword if the email already exists). Move the old Home to `_authenticated/home.tsx`, and session/prompt/progress/continue under `_authenticated/`. Update links to `/home`.
- `addRecord`, `getRecords` and `clearRecords` sync to `session_records` for the signed-in user. Active session, sleep time and alarm logic stay in localStorage, and `pause.ts` timing helpers stay unchanged.
- Root `onAuthStateChange` listener, sign-out cleanup, and updated route tests.
- Note: passwords are handled by the sign-in system and stored only in encrypted form, never as plain text in a table.
