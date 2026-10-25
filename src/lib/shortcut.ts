// Lock-screen shortcut: a persistent notification that opens Pause. Browser-only; call from effects/gestures.
import { fmtTime, store } from "@/lib/pause";

const TAG = "pause-session";

export const notificationsSupported = () =>
  typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;

async function registration() {
  return navigator.serviceWorker.register("/notify-sw.js", { scope: "/" });
}

export async function enableShortcut(): Promise<NotificationPermission | "unsupported"> {
  if (!notificationsSupported()) return "unsupported";
  const p = await Notification.requestPermission();
  if (p === "granted") await syncShortcut();
  return p;
}

/** Show/update the shortcut while a session runs; remove it when none is active. */
export async function syncShortcut() {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  try {
    const reg = await registration();
    const s = store.getActive();
    if (!s) {
      (await reg.getNotifications({ tag: TAG })).forEach((n) => n.close());
      return;
    }
    await reg.showNotification("Pause session running", {
      tag: TAG,
      body: `Alarm at ${fmtTime(s.promptAt)} · sleep time ${fmtTime(s.sleepAt)}. Tap to open Pause.`,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      requireInteraction: true,
      silent: true,
      data: { url: "/session" },
    });
  } catch { /* Unsupported browser: the home-screen icon still works. */ }
}
