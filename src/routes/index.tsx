import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { PauseMark } from "@/components/PauseMark";
import { AuthField, AuthIntro } from "@/components/AuthField";
import { device, emailError, pinError } from "@/lib/auth-rules";
import { pinSignIn } from "@/lib/pin.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pause — Sign in" },
      { name: "description", content: "Sign in to Pause with your 4-digit PIN." },
      { property: "og:title", content: "Pause — Bedtime Scrolling Assistant" },
      { property: "og:description", content: "Set a stopping time and get a gentle alarm an hour before bed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignIn,
});

type Errors = Partial<Record<"email" | "password" | "pin" | "form", string>>;

function SignIn() {
  const nav = useNavigate();
  const pinFn = useServerFn(pinSignIn);
  const [account, setAccount] = useState<{ email: string; name: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAccount(device.getAccount());
    setReady(true);
    void supabase.auth.getUser().then(({ data }) => { if (data.user) void nav({ to: "/home", replace: true }); });
  }, [nav]);

  const done = () => { device.markSignedIn(); nav({ to: "/home" }); };

  const submitPin = async (e: React.FormEvent) => {
    e.preventDefault();
    const pe = pinError(pin); if (pe || !account) return setErrors({ pin: pe });
    setBusy(true);
    try {
      const r = await pinFn({ data: { email: account.email, pin } });
      if (r.status === "ok") {
        const v = await supabase.auth.verifyOtp({ token_hash: r.tokenHash, type: "email" });
        if (!v.error) return done();
        return setErrors({ form: "Couldn't sign you in. Please try again." });
      }
      setPin("");
      setErrors(
        r.status === "wrong" ? { pin: "Wrong PIN. Please try again." }
        : r.status === "locked" ? { pin: "Too many wrong tries. Wait 15 minutes, or sign in with email and password." }
        : r.status === "nopin" ? { form: "This account has no PIN. Sign in with email and password." }
        : { form: "Something went wrong. Please try again." },
      );
    } catch { setErrors({ form: "Couldn't reach Pause. Check your connection." }); }
    finally { setBusy(false); }
  };

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = emailError(email);
    const errs: Errors = {};
    if (em) errs.email = em;
    if (!password) errs.password = "Please enter your password.";
    if (Object.keys(errs).length) return setErrors(errs);
    setBusy(true);
    const clean = email.trim().toLowerCase();
    const r = await supabase.auth.signInWithPassword({ email: clean, password });
    if (r.error) { setBusy(false); return setErrors({ password: "Wrong email or password." }); }
    const { data: hasPin } = await supabase.rpc("has_my_pin");
    const { data: p } = await supabase.from("profiles").select("name").eq("id", r.data.user.id).maybeSingle();
    if (hasPin) device.setAccount({ email: clean, name: p?.name || clean });
    setBusy(false);
    done();
  };

  const useOther = () => { device.forgetAccount(); setAccount(null); setErrors({}); setPin(""); };

  return (
    <div className="min-h-screen bg-night">
      <main className="mx-auto max-w-md px-6 py-14">
        <div className="flex items-center gap-2.5"><PauseMark size={34} className="text-primary" /><span className="font-display text-3xl text-foreground">Pause</span></div>
        {ready && account ? (
          <>
            <AuthIntro title={`Welcome back, ${account.name}`} subtitle="Enter your 4-digit PIN to sign in." />
            <form onSubmit={submitPin} noValidate className="panel mt-8">
              <AuthField id="pin" label="PIN" type="password" autoComplete="off" value={pin} error={errors.pin}
                onChange={(v) => { setPin(v); setErrors({}); }} pin secret />
              {errors.form && <p role="alert" className="mt-4 text-destructive">{errors.form}</p>}
              <button type="submit" disabled={busy} className="btn-primary mt-7 w-full">{busy ? "Please wait…" : "Sign in"}</button>
            </form>
            <p className="mt-6 text-base text-muted-foreground">Not {account.name}? <button onClick={useOther} className="link-btn">Use another account</button></p>
          </>
        ) : ready ? (
          <>
            <AuthIntro title="Sign in" subtitle="First time on this phone? Sign in once with email and password. After that, your PIN is enough." />
            <form onSubmit={submitEmail} noValidate className="panel mt-8">
              <AuthField id="email" label="Email" type="email" autoComplete="email" value={email} error={errors.email} onChange={(v) => { setEmail(v); setErrors({}); }} />
              <AuthField id="password" label="Password" type="password" autoComplete="current-password" value={password} error={errors.password} onChange={(v) => { setPassword(v); setErrors({}); }} secret />
              {errors.form && <p role="alert" className="mt-4 text-destructive">{errors.form}</p>}
              <button type="submit" disabled={busy} className="btn-primary mt-7 w-full">{busy ? "Please wait…" : "Sign in"}</button>
            </form>
          </>
        ) : null}
        <p className="mt-4 text-base text-muted-foreground">New to Pause? <Link to="/signup" className="link-btn">Create an account</Link></p>
        <p className="mt-2 text-sm text-muted-foreground">For your safety, you'll be signed out every 7 days.</p>
      </main>
    </div>
  );
}
