import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell, PrimaryButton } from "@/components/Shell";
import { createSession, fmtTime, nextOccurrence, retarget, store, getSleepLock, setSleepLock, LOCK_EXEMPT_EMAIL } from "@/lib/pause";
import { prepareAlarmAudio } from "@/lib/alarm";
import { ShortcutPanel } from "@/components/ShortcutPanel";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Pause — Set your stopping time" },
      { name: "description", content: "Set the time you intend to put your phone down tonight." },
      { property: "og:title", content: "Pause — Bedtime Scrolling Assistant" },
      { property: "og:description", content: "Record and follow your intended bedtime stopping time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const nav = useNavigate();
  const [time, setTime] = useState("23:00");
  const [saved, setSaved] = useState<string | null>(null);
  const [hasActive, setHasActive] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [lockExempt, setLockExempt] = useState(false);

  useEffect(() => {
    const t = store.getSleepTime();
    if (t) { setTime(t); setSaved(t); }
    setHasActive(!!store.getActive());
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      setLockExempt(data.user.email === LOCK_EXEMPT_EMAIL);
      const locked = getSleepLock(data.user.id);
      if (locked) { setTime(locked); setSaved(locked); }
    });
  }, []);

  // Once saved, the sleep time is locked for the rest of the day (demo1 is exempt for testing).
  const locked = !!userId && !lockExempt && getSleepLock(userId) !== null;

  const valid = /^\d{2}:\d{2}$/.test(time);
  const save = () => {
    if (!valid) return setError("Please choose a valid time.");
    if (locked) return;
    store.setSleepTime(time); setSaved(time); setError("");
    if (userId && !lockExempt) setSleepLock(userId, time);
    const a = store.getActive();
    if (a) store.setActive(retarget(a, time, Date.now()));
  };
  const start = () => {
    if (!valid) return setError("Please choose a valid time.");
    void prepareAlarmAudio();
    store.setSleepTime(time);
    if (userId && !lockExempt) setSleepLock(userId, time);
    store.setActive(createSession(time, Date.now()));
    nav({ to: "/session" });
  };

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);
  const target = valid ? nextOccurrence(time, now) : null;

  return (
    <Shell>
      <h1 className="font-display text-4xl leading-tight">When do you want to stop scrolling?</h1>
      <p className="mt-3 text-lg text-muted-foreground">Pick your sleep time. Start a session, and Pause will sound an alarm here 1 hour before that time.</p>

      <div className="panel mt-8">
        <label htmlFor="sleep" className="text-base text-muted-foreground">Sleep time</label>
        <input id="sleep" type="time" value={time} onChange={(e) => { setTime(e.target.value); setError(""); }} className="time-input mt-2" disabled={locked} />
        {error && <p role="alert" className="mt-2 text-destructive">{error}</p>}
        <div className="mt-3 flex items-center justify-between text-base">
          <span className="text-muted-foreground">{saved ? `Saved: ${fmtTime(nextOccurrence(saved, Date.now()))}` : "Not saved yet"}</span>
          {!locked && <button onClick={save} className="link-btn">Save time</button>}
        </div>
        {locked && (
          <p role="status" className="mt-3 text-base" style={{ color: "var(--warn)" }}>
            Locked for today: your sleep time stays at {fmtTime(nextOccurrence(time, Date.now()))} until tomorrow.
          </p>
        )}
      </div>

      {hasActive ? (
        <PrimaryButton className="mt-8 w-full" onClick={() => { void prepareAlarmAudio(); nav({ to: "/session" }); }}>Return to active session</PrimaryButton>
      ) : (
        <PrimaryButton className="mt-8 w-full" onClick={start} disabled={!valid}>Start pre-bedtime session</PrimaryButton>
      )}
      {target && !hasActive && (
        target - now <= 3600000 ? (
          <p role="status" className="panel mt-3 text-center text-base">
            <strong className="text-primary">Heads up:</strong> {fmtTime(target)} is less than 1 hour away, so your alarm will appear right after you start the session.
          </p>
        ) : (
          <p className="mt-3 text-center text-muted-foreground">Your alarm will ring 1 hour before, at {fmtTime(target - 3600000)}. Keep this page open.</p>
        )
      )}
      <ShortcutPanel />
      <p className="mt-10 text-sm text-muted-foreground">Pause only shows prompts inside this page. It does not monitor or block other apps.</p>
    </Shell>
  );
}
