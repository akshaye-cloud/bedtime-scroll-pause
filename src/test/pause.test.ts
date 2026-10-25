import { describe, it, expect } from "vitest";
import { autoSnooze, createSession, extend, finish, retarget, showPrompt, shouldAutoStop, stopInactiveSession, store, summarize, syncActiveToSleepTime, nextOccurrence } from "@/lib/pause";

const base = new Date(2026, 0, 1, 22, 0).getTime();
const min = 60000;

describe("pause rules", () => {
  it("never auto-stops before sleep time despite inactivity", () => {
    expect(shouldAutoStop(createSession("23:00", base), base + 60 * min - 1)).toBe(false);
  });
  it("auto-stops at sleep time when Pause has been inactive for 2 minutes", () => {
    const s = { ...createSession("23:00", base), lastActivityAt: base + 58 * min };
    expect(shouldAutoStop(s, base + 60 * min)).toBe(true);
  });
  it("recent input postpones stopping until exactly 2 inactive minutes", () => {
    const s = { ...createSession("23:00", base), lastActivityAt: base + 59 * min };
    expect(shouldAutoStop(s, base + 61 * min - 1)).toBe(false);
    expect(shouldAutoStop(s, base + 61 * min)).toBe(true);
  });
  it("refresh preserves the inactivity deadline", () => {
    const s = { ...createSession("23:00", base), lastActivityAt: base + 59 * min };
    const restored = JSON.parse(JSON.stringify(s));
    expect(shouldAutoStop(restored, base + 61 * min)).toBe(true);
  });
  it("auto-stop clears a snoozed session and saves its reason only once", () => {
    store.clearRecords();
    store.setActive(extend(createSession("23:00", base), base + 59 * min));
    const record = stopInactiveSession(base + 60 * min);
    expect(record?.endReason).toBe("inactive_in_pause");
    expect(store.getActive()).toBeNull();
    expect(stopInactiveSession(base + 61 * min)).toBeNull();
    expect(store.getRecords()).toHaveLength(1);
    store.clearRecords();
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
