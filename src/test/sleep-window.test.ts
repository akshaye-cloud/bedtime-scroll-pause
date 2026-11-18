import { expect, it } from "vitest";
import { sleepWindowError } from "@/lib/pause";
it("allows 19:00, 21:35 and 23:30", () => { for (const t of ["19:00", "21:35", "23:30"]) expect(sleepWindowError(t)).toBe(""); });
it("rejects outside 7pm-11:30pm", () => { for (const t of ["18:55", "23:35", "00:30"]) expect(sleepWindowError(t)).not.toBe(""); });
it("allows any minute such as 21:07", () => expect(sleepWindowError("21:07")).toBe(""));
