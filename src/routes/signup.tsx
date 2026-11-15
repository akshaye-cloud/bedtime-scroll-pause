import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PauseMark } from "@/components/PauseMark";
import { AuthField, AuthIntro } from "@/components/AuthField";
import { device, emailError, pinError } from "@/lib/auth-rules";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Pause — Create your account" },
      { name: "description", content: "Sign up for Pause with your name, email, password and a 4-digit PIN." },
      { property: "og:title", content: "Pause — Create your account" },
      { property: "og:description", content: "Create a Pause account and sign in later with just your 4-digit PIN." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignUp,
});

type Key = "name" | "email" | "password" | "pin";
type Errors = Partial<Record<Key | "form", string | undefined>>;

function SignUp() {
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", pin: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => { if (data.user) void nav({ to: "/home", replace: true }); });
  }, [nav]);

  const set = (k: Key) => (v: string) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined, form: undefined })); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim(), email = form.email.trim().toLowerCase();
    const errs: Errors = {};
    if (!name) errs.name = "Please enter your name."; else if (name.length > 100) errs.name = "Name must be under 100 characters.";
    const em = emailError(email); if (em) errs.email = em;
    if (form.password.length < 6) errs.password = "Password must be at least 6 characters."; else if (form.password.length > 72) errs.password = "Password must be under 72 characters.";
    const pe = pinError(form.pin); if (pe) errs.pin = pe;
    if (Object.keys(errs).length) return setErrors(errs);
    setBusy(true);
    const res = await supabase.auth.signUp({ email, password: form.password, options: { data: { name }, emailRedirectTo: window.location.origin } });
    if (res.error || !res.data.session || res.data.user?.identities?.length === 0) {
      setBusy(false);
      const exists = !res.error || /already|registered|exists/i.test(res.error.message);
      return setErrors(exists ? { email: "An account with this email already exists. Sign in instead." } : { form: res.error!.message });
    }
    const pin = await supabase.rpc("set_my_pin", { _pin: form.pin });
    setBusy(false);
    if (pin.error) return setErrors({ form: "Your account was created, but the PIN couldn't be saved. Please try again." });
    device.setAccount({ email, name });
    device.markSignedIn();
    nav({ to: "/home" });
  };

  return (
    <div className="min-h-screen bg-night">
      <main className="mx-auto max-w-md px-6 py-14">
        <div className="flex items-center gap-2.5"><PauseMark size={34} className="text-primary" /><span className="font-display text-3xl text-foreground">Pause</span></div>
        <AuthIntro title="Create your account" subtitle="Choose a 4-digit PIN. You'll use it to sign in on this phone." />
        <form onSubmit={submit} noValidate className="panel mt-8">
          <AuthField id="name" label="Name" type="text" autoComplete="name" value={form.name} error={errors.name} onChange={set("name")} />
          <AuthField id="email" label="Email" type="email" autoComplete="email" value={form.email} error={errors.email} onChange={set("email")} />
          <AuthField id="password" label="Password" type="password" autoComplete="new-password" value={form.password} error={errors.password} onChange={set("password")} secret />
          <AuthField id="pin" label="4-digit PIN" type="password" autoComplete="off" value={form.pin} error={errors.pin} onChange={set("pin")} pin secret />
          {errors.form && <p role="alert" className="mt-4 text-destructive">{errors.form}</p>}
          <button type="submit" disabled={busy} className="btn-primary mt-7 w-full">{busy ? "Please wait…" : "Sign up"}</button>
        </form>
        <p className="mt-6 text-base text-muted-foreground">Already have an account? <Link to="/" className="link-btn">Sign in</Link></p>
      </main>
    </div>
  );
}
