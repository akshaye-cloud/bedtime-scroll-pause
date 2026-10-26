<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep alarm timing in browser-safe pure helpers in `src/lib/pause.ts`, with prompt appearance timestamps persisted alongside the active session so refreshing cannot restart the unanswered window.
- Cap inactivity-record timestamps in the shared stop helper, not in display or sync code, so every page and cloud sync uses the same result without altering manual stops.
- Keep procedural sea-wave audio and vibration in `src/lib/alarm.ts`, called only from browser effects or user gestures with explicit cleanup; browser support and autoplay restrictions prevent universal device guarantees.
- Mount the session activity monitor in the shared root so inactivity applies on every Pause page; persist user-input timestamps, and share the pure auto-stop predicate with alarm processing so stopping takes priority over snoozing without inferring external device activity.
- Phone shortcut uses a manifest (home-screen icon) plus public/notify-sw.js, a notification-only worker with no fetch/caching, synced from SessionActivityMonitor via src/lib/shortcut.ts; why: a lock-screen notification needs a worker on Android, while caching workers break previews.
- Accounts use Lovable Cloud auth; a welcome form at / signs in or signs up, app pages live under src/routes/_authenticated/, and RecordSync mirrors localStorage session records to the per-user session_records table; why: alarms must keep working offline while progress follows the account.
