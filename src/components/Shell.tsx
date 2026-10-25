import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { PauseMark } from "@/components/PauseMark";

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
        </nav>
      </header>
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
