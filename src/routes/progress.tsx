import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { fmtDate, fmtTime, outcomeLabel, store, summarize, type SessionRecord } from "@/lib/pause";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Pause — Your progress" },
      { name: "description", content: "Review your recorded bedtime sessions." },
      { property: "og:title", content: "Pause — Your progress" },
      { property: "og:description", content: "Review your recorded bedtime sessions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Progress,
});

function Progress() {
  const [records, setRecords] = useState<SessionRecord[] | null>(null);
  useEffect(() => setRecords(store.getRecords()), []);

  if (!records) return <Shell><p className="text-muted-foreground">Loading…</p></Shell>;
  const s = summarize(records);

  const clear = () => {
    if (confirm("Delete all recorded sessions?")) { store.clearRecords(); setRecords([]); }
  };

  return (
    <Shell>
      <h1 className="font-display text-4xl">Progress</h1>
      {records.length === 0 ? (
        <div className="panel mt-8 text-center">
          <p className="text-lg">No sessions recorded yet.</p>
          <p className="mt-2 text-muted-foreground">Finish a session and it will appear here.</p>
          <Link to="/" className="btn-primary mt-6 inline-block">Start a session</Link>
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-3">
            <Stat label="Stopped on or before time" value={`${s.onTime} / ${s.total}`} />
            <Stat label="Success rate" value={`${s.rate}%`} />
            <Stat label="Continued past time" value={`${s.continued}`} />
            <Stat label="Avg. minutes over" value={`${s.avgBeyond}`} />
          </div>
          <h2 className="mt-10 font-display text-2xl">Sessions</h2>
          <ul className="mt-4 space-y-3">
            {records.map((r) => (
              <li key={r.id} className="panel flex items-center justify-between gap-4">
                <div>
                  <p className="text-lg">{fmtDate(r.sleepAt)}</p>
                  <p className="text-muted-foreground">Planned {fmtTime(r.sleepAt)} · Stopped {fmtTime(r.endedAt)}</p>
                  {r.endReason === "inactive_in_pause" && (
                    <p className="mt-1 text-sm text-muted-foreground">Automatically ended: no taps or typing in Pause for 2 minutes after sleep time was reached. Activity in other apps is unknown.</p>
                  )}
                </div>
                <span className={r.outcome === "continued" ? "chip-warn" : "chip-ok"}>
                  {outcomeLabel[r.outcome]}{r.minutesBeyond > 0 ? ` +${r.minutesBeyond}m` : ""}
                </span>
              </li>
            ))}
          </ul>
          <Link to="/" className="btn-primary mt-10 block text-center">Start tonight's session</Link>
          <button onClick={clear} className="link-btn mt-6 block w-full text-center">Clear all records</button>
        </>
      )}
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel">
      <p className="font-display text-3xl">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
