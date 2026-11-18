import { useCallback, useEffect, useState } from "react";

interface TourStep {
  selector: string;
  title: string;
  body: string;
}

const STEPS: TourStep[] = [
  {
    selector: "#sleep",
    title: "1. Set the sleep time",
    body: "Pick the time you want to stop scrolling tonight, between 7:00 PM and 11:30 PM in 5-minute steps.",
  },
  {
    selector: '[data-tour="save-time"]',
    title: "2. Save the time",
    body: "Tap Save time for a focused sleep time. If you want to change the time later, make sure you save it again.",
  },
  {
    selector: '[data-tour="start-session"]',
    title: "3. Start the session",
    body: "Tap “Start pre-bedtime session” to begin.",
  },
  {
    selector: '[data-tour="nav-session"]',
    title: "4. Session tab",
    body: "Open the Session tab to see the timer. When the countdown ends, an alarm appears where you can extend the time by 10 mins or tap Stop. If you stop and keep using your phone, the alarm will appear again.",
  },
  {
    selector: '[data-tour="nav-progress"]',
    title: "5. Progress tab",
    body: "Open the Progress tab to see your records.",
  },
  {
    selector: '[data-tour="info"]',
    title: "6. Instructions button",
    body: "Click on the i button for step by step instructions, anytime you forget how to use Pause.",
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** First-visit guided tour: spotlights each part of the home page in order. */
export function HomeTour({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const measure = useCallback(() => {
    const el = document.querySelector(STEPS[step]?.selector ?? "");
    if (!el) return setRect(null);
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  useEffect(() => {
    const el = document.querySelector(STEPS[step]?.selector ?? "");
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    const t = setTimeout(measure, 350);
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, [step, measure]);

  const last = step === STEPS.length - 1;
  const current = STEPS[step];
  if (!current) return null;

  const pad = 8;
  const spot = rect
    ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null;
  // Tooltip under the highlight when there's room, otherwise above it.
  const below = spot ? spot.top + spot.height + 16 + 240 < window.innerHeight : true;
  const tipStyle: React.CSSProperties = spot
    ? below
      ? { top: spot.top + spot.height + 16, left: Math.max(16, Math.min(spot.left, window.innerWidth - 340)) }
      : { bottom: window.innerHeight - spot.top + 16, left: Math.max(16, Math.min(spot.left, window.innerWidth - 340)) }
    : { top: "40%", left: 16 };

  return (
    <div role="dialog" aria-modal="true" aria-label="Getting started tour" className="fixed inset-0 z-50">
      {spot && (
        <div
          className="pointer-events-none fixed rounded-xl border-2 border-primary"
          style={{ ...spot, boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.75)" }}
        />
      )}
      {!spot && <div className="fixed inset-0 bg-night/80" />}
      <div className="panel fixed w-[min(320px,calc(100vw-32px))]" style={tipStyle}>
        <h2 className="font-display text-xl">{current.title}</h2>
        <p className="mt-2 text-base text-muted-foreground">{current.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <button type="button" className="link-btn" onClick={onDone}>
            Skip tour
          </button>
          <button type="button" className="btn-primary" onClick={() => (last ? onDone() : setStep(step + 1))}>
            {last ? "Done" : "Next"}
          </button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}

const tourKey = (userId: string) => `pause.tourSeen.${userId}`;

/** True when this account has never seen the home tour on this device. */
export function shouldShowTour(userId: string): boolean {
  try {
    return !localStorage.getItem(tourKey(userId));
  } catch {
    return false;
  }
}

export function markTourSeen(userId: string): void {
  try {
    localStorage.setItem(tourKey(userId), "1");
  } catch {
    // Storage unavailable: the tour simply shows again next visit.
  }
}
