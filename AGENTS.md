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
- Keep procedural sea-wave audio and vibration in `src/lib/alarm.ts`, called only from browser effects or user gestures with explicit cleanup; browser support and autoplay restrictions prevent universal device guarantees.
