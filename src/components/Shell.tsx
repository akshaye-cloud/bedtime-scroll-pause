import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { PauseMark } from "@/components/PauseMark";
import { supabase } from "@/integrations/supabase/client";

function Account() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  useEffect(() => {
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase.from("profiles").select("name").eq("id", data.user.id).maybeSingle();
      setName(p?.name || data.user.email || "");
    });
  }, []);
  const signOut = async () => {
    await supabase.auth.signOut();
    nav({ to: "/", replace: true });
  };
  return (
    <div className="mx-auto flex max-w-xl items-center justify-end gap-3 px-6 pt-3 text-sm text-muted-foreground">
      {name && <span>Signed in as <strong className="text-foreground">{name}</strong></span>}
      <button onClick={signOut} className="link-btn">Sign out</button>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-night">
      <header className="mx-auto flex max-w-xl items-center justify-between px-6 pt-6">
        <Link to="/home" className="flex items-center gap-2.5">
          <PauseMark size={30} className="text-primary" />
          <span className="font-display text-2xl text-foreground">Pause</span>
        </Link>
        <nav className="flex gap-5 text-base">
          <Link to="/home" className="nav-link">Home</Link>
          <Link to="/session" className="nav-link">Session</Link>
          <Link to="/progress" className="nav-link">Progress</Link>
          <Link to="/feedback" className="nav-link">Feedback</Link>
        </nav>
      </header>
      <Account />
      <main className="mx-auto max-w-xl px-6 py-10">{children}</main>
    </div>
  );
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`btn-primary ${props.className ?? ""}`} />;
}
export function GhostButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`btn-ghost ${props.className ?? ""}`} />;
}
