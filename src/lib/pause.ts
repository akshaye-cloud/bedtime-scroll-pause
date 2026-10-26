export type Outcome = "stopped_early" | "stopped_on_time" | "continued";

export interface ActiveSession {
  startedAt: number;
  sleepAt: number; // original target
  promptAt: number; // when the next alarm fires
  promptShownAt?: number | undefined; // persisted start of the unanswered window
  lastActivityAt?: number; // taps or typing inside Pause only
  extensions: number;
  preExtensions?: number; // +10 mins taken in the 1-hour window before bedtime
  postExtensions?: number; // +10 mins taken after bedtime
}

export interface SessionRecord {
  id: string;
  startedAt: number;
  sleepAt: number;
  endedAt: number;
  extensions: number;
  preExtensions?: number;
  postExtensions?: number;
  minutesBeyond: number; // 0 if stopped at/before sleep time
  outcome: Outcome;
  endReason?: "inactive_in_pause";
}

export const EXTENSION_MIN = 10;
export const WARN_MIN = 60;
export const RESPONSE_MIN = 2;
export const AUTO_SNOOZE_MIN = 8;
export const INACTIVITY_MIN = 2;
const K = { time: "pause.sleepTime", active: "pause.active", records: "pause.records", resume: "pause.resume" };
export const RESUME_WINDOW_MIN = 6 * 60;

/** Next occurrence of HH:MM after `now`. */
export function nextOccurrence(hhmm: string, now: number): number {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(now);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  if (d.getTime() <= now) d.setDate(d.getDate() + 1);
  return d.getTime();
}

export function createSession(hhmm: string, now: number): ActiveSession {
  const sleepAt = nextOccurrence(hhmm, now);
  const promptAt = Math.max(now, sleepAt - WARN_MIN * 60000);
  return { startedAt: now, lastActivityAt: now, sleepAt, promptAt, extensions: 0 };
}

export const ACTIVE_LIMIT_MIN = 2 * 60;

/** The session page shows Stop only after the alarm was extended (+10 mins or auto-snooze). */
export function sessionShowsStop(s: ActiveSession): boolean {
  return s.extensions > 0;
}

/** Stop is disabled once the session has been running for more than 2 hours. */
export function sessionActiveTooLong(s: ActiveSession, now: number): boolean {
  return now - s.startedAt > ACTIVE_LIMIT_MIN * 60000;
}

export function shouldAutoStop(s: ActiveSession, now: number): boolean {
  return now >= s.sleepAt && now - (s.lastActivityAt ?? s.startedAt) >= INACTIVITY_MIN * 60000;
}

/** Shared by the page monitor and prompt so stopping takes priority over snoozing. */
export function stopInactiveSession(now = Date.now()): SessionRecord | null {
  const s = store.getActive();
  if (!s || !shouldAutoStop(s, now)) return null;
  // Browser suspension must not count an unattended night as continued activity.
  const endedAt = Math.min(now, s.sleepAt + INACTIVITY_MIN * 60000);
  const record: SessionRecord = { ...finish(s, endedAt), endReason: "inactive_in_pause" };
  store.addRecord(record);
  store.setActive(null);
  return record;
}

/** Count a +10 mins in the 1-hour window (before bedtime) or after bedtime. */
function countSnooze<T extends { sleepAt: number; preExtensions?: number; postExtensions?: number }>(s: T, at: number) {
  return at < s.sleepAt
    ? { preExtensions: (s.preExtensions ?? 0) + 1, postExtensions: s.postExtensions ?? 0 }
    : { preExtensions: s.preExtensions ?? 0, postExtensions: (s.postExtensions ?? 0) + 1 };
}

export function extend(s: ActiveSession, now = s.promptAt): ActiveSession {
  return { ...s, ...countSnooze(s, now), promptShownAt: undefined, extensions: s.extensions + 1, promptAt: now + EXTENSION_MIN * 60000 };
}

export function showPrompt(s: ActiveSession, now: number): ActiveSession {
  return s.promptShownAt === undefined ? { ...s, promptShownAt: now } : s;
}

export function autoSnooze(s: ActiveSession, now: number): ActiveSession | null {
  if (s.promptShownAt === undefined || now < s.promptShownAt + RESPONSE_MIN * 60000) return null;
  return {
    ...s,
    ...countSnooze(s, s.promptShownAt + RESPONSE_MIN * 60000),
    promptShownAt: undefined,
    extensions: s.extensions + 1,
    promptAt: s.promptShownAt + (RESPONSE_MIN + AUTO_SNOOZE_MIN) * 60000,
  };
}

/** Re-point an active session at a changed sleep time, keeping any snoozes. */
export function retarget(s: ActiveSession, hhmm: string, now: number): ActiveSession {
  const sleepAt = nextOccurrence(hhmm, now);
  return { ...s, promptShownAt: undefined, sleepAt, promptAt: sleepAt - WARN_MIN * 60000 + s.extensions * EXTENSION_MIN * 60000 };
}

/** Outcome depends only on when the session ended; snoozes before bedtime are not penalized. */
export function finish(s: ActiveSession, now: number): SessionRecord {
  const beyond = Math.max(0, Math.round((now - s.sleepAt) / 60000));
  let outcome: Outcome;
  if (beyond > 0) outcome = "continued";
  else if (now < s.sleepAt - 60000) outcome = "stopped_early";
  else outcome = "stopped_on_time";
  return {
    id: `${s.startedAt}`,
    startedAt: s.startedAt,
    sleepAt: s.sleepAt,
    endedAt: now,
    extensions: s.extensions,
    preExtensions: s.preExtensions ?? 0,
    postExtensions: s.postExtensions ?? 0,
    minutesBeyond: beyond,
    outcome,
  };
}

export function summarize(records: SessionRecord[]) {
  const total = records.length;
  const onTime = records.filter((r) => r.outcome !== "continued").length;
  const continued = total - onTime;
  const avgBeyond = continued
    ? Math.round(records.filter((r) => r.outcome === "continued").reduce((a, r) => a + r.minutesBeyond, 0) / continued)
    : 0;
  return { total, onTime, continued, avgBeyond, rate: total ? Math.round((onTime / total) * 100) : 0 };
}

/** Local calendar day key for grouping, e.g. "2026-10-25". */
export function dayKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/**
 * Daily sleep-time lock, per account and calendar day. Once a user saves a
 * sleep time today, it cannot be changed again until tomorrow. demo1 is
 * exempt so it stays usable for testing.
 */
export const LOCK_EXEMPT_EMAIL = "demo1@pause.app";

function sleepLockKey(userId: string, now: number): string {
  return `pause.sleepLock.${userId}.${dayKey(now)}`;
}

/** The locked sleep time for today, or null if nothing is locked yet. */
export function getSleepLock(userId: string, now = Date.now()): string | null {
  return read<string | null>(sleepLockKey(userId, now), null);
}

export function setSleepLock(userId: string, hhmm: string, now = Date.now()): void {
  write(sleepLockKey(userId, now), hhmm);
}

/**
 * One entry per day: when several sessions end on the same day, keep the latest
 * (records are stored newest-first, so the first per day wins). The next day's
 * session then appears as its own entry.
 */
export function latestPerDay(records: SessionRecord[]): SessionRecord[] {
  const seen = new Set<string>();
  const out: SessionRecord[] = [];
  for (const r of records) {
    const k = dayKey(r.sleepAt);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, v: unknown) {
  if (v === null) localStorage.removeItem(key);
  else localStorage.setItem(key, JSON.stringify(v));
  // Same-tab listeners: "storage" events only fire in other tabs.
  if (typeof window !== "undefined" && key === K.active) {
    window.dispatchEvent(new CustomEvent("pause:active-changed"));
  }
}

export const store = {
  getSleepTime: () => read<string | null>(K.time, null),
  setSleepTime: (t: string) => write(K.time, t),
  getActive: () => read<ActiveSession | null>(K.active, null),
  setActive: (s: ActiveSession | null) => {
    if (s) write(K.resume, null);
    write(K.active, s);
  },
  getRecords: () => read<SessionRecord[]>(K.records, []),
  addRecord: (r: SessionRecord) => {
    write(K.records, [r, ...read<SessionRecord[]>(K.records, []).filter((existing) => existing.id !== r.id)]);
    write(K.resume, r.id);
    window.dispatchEvent(new CustomEvent("pause:record-added", { detail: r }));
  },
  getResume: () => read<string | null>(K.resume, null),
  clearResume: () => write(K.resume, null),
  clearRecords: () => {
    write(K.records, null);
    window.dispatchEvent(new CustomEvent("pause:records-cleared"));
  },
  /** Replace local records with the signed-in account's copy (no sync events). */
  replaceRecords: (rs: SessionRecord[]) => write(K.records, rs.length ? rs : null),
};

/**
 * Keep the running session in step with the saved sleep time: if the sleep time
 * was changed (e.g. on Home), the session's target and countdown move to it.
 */
export function syncActiveToSleepTime(now = Date.now()): ActiveSession | null {
  const t = store.getSleepTime();
  const s = store.getActive();
  if (!t || !s) return s;
  const target = new Date(s.sleepAt);
  const [hour, minute] = t.split(":").map(Number);
  if (target.getHours() === hour && target.getMinutes() === minute) return s;
  const next = retarget(s, t, now);
  store.setActive(next);
  return next;
}

export const fmtTime = (t: number) =>
  new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
export const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "Sunday, 25 October 2026" — always the same shape, whatever the browser locale. */
export const fmtFullDate = (t: number) => {
  const d = new Date(t);
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
};
export const outcomeLabel: Record<Outcome, string> = {
  stopped_early: "Stopped early",
  stopped_on_time: "Stopped on time",
  continued: "Continued past time",
};

/** Which "continue?" prompt to show when Pause is reopened after a session ended. */
export function continueVariant(r: SessionRecord, now: number): "before" | "after" | null {
  if (now > r.sleepAt + RESUME_WINDOW_MIN * 60000) return null;
  return now < r.sleepAt ? "before" : "after";
}

/** "Yes" on the continue prompt: reopen the ended session with a 10-minute extension. */
export function resumeFromRecord(r: SessionRecord, now: number): ActiveSession {
  return { startedAt: r.startedAt, sleepAt: r.sleepAt, lastActivityAt: now, extensions: r.extensions + 1, ...countSnooze(r, now), promptAt: now + EXTENSION_MIN * 60000 };
}

export function pendingResume(now = Date.now()): { record: SessionRecord; variant: "before" | "after" } | null {
  const id = store.getResume();
  if (!id || store.getActive()) return null;
  const record = store.getRecords().find((r) => r.id === id);
  const variant = record ? continueVariant(record, now) : null;
  return record && variant ? { record, variant } : null;
}
