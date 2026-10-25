export type Outcome = "stopped_early" | "stopped_on_time" | "continued";

export interface ActiveSession {
  startedAt: number;
  sleepAt: number; // original target
  promptAt: number; // when the next alarm fires
  promptShownAt?: number; // persisted start of the unanswered window
  extensions: number;
}

export interface SessionRecord {
  id: string;
  startedAt: number;
  sleepAt: number;
  endedAt: number;
  extensions: number;
  minutesBeyond: number; // 0 if stopped at/before sleep time
  outcome: Outcome;
}

export const EXTENSION_MIN = 10;
export const WARN_MIN = 60;
export const RESPONSE_MIN = 2;
export const AUTO_SNOOZE_MIN = 8;
const K = { time: "pause.sleepTime", active: "pause.active", records: "pause.records" };

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
  return { startedAt: now, sleepAt, promptAt, extensions: 0 };
}

export function extend(s: ActiveSession, now = s.promptAt): ActiveSession {
  return { ...s, promptShownAt: undefined, extensions: s.extensions + 1, promptAt: now + EXTENSION_MIN * 60000 };
}

export function showPrompt(s: ActiveSession, now: number): ActiveSession {
  return s.promptShownAt === undefined ? { ...s, promptShownAt: now } : s;
}

export function autoSnooze(s: ActiveSession, now: number): ActiveSession | null {
  if (s.promptShownAt === undefined || now < s.promptShownAt + RESPONSE_MIN * 60000) return null;
  return extend(s, s.promptShownAt + RESPONSE_MIN * 60000 - (EXTENSION_MIN - AUTO_SNOOZE_MIN) * 60000);
}

/** Re-point an active session at a changed sleep time, keeping any snoozes. */
export function retarget(s: ActiveSession, hhmm: string, now: number): ActiveSession {
  const sleepAt = nextOccurrence(hhmm, now);
  return { ...s, promptShownAt: undefined, sleepAt, promptAt: sleepAt - WARN_MIN * 60000 + s.extensions * EXTENSION_MIN * 60000 };
}

export function finish(s: ActiveSession, now: number): SessionRecord {
  const beyond = Math.max(0, Math.round((now - s.sleepAt) / 60000));
  let outcome: Outcome;
  if (s.extensions > 0 || beyond > 0) outcome = "continued";
  else if (now < s.sleepAt - 60000) outcome = "stopped_early";
  else outcome = "stopped_on_time";
  return {
    id: `${s.startedAt}`,
    startedAt: s.startedAt,
    sleepAt: s.sleepAt,
    endedAt: now,
    extensions: s.extensions,
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
  setActive: (s: ActiveSession | null) => write(K.active, s),
  getRecords: () => read<SessionRecord[]>(K.records, []),
  addRecord: (r: SessionRecord) => write(K.records, [r, ...read<SessionRecord[]>(K.records, [])]),
  clearRecords: () => write(K.records, null),
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
export const outcomeLabel: Record<Outcome, string> = {
  stopped_early: "Stopped early",
  stopped_on_time: "Stopped on time",
  continued: "Continued past time",
};
