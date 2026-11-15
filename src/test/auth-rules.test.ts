import { describe, expect, it } from "vitest";
import { emailError, isSessionExpired, pinError, SESSION_MAX_MS } from "@/lib/auth-rules";

describe("email validation", () => {
  it.each(["name@example.com", "first.last@example.co.in", "a+tag@mail.example.org", "user_1@sub-domain.io", "  Demo1@Pause.app  "])("accepts %s", (e) => expect(emailError(e)).toBe(""));
  it.each([
    "", "   ", "plainaddress", "@example.com", "name@", "name@@example.com", "na me@example.com", "name@example",
    "name@example.c", "name@.com", "name@example..com", "na..me@example.com", ".name@example.com", "name.@example.com",
    "name@-example.com", "name@example-.com", "name@exa_mple.com", "name@example.123", `${"a".repeat(65)}@example.com`,
    `a@${"b".repeat(250)}.com`,
  ])("rejects %j", (e) => expect(emailError(e)).not.toBe(""));
});

describe("PIN validation", () => {
  it("accepts exactly 4 digits", () => { expect(pinError("0123")).toBe(""); });
  it.each(["", "123", "12345", "12a4", " 1234"])("rejects %j", (p) => expect(pinError(p)).not.toBe(""));
});

describe("7-day sign-out", () => {
  const t = 1_800_000_000_000;
  it("keeps a session younger than 7 days", () => expect(isSessionExpired(t, t + SESSION_MAX_MS - 1)).toBe(false));
  it("ends a session at 7 days", () => expect(isSessionExpired(t, t + 7 * 24 * 3600_000)).toBe(true));
  it("ends a session with no sign-in time", () => expect(isSessionExpired(null, t)).toBe(true));
});
