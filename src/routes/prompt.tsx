import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PrimaryButton, GhostButton } from "@/components/Shell";
import { extend, finish, fmtTime, store, type ActiveSession } from "@/lib/pause";

export const Route = createFileRoute("/prompt")({
  head: () => ({
    meta: [
      { title: "Pause — Time to stop" },
      { name: "description", content: "Your stopping time has arrived." },
      { property: "og:title", content: "Pause — Time to stop" },
      { property: "og:description", content: "Your stopping time has arrived." },
    ],
  }),
  component: Prompt,
});

function Prompt() {
  const nav = useNavigate();
  const [s, setS] = useState<ActiveSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setS(store.getActive()); setLoaded(true); }, []);

  const stop = () => {
    if (!s) return;
    store.addRecord(finish(s, Date.now()));
    store.setActive(null);
    nav({ to: "/progress" });
  };
  const snooze = () => {
    if (!s) return;
    const now = Date.now();
    const next = extend(s);
    if (next.promptAt <= now) next.promptAt = now + 5 * 60000;
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
          <p className="mt-4 text-lg text-muted-foreground">You planned to stop at {fmtTime(s.sleepAt)}.</p>
          <PrimaryButton className="mt-10 w-full" onClick={stop} autoFocus>Stop</PrimaryButton>
          <GhostButton className="mt-3 w-full" onClick={snooze}>+5 mins</GhostButton>
        </div>
      )}
    </div>
  );
}
