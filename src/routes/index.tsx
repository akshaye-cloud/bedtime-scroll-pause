import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PauseMark } from "@/components/PauseMark";
import { AuthField, AuthIntro } from "@/components/AuthField";
import { GoogleButton } from "@/components/GoogleButton";
import { device, emailError } from "@/lib/auth-rules";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pause — Sign in" },
      { name: "description", content: "Sign in to Pause with email and password or Google." },
      { property: "og:title", content: "Pause — Bedtime Scrolling Assistant" },
      { property: "og:description", content: "Set a stopping time and get a gentle alarm an hour before bed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignIn,
});

type Errors = Partial<Record<"email" | "password" | "form", string | undefined>>;

function SignIn() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const check = async () => {
      const fromGoogle = sessionStorage.getItem("pause:googlePending") === "1";
      sessionStorage.removeItem("pause:googlePending");
      const { data } = await supabase.auth.getUser();
      if (data.user) { if (fromGoogle) device.markSignedIn(); void nav({ to: "/home", replace: true }); }
    };
    void check();
    const onDone = () => void check();
    window.addEventListener("pause:google-done", onDone);
    return () => window.removeEventListener("pause:google-done", onDone);
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Errors = {};
    const em = emailError(email); if (em) errs.email = em;
    if (!password) errs.password = "Please enter your password.";
    if (Object.keys(errs).length) return setErrors(errs);
    setBusy(true);
    const clean = email.trim().toLowerCase();
    const r = await supabase.auth.signInWithPassword({ email: clean, password });
    setBusy(false);
    if (r.error) {
      return setErrors({ password: "Wrong email or password." });
    }
    device.markSignedIn();
    nav({ to: "/home" });
  };

  return (
    <div className="min-h-screen bg-night">
      <main className="mx-auto max-w-md px-6 py-14">
        <div className="flex items-center gap-2.5"><PauseMark size={34} className="text-primary" /><span className="font-display text-3xl text-foreground">Pause</span></div>
        <AuthIntro title="Sign in" subtitle="Use your email and password, or continue with Google." />
        <form onSubmit={submit} noValidate className="panel mt-8">
          <AuthField id="email" label="Email" type="email" autoComplete="email" value={email} error={errors.email} onChange={(v) => { setEmail(v); setErrors({}); }} />
          <AuthField id="password" label="Password" type="password" autoComplete="current-password" value={password} error={errors.password} onChange={(v) => { setPassword(v); setErrors({}); }} secret />
          {errors.form && <p role="alert" className="mt-4 text-destructive">{errors.form}</p>}
          <button type="submit" disabled={busy} className="btn-primary mt-7 w-full">{busy ? "Please wait…" : "Sign in"}</button>
          <GoogleButton label="Sign in with Google" onError={(m) => setErrors({ form: m })} />
        </form>
        <p className="mt-4 text-base text-muted-foreground">New to Pause? <Link to="/signup" className="link-btn">Create an account</Link></p>
        <p className="mt-2 text-sm text-muted-foreground">For your safety, you'll be signed out every 7 days.</p>
      </main>
    </div>
  );
}
