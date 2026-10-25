import { describe, it, expect } from "vitest";
import { createSession, extend, finish, retarget, summarize, nextOccurrence } from "@/lib/pause";

const base = new Date(2026, 0, 1, 22, 0).getTime();
const min = 60000;

describe("pause rules", () => {
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
