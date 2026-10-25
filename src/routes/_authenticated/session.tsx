import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell, PrimaryButton } from "@/components/Shell";
import { finish, fmtTime, sessionActiveTooLong, store, syncActiveToSleepTime, type ActiveSession } from "@/lib/pause";

export const Route = createFileRoute("/_authenticated/session")({
  head: () => ({
    meta: [
      { title: "Pause — Active session" },
      { name: "description", content: "Your pre-bedtime session countdown." },
      { property: "og:title", content: "Pause — Active session" },
      { property: "og:description", content: "Countdown to your intended stopping time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Session,
});

function Session() {
  const nav = useNavigate();
  const [s, setS] = useState<ActiveSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setS(syncActiveToSleepTime()); setNow(Date.now()); setLoaded(true);
    const resync = () => setS(syncActiveToSleepTime());
    const id = setInterval(() => { setNow(Date.now()); resync(); }, 1000);
    window.addEventListener("storage", resync);
    window.addEventListener("pause:active-changed", resync);
    document.addEventListener("visibilitychange", resync);
    return () => {
      clearInterval(id);
      window.removeEventListener("storage", resync);
      window.removeEventListener("pause:active-changed", resync);
      document.removeEventListener("visibilitychange", resync);
    };
  }, []);

  useEffect(() => {
    if (s && store.getActive() && now >= s.promptAt) nav({ to: "/prompt" });
  }, [s, now, nav]);

  const stopNow = () => {
    const active = store.getActive();
    if (!active) return;
    store.addRecord(finish(active, Date.now()));
    store.setActive(null);
    nav({ to: "/progress" });
  };

  if (!loaded) return <Shell><p className="text-muted-foreground">Loading…</p></Shell>;

  if (!s) {
    return (
      <Shell>
        <h1 className="font-display text-3xl">No active session</h1>
        <p className="mt-3 text-lg text-muted-foreground">Set your sleep time and start a session from Home.</p>
        <Link to="/home" className="btn-primary mt-8 block w-full text-center">Go to Home</Link>
      </Shell>
    );
  }

  const left = Math.max(0, s.promptAt - now);
  const h = Math.floor(left / 3600000), m = Math.floor((left % 3600000) / 60000), sec = Math.floor((left % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const stopDisabled = sessionActiveTooLong(s, now);

  return (
    <Shell>
      <p className="text-center text-base uppercase tracking-widest text-muted-foreground">Session active</p>
      <div className="mt-6 text-center font-display text-7xl tabular-nums">{h > 0 ? `${h}:` : ""}{pad(m)}:{pad(sec)}</div>
      <p className="mt-4 text-center text-lg text-muted-foreground">
        until your {s.extensions ? "next" : "1-hour"} alarm at {fmtTime(s.promptAt)}
        {s.extensions > 0 && ` (snoozed ${s.extensions}×)`}
      </p>
      {stopDisabled ? (
        <>
          <div className="btn-primary mt-12 w-full cursor-not-allowed text-center opacity-50" aria-disabled="true">I'm stopping now</div>
          <p className="mt-4 text-center text-sm text-warn-foreground">
            This session has been running for more than 2 hours, so it can no longer be stopped manually. Start a fresh session from Home.
          </p>
        </>
      ) : (
        <>
          <PrimaryButton className="mt-12 w-full" onClick={stopNow}>I'm stopping now</PrimaryButton>
          <p className="mt-4 text-center text-sm text-muted-foreground">Keep this page open so the stopping screen can appear.</p>
        </>
      )}
    </Shell>
  );
}
