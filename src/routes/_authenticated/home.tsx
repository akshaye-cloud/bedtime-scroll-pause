import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell, PrimaryButton } from "@/components/Shell";
import { calendarReminderAt, createSession, fmtFullDate, fmtTime, googleCalUrl, hhmmNow, icsContent, isPastTime, midnightExcessMin, nextOccurrence, reminderAt, reapplySleepTimeToToday, retarget, store, LOCK_EXEMPT_EMAIL, sleepWindowError } from "@/lib/pause";
import { prepareAlarmAudio } from "@/lib/alarm";
import { ShortcutPanel } from "@/components/ShortcutPanel";
import { HomeTour, markTourSeen, shouldShowTour } from "@/components/HomeTour";
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
  const [now, setNow] = useState(() => Date.now());
  const tomorrow = false;
  const [midnightCheck, setMidnightCheck] = useState<number | null>(null);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const t = store.getSleepTime();
    if (t) { setTime(t); setSaved(t); }
    setHasActive(!!store.getActive());
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      const ex = data.user.email === LOCK_EXEMPT_EMAIL; setLockExempt(ex);
      if (shouldShowTour(data.user.id)) setShowTour(true);
    });
  }, []);

  // The sleep time can be changed any time, but (except demo1) only to a time more than 1 hour away.
  const locked = false;
  const soonMsg = "Your sleep time must be more than 1 hour from now, so it can't be saved. Pick a later time.";
  const isTooSoon = (hhmm: string, at: number) => !lockExempt && nextOccurrence(hhmm, at) - at <= 60 * 60_000;

  const valid = /^\d{2}:\d{2}$/.test(time);
  const windowErr = () => (lockExempt ? "" : sleepWindowError(time));
  const save = () => {
    if (!valid) return setError("Please choose a valid time.");
    if (windowErr()) return setError(windowErr());
    if (!tomorrow && isPastTime(time, Date.now())) return setError(`You can't set a sleep time earlier than the current time (${fmtTime(Date.now())}). Pick a later time.`);
    if (isTooSoon(time, Date.now())) return setError(soonMsg);
    store.setSleepTime(time); setSaved(time); setError("");
    // Today's recorded stops follow the new plan so Progress shows no old time.
    reapplySleepTimeToToday(time);
    const a = store.getActive();
    if (a) store.setActive(retarget(a, time, Date.now()));
  };
  const beginSession = () => {
    setMidnightCheck(null);
    void prepareAlarmAudio();
    store.setSleepTime(time);
    reapplySleepTimeToToday(time);
    store.setActive(createSession(time, Date.now()));
    nav({ to: "/session" });
  };
  const start = () => {
    if (!valid) return setError("Please choose a valid time.");
    if (windowErr()) return setError(windowErr());
    if (!tomorrow && isPastTime(time, Date.now())) return setError(`You can't set a sleep time earlier than the current time (${fmtTime(Date.now())}). Pick a later time.`);
    if (isTooSoon(time, Date.now())) return setError(soonMsg);
    // A next-day sleep time more than 20 minutes past midnight asks first.
    const excess = tomorrow ? midnightExcessMin(nextOccurrence(time, Date.now())) : 0;
    if (excess > 0) return setMidnightCheck(excess);
    beginSession();
  };

  const target = valid ? nextOccurrence(time, now) : null;
  const past = valid && !tomorrow && isPastTime(time, now);

  const downloadIcs = (remindAt: number) => {
    const url = URL.createObjectURL(new Blob([icsContent(remindAt)], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "pause-reminder.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Shell>
      <h1 className="font-display text-4xl leading-tight">When do you want to stop scrolling?</h1>
      <p className="mt-3 text-lg text-muted-foreground">Pick your sleep time. Start a session, and Pause will sound an alarm here 1 hour before that time.</p>

      <div className="panel mt-8">
        <p role="status" className="text-xl font-semibold">{fmtFullDate(now)}</p>
        <label htmlFor="sleep" className="mt-4 block text-base text-muted-foreground">Sleep time</label>
        <input id="sleep" type="time" value={time} min={lockExempt ? hhmmNow(now) : "19:00"} max={lockExempt ? undefined : "23:30"} step={lockExempt ? undefined : 300} onChange={(e) => { setTime(e.target.value); setError(""); }} className="time-input mt-2" disabled={locked} />
        {!lockExempt && <p className="mt-2 text-sm text-muted-foreground">Choose between 7:00 PM and 11:30 PM, in 5-minute steps.</p>}
        {error && <p role="alert" className="mt-2 text-destructive">{error}</p>}
        {valid && past && !error && (
          locked ? (
            <p role="alert" className="mt-3 text-base text-(--warn)">
              Your locked sleep time ({fmtTime(nextOccurrence(time, now))}) has already passed today. You can set a new time tomorrow.
            </p>
          ) : (
            <p role="alert" className="mt-3 text-base text-(--warn)">
              You can't set a sleep time earlier than the current time ({fmtTime(now)}). Pick a later time.
            </p>
          )
        )}
        {valid && !past && (
          <p role="status" className="mt-3 text-base">You'll be reminded at <strong className="text-primary">{fmtTime(reminderAt(time, now))}</strong>.</p>
        )}
        {valid && !past && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-base font-semibold">Sync bedtime reminder</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Get a phone notification at {fmtTime(calendarReminderAt(time, now))} (6 hours before sleep time) even if Pause is closed. Repeats daily with no end date.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <a href={googleCalUrl(calendarReminderAt(time, now))} target="_blank" rel="noopener noreferrer" className="btn-ghost flex-1 text-center text-base">
                Add to Google Calendar
              </a>
              <button type="button" className="btn-ghost flex-1 text-base" onClick={() => downloadIcs(calendarReminderAt(time, now))}>
                Apple / other calendar (.ics)
              </button>
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-base">
          <span className="text-muted-foreground">{saved ? `Saved: ${fmtTime(nextOccurrence(saved, Date.now()))}` : "Not saved yet"}</span>
          {!locked && <button onClick={save} className="link-btn" data-tour="save-time">Save time</button>}
        </div>
        {valid && !past && isTooSoon(time, now) && !error && (
          <p role="alert" className="mt-3 text-base text-(--warn)">{soonMsg}</p>
        )}
        {!lockExempt && (
          <p className="mt-3 text-base text-muted-foreground">You can change your sleep time anytime, as long as it's more than 1 hour away.</p>
        )}
      </div>

      {hasActive ? (
        <PrimaryButton className="mt-8 w-full" data-tour="start-session" onClick={() => { void prepareAlarmAudio(); nav({ to: "/session" }); }}>Return to active session</PrimaryButton>
      ) : (
        <PrimaryButton className="mt-8 w-full" data-tour="start-session" onClick={start} disabled={!valid || past}>Start pre-bedtime session</PrimaryButton>
      )}
      {target && !hasActive && !past && (
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

      {(
        <button
          type="button"
          aria-label="Show step-by-step instructions"
          title="How to use Pause"
          data-tour="info"
          onClick={() => setShowTour(true)}
          className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-primary bg-primary font-display text-xl text-primary-foreground shadow-lg"
        >
          i
        </button>
      )}

      {showTour && userId && (
        <HomeTour onDone={() => { markTourSeen(userId); setShowTour(false); }} />
      )}
      {showTour && !userId && (
        <HomeTour onDone={() => setShowTour(false)} />
      )}

      {midnightCheck !== null && (
        <div role="dialog" aria-modal="true" aria-labelledby="midnight-title" className="fixed inset-0 z-50 flex items-center justify-center bg-night/80 px-6">
          <div className="panel w-full max-w-md text-center">
            <h2 id="midnight-title" className="font-display text-2xl">Past midnight</h2>
            <p className="mt-3 text-base text-muted-foreground">
              Your targeted sleep time is <strong className="text-foreground">{midnightCheck} mins</strong> more than expected. Do you want to continue?
            </p>
            <div className="mt-6 flex gap-3">
              <PrimaryButton className="flex-1" onClick={beginSession}>Yes, continue</PrimaryButton>
              <button className="btn-ghost flex-1" onClick={() => setMidnightCheck(null)}>No</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
