import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { PauseMark } from "@/components/PauseMark";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pause — Welcome" },
      { name: "description", content: "Enter your name, email and password to start using Pause." },
      { property: "og:title", content: "Pause — Bedtime Scrolling Assistant" },
      { property: "og:description", content: "Set a stopping time and get a gentle alarm an hour before bed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Welcome,
});

const schema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(100, "Name must be under 100 characters."),
  email: z.string().trim().min(1, "Please enter your email.").email("Please enter a valid email.").max(255),
  password: z.string().min(6, "Password must be at least 6 characters.").max(72),
});
type Errors = Partial<Record<"name" | "email" | "password" | "form", string>>;

function Welcome() {
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => { if (data.user) void nav({ to: "/home", replace: true }); });
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errs: Errors = {};
      for (const issue of parsed.error.issues) errs[issue.path[0] as keyof Errors] ??= issue.message;
      return setErrors(errs);
    }
    setErrors({});
    setBusy(true);
    const { name, email, password } = parsed.data;
    const signIn = await supabase.auth.signInWithPassword({ email, password });
    if (!signIn.error) { setBusy(false); return nav({ to: "/home" }); }
    const signUp = await supabase.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (signUp.error) {
      const exists = /already|registered/i.test(signUp.error.message);
      return setErrors(exists ? { password: "Wrong password for this email." } : { form: signUp.error.message });
    }
    if (!signUp.data.session) return setErrors({ password: "Wrong password for this email." });
    nav({ to: "/home" });
  };

  const field = (key: "name" | "email" | "password", label: string, type: string, auto: string) => (
    <div className="mt-5">
      <label htmlFor={key} className="text-base text-muted-foreground">{label} <span aria-hidden className="text-primary">*</span></label>
      <input
        id={key} type={type} required autoComplete={auto} value={form[key]}
        aria-invalid={!!errors[key]}
        onChange={(e) => { setForm({ ...form, [key]: e.target.value }); setErrors({ ...errors, [key]: undefined }); }}
        className="time-input mt-2 text-lg"
      />
      {errors[key] && <p role="alert" className="mt-1 text-destructive">{errors[key]}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-night">
      <main className="mx-auto max-w-md px-6 py-14">
        <div className="flex items-center gap-2.5">
          <PauseMark size={34} className="text-primary" />
          <span className="font-display text-3xl text-foreground">Pause</span>
        </div>
        <h1 className="mt-8 font-display text-4xl leading-tight">Welcome</h1>
        <p className="mt-3 text-lg text-muted-foreground">Enter your details to continue. New here? An account is created for you.</p>
        <form onSubmit={submit} noValidate className="panel mt-8">
          {field("name", "Name", "text", "name")}
          {field("email", "Email", "email", "email")}
          {field("password", "Password", "password", "current-password")}
          {errors.form && <p role="alert" className="mt-4 text-destructive">{errors.form}</p>}
          <button type="submit" disabled={busy} className="btn-primary mt-7 w-full">{busy ? "Please wait…" : "Continue"}</button>
        </form>
        <p className="mt-6 text-sm text-muted-foreground">All three fields are required.</p>
      </main>
    </div>
  );
}
