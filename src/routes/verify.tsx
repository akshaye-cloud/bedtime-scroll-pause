import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PauseMark } from "@/components/PauseMark";
import { AuthField, AuthIntro } from "@/components/AuthField";
import { device } from "@/lib/auth-rules";

type Search = { email: string; type: "signup" | "email" };

export const Route = createFileRoute("/verify")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    email: typeof s["email"] === "string" ? s["email"] : "",
    type: s["type"] === "email" ? "email" : "signup",
  }),
  head: () => ({
    meta: [
      { title: "Pause — Enter your confirmation code" },
      { name: "description", content: "Enter the code we emailed you to confirm your Pause account." },
      { property: "og:title", content: "Pause — Confirm your email" },
      { property: "og:description", content: "Confirm your email with the code we sent you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Verify,
});

function Verify() {
  const { email, type } = Route.useSearch();
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6,8}$/.test(code.trim())) return setError("Enter the code from your email.");
    setBusy(true);
    const r = await supabase.auth.verifyOtp({ email, token: code.trim(), type });
    setBusy(false);
    if (r.error) return setError("That code is wrong or has expired. Try again or resend it.");
    device.markSignedIn();
    nav({ to: "/home" });
  };

  const resend = async () => {
    setError(""); setNote("");
    const r = type === "signup"
      ? await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: window.location.origin } })
      : await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: window.location.origin } });
    if (r.error) setError("Couldn't send a new code yet. Wait a minute and try again.");
    else setNote("A new code is on its way.");
  };

  return (
    <div className="min-h-screen bg-night">
      <main className="mx-auto max-w-md px-6 py-14">
        <div className="flex items-center gap-2.5"><PauseMark size={34} className="text-primary" /><span className="font-display text-3xl text-foreground">Pause</span></div>
        <AuthIntro title="Check your email" subtitle={`We sent an email to ${email || "your email"}. Tap the Log In or Confirm button in it, or enter the code if the email shows one.`} />
        <form onSubmit={submit} noValidate className="panel mt-8">
          <AuthField id="code" label="Confirmation code" type="text" autoComplete="one-time-code" value={code} error={error}
            onChange={(v) => { setCode(v.replace(/\D/g, "").slice(0, 8)); setError(""); }} />
          {note && <p role="status" className="mt-4 text-muted-foreground">{note}</p>}
          <button type="submit" disabled={busy} className="btn-primary mt-7 w-full">{busy ? "Please wait…" : "Confirm"}</button>
        </form>
        <p className="mt-6 text-base text-muted-foreground">Didn't get it? Check spam, or <button onClick={resend} className="link-btn">send a new code</button>.</p>
        <p className="mt-2 text-base text-muted-foreground"><Link to="/" className="link-btn">Back to sign in</Link></p>
      </main>
    </div>
  );
}
