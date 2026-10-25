import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { pendingResume, stopInactiveSession, store } from "@/lib/pause";

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
    // Reopening Pause after a stop (or auto-stop) asks whether to continue.
    const reopen = () => {
      if (document.visibilityState === "visible" && window.location.pathname !== "/continue" && pendingResume()) void navigate({ to: "/continue" });
    };
    const onVisible = () => { check(); reopen(); };
    check();
    reopen();
    const timer = window.setInterval(check, 1000);
    document.addEventListener("pointerdown", activity, true);
    document.addEventListener("keydown", activity, true);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("storage", check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("pointerdown", activity, true);
      document.removeEventListener("keydown", activity, true);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("storage", check);
    };
  }, [navigate]);
  return null;
}