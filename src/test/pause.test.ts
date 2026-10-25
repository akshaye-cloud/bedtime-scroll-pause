import { describe, it, expect } from "vitest";
import { createSession, extend, finish, summarize, nextOccurrence } from "@/lib/pause";

const base = new Date(2026, 0, 1, 22, 0).getTime();
const min = 60000;

describe("pause rules", () => {
  it("targets the next occurrence of the sleep time", () => {
    expect(nextOccurrence("23:00", base) - base).toBe(60 * min);
    expect(nextOccurrence("21:00", base) - base).toBe(23 * 60 * min);
  });
  it("+5mins pushes the prompt by 5 minutes", () => {
    const s = extend(createSession("23:00", base));
    expect(s.promptAt - s.sleepAt).toBe(5 * min);
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
