import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { PrimaryButton, GhostButton } from "@/components/Shell";
import { autoSnooze, extend, finish, fmtTime, showPrompt, store, type ActiveSession } from "@/lib/pause";
import { startAlarm } from "@/lib/alarm";

export const Route = createFileRoute("/prompt")({
  head: () => ({
    meta: [
      { title: "Pause — Time to stop" },
      { name: "description", content: "Your stopping time has arrived." },
      { property: "og:title", content: "Pause — Time to stop" },
      { property: "og:description", content: "Your stopping time has arrived." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Prompt,
});

function Prompt() {
  const nav = useNavigate();
  const [s, setS] = useState<ActiveSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const silence = useRef<(() => void) | undefined>(undefined);
  useEffect(() => {
    const check = () => {
      const active = store.getActive();
      if (!active) { setS(null); setLoaded(true); return; }
      const now = Date.now();
      if (active.promptAt > now) { nav({ to: "/session" }); return; }
      const shown = showPrompt(active, now);
      const snoozed = autoSnooze(shown, now);
      if (snoozed) {
        store.setActive(snoozed);
        nav({ to: "/session" });
        return;
      }
      if (shown !== active) store.setActive(shown);
      setS(shown);
      setLoaded(true);
    };
    check();
    const timer = window.setInterval(check, 1000);
    window.addEventListener("storage", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [nav]);

  const shownAt = s?.promptShownAt;
  useEffect(() => {
    if (shownAt === undefined) return;
    silence.current = startAlarm(setAudioReady);
    return () => { silence.current?.(); silence.current = undefined; };
  }, [shownAt]);

  const enableAudio = () => {
    silence.current?.();
    silence.current = startAlarm(setAudioReady);
  };

  const stop = () => {
    if (!s) return;
    silence.current?.();
    store.addRecord(finish(s, Date.now()));
    store.setActive(null);
    nav({ to: "/progress" });
  };
  const snooze = () => {
    if (!s) return;
    const now = Date.now();
    const next = extend(s, now);
    silence.current?.();
    store.setActive(next);
    nav({ to: "/session" });
  };

  return (
    <div className="bg-alarm flex min-h-screen flex-col items-center justify-center px-6 text-center">
      {!loaded ? null : !s ? (
        <div>
          <h1 className="font-display text-3xl">No session to stop</h1>
          <Link to="/" className="btn-primary mt-8 inline-block">Go to Home</Link>
        </div>
      ) : (
        <div className="w-full max-w-md">
          <div className="moon mx-auto" aria-hidden />
          <p className="mt-8 text-lg text-muted-foreground">It's {fmtTime(Date.now())}</p>
          <h1 className="mt-2 font-display text-5xl leading-tight">Time to put the phone down.</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            {s.extensions === 0
              ? `Your 1-hour alarm: you planned to stop at ${fmtTime(s.sleepAt)}.`
              : `Snoozed ${s.extensions}× — you planned to stop at ${fmtTime(s.sleepAt)}.`}
          </p>
          <PrimaryButton className="mt-10 w-full" onClick={stop} autoFocus>Stop</PrimaryButton>
          <GhostButton className="mt-3 w-full" onClick={snooze}>+10 mins</GhostButton>
          <p className="mt-6 text-sm text-muted-foreground">No response for 2 minutes? Snoozed for 8 more minutes, then this alarm repeats.</p>
          {!audioReady && (
            <GhostButton className="mt-3" onClick={enableAudio} aria-label="Enable ocean-wave audio" title="Enable ocean-wave audio">
              <Volume2 className="h-5 w-5" aria-hidden="true" />
            </GhostButton>
          )}
          <p role="status" className="mt-3 text-sm text-muted-foreground">
            {audioReady ? "Ocean-wave audio playing." : "Sound may need a tap on the speaker."} Vibration depends on your device and browser. Keep Pause open for repeat alarms.
          </p>
        </div>
      )}
    </div>
  );
}
