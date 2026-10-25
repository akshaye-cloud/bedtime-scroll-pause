import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PrimaryButton, GhostButton } from "@/components/Shell";
import { fmtTime, pendingResume, resumeFromRecord, store, type SessionRecord } from "@/lib/pause";

export const Route = createFileRoute("/continue")({
  head: () => ({
    meta: [
      { title: "Pause — Still want to continue?" },
      { name: "description", content: "You came back after stopping. Decide whether to keep going." },
      { property: "og:title", content: "Pause — Still want to continue?" },
      { property: "og:description", content: "You came back after stopping. Decide whether to keep going." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Continue,
});

function Continue() {
  const nav = useNavigate();
  const [state, setState] = useState<{ record: SessionRecord; variant: "before" | "after" } | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setState(pendingResume()); setLoaded(true); }, []);

  const no = () => { store.clearResume(); nav({ to: "/progress" }); };
  const yes = () => {
    if (!state) return;
    store.setActive(resumeFromRecord(state.record, Date.now()));
    nav({ to: "/session" });
  };

  return (
    <div className="bg-alarm flex min-h-screen flex-col items-center justify-center px-6 text-center">
      {!loaded ? null : !state ? (
        <div>
          <h1 className="font-display text-3xl">Nothing to continue</h1>
          <Link to="/" className="btn-primary mt-8 inline-block">Go to Home</Link>
        </div>
      ) : (
        <div className="w-full max-w-md">
          <div className="moon mx-auto" aria-hidden />
          {state.variant === "after" && (
            <p className="mt-8 font-display text-4xl leading-tight text-primary">You've exceeded the limit!</p>
          )}
          <h1 className={`${state.variant === "after" ? "mt-4" : "mt-8"} font-display text-4xl leading-tight`}>Do you still want to continue?</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            {state.variant === "after"
              ? `Your sleep time was ${fmtTime(state.record.sleepAt)}.`
              : `Your sleep time is ${fmtTime(state.record.sleepAt)}.`}
          </p>
          <PrimaryButton className="mt-10 w-full" onClick={no} autoFocus>No</PrimaryButton>
          <GhostButton className="mt-3 w-full" onClick={yes}>Yes (+10 mins)</GhostButton>
        </div>
      )}
    </div>
  );
}
