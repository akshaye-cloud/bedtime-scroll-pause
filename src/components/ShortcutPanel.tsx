import { useEffect, useState } from "react";
import { enableShortcut, notificationsSupported } from "@/lib/shortcut";

export function ShortcutPanel() {
  const [state, setState] = useState<"unknown" | NotificationPermission | "unsupported">("unknown");
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    setState(notificationsSupported() ? Notification.permission : "unsupported");
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
  }, []);
  if (state === "unknown") return null;
  return (
    <div className="panel mt-8 text-base">
      <h2 className="font-display text-xl">Phone shortcut</h2>
      {!installed && (
        <p className="mt-2 text-muted-foreground">
          Add Pause to your home screen: on iPhone tap Share → Add to Home Screen; on Android tap the browser menu → Add to Home screen / Install app.
        </p>
      )}
      {state === "granted" ? (
        <p className="mt-2 text-muted-foreground">Lock screen shortcut is on. While a session runs, a notification shows your alarm time — tap it to jump back to Pause.</p>
      ) : state === "denied" ? (
        <p className="mt-2 text-muted-foreground">Notifications are blocked for Pause. Allow them in your browser settings to get the lock screen shortcut.</p>
      ) : state === "unsupported" ? (
        <p className="mt-2 text-muted-foreground">This browser can't show the lock screen shortcut. On iPhone, open Pause from the home screen icon first.</p>
      ) : (
        <button className="link-btn mt-2" onClick={async () => setState(await enableShortcut())}>Turn on lock screen shortcut</button>
      )}
    </div>
  );
}
