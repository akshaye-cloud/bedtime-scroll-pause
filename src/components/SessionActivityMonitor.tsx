import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { stopInactiveSession, store } from "@/lib/pause";

export function SessionActivityMonitor() {
  const navigate = useNavigate();
  useEffect(() => {
    const check = () => {
      if (stopInactiveSession()) void navigate({ to: "/progress" });
    };
    const activity = () => {
      // Handle a deadline passed while the browser was suspended before recording a new tap.
      check();
      const session = store.getActive();
      if (session) store.setActive({ ...session, lastActivityAt: Date.now() });
    };
    check();
    const timer = window.setInterval(check, 1000);
    document.addEventListener("pointerdown", activity, true);
    document.addEventListener("keydown", activity, true);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("storage", check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("pointerdown", activity, true);
      document.removeEventListener("keydown", activity, true);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("storage", check);
    };
  }, [navigate]);
  return null;
}