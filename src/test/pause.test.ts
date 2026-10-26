import { describe, it, expect } from "vitest";
import { autoSnooze, createSession, extend, finish, getSleepLock, groupByDay, hhmmNow, isPastTime, latestPerDay, retarget, reminderAt, sessionActiveTooLong, sessionShowsStop, setSleepLock, showPrompt, shouldAutoStop, stopInactiveSession, stoppedTimeTone, recordResultLabel, store, summarize, syncActiveToSleepTime, nextOccurrence, type SessionRecord } from "@/lib/pause";

const base = new Date(2026, 0, 1, 22, 0).getTime();
const min = 60000;

const rec = (id: string, sleepAt: number, outcome: SessionRecord["outcome"] = "stopped_early"): SessionRecord =>
  ({ id, startedAt: sleepAt - 60 * min, sleepAt, endedAt: sleepAt - 30 * min, extensions: 0, minutesBeyond: 0, outcome });

describe("progress per day", () => {
  it("keeps only the latest record when several sessions end on the same day", () => {
    const day1a = new Date(2026, 9, 25, 23, 0).getTime();
    const day1b = new Date(2026, 9, 25, 23, 40).getTime();
    const records = [rec("b", day1b, "continued"), rec("a", day1a)]; // newest first
    const days = latestPerDay(records);
    expect(days).toHaveLength(1);
    expect(days[0]?.id).toBe("b");
  });
  it("shows the next day's session as its own entry", () => {
    const day1 = new Date(2026, 9, 25, 23, 0).getTime();
    const day2 = new Date(2026, 9, 26, 23, 0).getTime();
    const days = latestPerDay([rec("2", day2), rec("1", day1)]);
    expect(days.map((r) => r.id)).toEqual(["2", "1"]);
  });
  it("stats count each day once, not every attempt", () => {
    const day1a = new Date(2026, 9, 25, 23, 0).getTime();
    const day1b = new Date(2026, 9, 25, 23, 40).getTime();
    const s = summarize(latestPerDay([rec("b", day1b, "continued"), rec("a", day1a)]));
    expect(s.total).toBe(1);
    expect(s.rate).toBe(0);
  });
});

describe("stopped history per day", () => {
  const day1a = new Date(2026, 9, 25, 23, 0).getTime();
  const day1b = new Date(2026, 9, 25, 23, 40).getTime();
  const day2 = new Date(2026, 9, 26, 23, 0).getTime();
  it("keeps the latest stop as the day's main record and lists earlier stops", () => {
    const groups = groupByDay([rec("b", day1b, "continued"), rec("a", day1a)]); // newest first
    expect(groups).toHaveLength(1);
    expect(groups[0]?.latest.id).toBe("b");
    expect(groups[0]?.all.map((r) => r.id)).toEqual(["b", "a"]);
  });
  it("each day gets its own group with its own latest stop", () => {
    const groups = groupByDay([rec("2", day2), rec("b", day1b), rec("a", day1a)]);
    expect(groups.map((g) => g.latest.id)).toEqual(["2", "b"]);
    expect(groups[1]?.all).toHaveLength(2);
  });
});

describe("reminder time", () => {
  it("is one hour before the sleep time", () => {
    const now = new Date(2026, 9, 26, 18, 0).getTime();
    expect(reminderAt("20:30", now)).toBe(new Date(2026, 9, 26, 19, 30).getTime());
  });
  it("moves to tomorrow's reminder once today's sleep time has passed", () => {
    const now = new Date(2026, 9, 26, 21, 0).getTime();
    expect(reminderAt("20:30", now)).toBe(new Date(2026, 9, 27, 19, 30).getTime());
  });
});

describe("daily sleep-time lock", () => {

  it("locks the saved time for the rest of the day", () => {
    const now = new Date(2026, 9, 25, 20, 0).getTime();
    expect(getSleepLock("user-a", now)).toBeNull();
    setSleepLock("user-a", "23:00", now);
    expect(getSleepLock("user-a", now)).toBe("23:00");
    expect(getSleepLock("user-a", now + 3 * 60 * min)).toBe("23:00"); // later same day still locked
  });
  it("unlocks the next day", () => {
    const now = new Date(2026, 9, 25, 20, 0).getTime();
    setSleepLock("user-b", "23:00", now);
    const tomorrow = new Date(2026, 9, 26, 8, 0).getTime();
    expect(getSleepLock("user-b", tomorrow)).toBeNull();
  });
  it("locks are per account", () => {
    const now = new Date(2026, 9, 25, 20, 0).getTime();
    setSleepLock("user-c", "22:30", now);
    expect(getSleepLock("user-d", now)).toBeNull();
  });
});

describe("pause rules", () => {
  it("never auto-stops before sleep time despite inactivity", () => {
    expect(shouldAutoStop(createSession("23:00", base), base + 60 * min - 1)).toBe(false);
  });
  it("auto-stops at sleep time when Pause has been inactive for one hour", () => {
    const s = { ...createSession("23:00", base), lastActivityAt: base };
    expect(shouldAutoStop(s, base + 60 * min)).toBe(true);
  });
  it("recent input postpones stopping until exactly 60 inactive minutes", () => {
    const s = { ...createSession("23:00", base), lastActivityAt: base + 59 * min };
    expect(shouldAutoStop(s, base + 119 * min - 1)).toBe(false);
    expect(shouldAutoStop(s, base + 119 * min)).toBe(true);
  });
  it("the session page offers Stop only after the prompt was extended", () => {
    expect(sessionShowsStop(createSession("23:00", base))).toBe(false);
    expect(sessionShowsStop(extend(createSession("23:00", base)))).toBe(true);
    const snoozed = autoSnooze(showPrompt(createSession("23:00", base), base), base + 2 * min);
    expect(snoozed && sessionShowsStop(snoozed)).toBe(true);
  });
  it("disables Stop once the session runs for more than 2 hours", () => {
    const s = createSession("23:00", base);
    expect(sessionActiveTooLong(s, base + 120 * min)).toBe(false);
    expect(sessionActiveTooLong(s, base + 120 * min + 1)).toBe(true);
    expect(sessionActiveTooLong(s, base + 121 * min)).toBe(true);
  });
  it("refresh preserves the inactivity deadline", () => {
    const s = { ...createSession("23:00", base), lastActivityAt: base + 59 * min };
    const restored = JSON.parse(JSON.stringify(s));
    expect(shouldAutoStop(restored, base + 119 * min)).toBe(true);
  });
  it("auto-stop clears a snoozed session and saves its reason only once", () => {
    store.clearRecords();
    store.setActive(extend(createSession("23:00", base), base + 59 * min));
    const record = stopInactiveSession(base + 120 * min);
    expect(record?.endReason).toBe("inactive_in_pause");
    expect(store.getActive()).toBeNull();
    expect(stopInactiveSession(base + 121 * min)).toBeNull();
    expect(store.getRecords()).toHaveLength(1);
    store.clearRecords();
  });
  it("caps an overnight inactivity auto-stop at 11:02 PM and +2 minutes", () => {
    store.clearRecords();
    const s = createSession("23:00", base);
    store.setActive(s);
    const r = stopInactiveSession(s.sleepAt + 649 * min);
    expect(r?.endedAt).toBe(new Date(2026, 0, 1, 23, 2).getTime());
    expect(r?.minutesBeyond).toBe(2);
    expect(store.getRecords()[0]?.endedAt).toBe(s.sleepAt + 2 * min);
    expect(store.getActive()).toBeNull();
    store.clearRecords();
  });
  it("does not record a future time when inactivity is detected at bedtime", () => {
    store.clearRecords();
    const s = createSession("23:00", base);
    store.setActive(s);
    expect(stopInactiveSession(s.sleepAt)?.endedAt).toBe(s.sleepAt);
    store.clearRecords();
  });
  it("does not cap manual stops", () => {
    const s = createSession("23:00", base);
    const r = finish(s, s.sleepAt + 649 * min);
    expect(r.endedAt).toBe(s.sleepAt + 649 * min);
    expect(r.minutesBeyond).toBe(649);
  });
  it("targets the next occurrence of the sleep time", () => {
    expect(nextOccurrence("23:00", base) - base).toBe(60 * min);
    expect(nextOccurrence("21:00", base) - base).toBe(23 * 60 * min);
  });
  it("the alarm fires 60 minutes before the sleep time", () => {
    const s = createSession("23:00", base);
    expect(s.sleepAt - s.promptAt).toBe(60 * min);
  });
  it("starting within the hour alarms immediately", () => {
    const s = createSession("22:30", base);
    expect(s.promptAt).toBe(base);
  });
  it("+10mins pushes the alarm by 10 minutes", () => {
    const s = extend(createSession("23:00", base));
    expect(s.promptAt - s.sleepAt).toBe(-50 * min);
  });
  it("manual snooze gives 10 minutes from the user's response", () => {
    const s = showPrompt(createSession("23:00", base), base);
    const next = extend(s, base + min);
    expect(next.promptAt).toBe(base + 11 * min);
    expect(next.promptShownAt).toBeUndefined();
  });
  it("does not auto-snooze before 2 unanswered minutes", () => {
    const s = showPrompt(createSession("23:00", base), base);
    expect(autoSnooze(s, base + 2 * min - 1)).toBeNull();
  });
  it("snoozes for the remaining 8 minutes after 2 unanswered minutes", () => {
    const s = showPrompt(createSession("23:00", base), base);
    const next = autoSnooze(s, base + 2 * min);
    expect(next?.promptAt).toBe(base + 10 * min);
    expect((next?.promptAt ?? 0) - (base + 2 * min)).toBe(8 * min);
    expect(next?.extensions).toBe(1);
    expect(next?.promptShownAt).toBeUndefined();
  });
  it("preserves the unanswered deadline through refresh", () => {
    const s = showPrompt(createSession("23:00", base), base);
    const restored = showPrompt(JSON.parse(JSON.stringify(s)), base + min);
    expect(autoSnooze(restored, base + 2 * min)?.promptAt).toBe(base + 10 * min);
  });
  it("repeats the unanswered cycle after the next prompt", () => {
    const first = autoSnooze(showPrompt(createSession("23:00", base), base), base + 2 * min);
    if (!first) throw new Error("Expected auto-snooze");
    const second = autoSnooze(showPrompt(first, base + 10 * min), base + 12 * min);
    expect(second?.promptAt).toBe(base + 20 * min);
    expect(second?.extensions).toBe(2);
  });
  it("does not move a snoozed session to tomorrow after its sleep time", () => {
    store.setSleepTime("23:00");
    const s = extend(createSession("23:00", base), base + 65 * min);
    store.setActive(s);
    expect(syncActiveToSleepTime(base + 66 * min)?.sleepAt).toBe(base + 60 * min);
    store.setActive(null);
  });
  it("a changed sleep time re-points the active session", () => {
    const s = retarget(createSession("23:00", base), "22:30", base);
    expect(s.sleepAt - base).toBe(30 * min);
    expect(s.sleepAt - s.promptAt).toBe(60 * min);
  });
  it("re-pointing keeps snoozes and the start time", () => {
    const s = retarget(extend(createSession("23:00", base)), "22:30", base);
    expect(s.promptAt - s.sleepAt).toBe(-50 * min);
    expect(s.startedAt).toBe(base);
  });
  it("stopping before sleep time is early", () => {
    expect(finish(createSession("23:00", base), base + 30 * min).outcome).toBe("stopped_early");
  });
  it("stopping at the prompt is on time", () => {
    expect(finish(createSession("23:00", base), base + 60 * min).outcome).toBe("stopped_on_time");
  });
  it("extending counts as continued with minutes beyond", () => {
    const r = finish(extend(createSession("23:00", base)), base + 65 * min);
    expect(r.outcome).toBe("continued");
    expect(r.minutesBeyond).toBe(5);
  });
  it("summary uses records", () => {
    const a = finish(createSession("23:00", base), base + 60 * min);
    const b = finish(extend(createSession("23:00", base)), base + 70 * min);
    expect(summarize([a, b])).toMatchObject({ total: 2, onTime: 1, continued: 1, avgBeyond: 10, rate: 50 });
  });
});

import { continueVariant, resumeFromRecord } from "@/lib/pause";
describe("continue prompt", () => {
  const r = finish(createSession("23:00", base), base + 30 * min);
  it("before sleep time asks to continue without the limit warning", () => {
    expect(continueVariant(r, base + 40 * min)).toBe("before");
  });
  it("after sleep time shows the exceeded-limit prompt", () => {
    expect(continueVariant(r, base + 61 * min)).toBe("after");
  });
  it("yes extends 10 minutes from now", () => {
    const s = resumeFromRecord(r, base + 40 * min);
    expect(s.promptAt).toBe(base + 50 * min);
    expect(s.extensions).toBe(1);
  });
});

import { fmtFullDate } from "@/lib/pause";
describe("home date line", () => {
  it("shows the full date like Sunday, 25 October 2026", () => {
    expect(fmtFullDate(new Date(2026, 9, 25, 20, 0).getTime())).toBe("Sunday, 25 October 2026");
  });
  it("rolls to the next date the following day", () => {
    expect(fmtFullDate(new Date(2026, 9, 26, 0, 30).getTime())).toBe("Monday, 26 October 2026");
  });
});

import { createSession as cs2, extend as ex2, finish as fin2 } from "@/lib/pause";
describe("snooze rule and counts", () => {
  const m = 60000;
  const base = new Date(2026, 9, 26, 22, 0).getTime(); // alarm time; bedtime 23:00
  it("snooze before bedtime then stop early counts as stopped early", () => {
    const s = ex2(cs2("23:00", base), base + 1 * m);
    const r = fin2(s, base + 30 * m);
    expect(r.outcome).toBe("stopped_early");
    expect(r.preExtensions).toBe(1);
    expect(r.postExtensions).toBe(0);
  });
  it("snooze after bedtime counts post and continued", () => {
    const s = ex2(ex2(cs2("23:00", base), base + 50 * m), base + 61 * m);
    const r = fin2(s, base + 75 * m);
    expect(r.outcome).toBe("continued");
    expect(r.preExtensions).toBe(1);
    expect(r.postExtensions).toBe(1);
  });
});

describe("stopped-time history", () => {
  const session = createSession("23:00", base);
  it("is green from 10 PM through the explicit 10:30 PM example, despite snoozes", () => {
    const snoozed = extend(session, base + 10 * min);
    expect(stoppedTimeTone(finish(snoozed, base))).toBe("green");
    expect(stoppedTimeTone(finish(snoozed, base + 30 * min))).toBe("green");
    expect(stoppedTimeTone(finish(snoozed, base - 1))).toBe("neutral");
  });
  it("is amber after 10:30 PM through exactly 11 PM", () => {
    expect(stoppedTimeTone(finish(session, base + 30 * min + 1))).toBe("amber");
    expect(stoppedTimeTone(finish(session, base + 31 * min))).toBe("amber");
    expect(stoppedTimeTone(finish(session, base + 59 * min))).toBe("amber");
    expect(stoppedTimeTone(finish(session, session.sleepAt))).toBe("amber");
  });
  it("is red strictly after 11 PM despite snoozes", () => {
    expect(stoppedTimeTone(finish(extend(session, session.sleepAt), session.sleepAt + 1))).toBe("red");
  });
  it("marks automatic stops Inactive without changing the stopped-time color", () => {
    store.clearRecords();
    store.setActive({ ...session, lastActivityAt: session.sleepAt });
    expect(stopInactiveSession(session.sleepAt + 60 * min - 1)).toBeNull();
    const record = stopInactiveSession(session.sleepAt + 60 * min);
    if (!record) throw new Error("Expected one-hour inactivity stop");
    expect(recordResultLabel(record)).toBe("Inactive");
    expect(record.endedAt).toBe(session.sleepAt + 2 * min);
    expect(stoppedTimeTone(record)).toBe("red");
    expect(store.getActive()).toBeNull();
    store.clearRecords();
  });
});
