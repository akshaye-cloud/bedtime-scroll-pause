// Browser-safe pure sign-in rules shared by the sign-in/sign-up pages and tests.
export const SESSION_MAX_MS = 7 * 24 * 60 * 60 * 1000;

const EMAIL_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._%+-]*[A-Za-z0-9_%+-])?@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

/** Returns an error message, or "" when the email is acceptable. */
export function emailError(raw: string): string {
  const email = raw.trim();
  if (!email) return "Please enter your email.";
  if (email.length > 254) return "Email is too long.";
  if (/\s/.test(email)) return "Email can't contain spaces.";
  const parts = email.split("@");
  if (parts.length !== 2) return "Email must contain exactly one @.";
  const [local, domain] = parts;
  if (!local || !domain) return "Please enter a valid email.";
  if (local.length > 64) return "The part before @ is too long.";
  if (email.includes("..")) return "Email can't contain two dots in a row.";
  if (!EMAIL_RE.test(email)) return "Please enter a valid email, like name@example.com.";
  return "";
}

export function pinError(pin: string): string {
  if (!pin) return "Please enter your 4-digit PIN.";
  if (!/^\d{4}$/.test(pin)) return "PIN must be exactly 4 digits.";
  return "";
}

export function isSessionExpired(signedInAt: number | null, now: number): boolean {
  return signedInAt === null || now - signedInAt >= SESSION_MAX_MS;
}

// Device memory: which account the PIN unlocks, and when the last full sign-in happened.
const ACCOUNT_KEY = "pause:pinAccount";
const SIGNED_AT_KEY = "pause:signedInAt";
export const device = {
  getAccount: (): { email: string; name: string } | null => {
    try { return JSON.parse(localStorage.getItem(ACCOUNT_KEY) || "null"); } catch { return null; }
  },
  setAccount: (a: { email: string; name: string }) => localStorage.setItem(ACCOUNT_KEY, JSON.stringify(a)),
  forgetAccount: () => localStorage.removeItem(ACCOUNT_KEY),
  getSignedInAt: (): number | null => { const v = Number(localStorage.getItem(SIGNED_AT_KEY)); return v > 0 ? v : null; },
  markSignedIn: (at = Date.now()) => localStorage.setItem(SIGNED_AT_KEY, String(at)),
  clearSignedIn: () => localStorage.removeItem(SIGNED_AT_KEY),
};
