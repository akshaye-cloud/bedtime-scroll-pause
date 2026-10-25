import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { fmtDate, fmtTime, latestPerDay, LOCK_EXEMPT_EMAIL, outcomeLabel, store, summarize, type SessionRecord } from "@/lib/pause";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/progress")({
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
  const [canClear, setCanClear] = useState(false);
  const [view, setView] = useState<"list" | "table">("list");
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setCanClear(data.user?.email === LOCK_EXEMPT_EMAIL));
    const load = () => setRecords(store.getRecords());
    load();
    window.addEventListener("pause:records-synced", load);
    return () => window.removeEventListener("pause:records-synced", load);
  }, []);

  if (!records) return <Shell><p className="text-muted-foreground">Loading…</p></Shell>;
  const days = latestPerDay(records);
  const s = summarize(days);

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
          <Link to="/home" className="btn-primary mt-6 inline-block">Start a session</Link>
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-3">
            <Stat label="Stopped on or before time" value={`${s.onTime} / ${s.total}`} />
            <Stat label="Success rate" value={`${s.rate}%`} />
            <Stat label="Continued past time" value={`${s.continued}`} />
            <Stat label="Avg. minutes over" value={`${s.avgBeyond}`} />
          </div>
          <div className="mt-10 flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl">Sessions</h2>
            <div className="flex gap-2 text-sm" role="tablist">
              <button role="tab" aria-selected={view === "list"} onClick={() => setView("list")} className={view === "list" ? "chip-ok" : "link-btn"}>List</button>
              <button role="tab" aria-selected={view === "table"} onClick={() => setView("table")} className={view === "table" ? "chip-ok" : "link-btn"}>Table</button>
            </div>
          </div>
          {view === "table" ? (
            <MonthTable days={days} />
          ) : (
          <ul className="mt-4 space-y-3">
            {days.map((r) => (
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
          )}
          <Link to="/home" className="btn-primary mt-10 block text-center">Start tonight's session</Link>
          {canClear && <button onClick={clear} className="link-btn mt-6 block w-full text-center">Clear all records</button>}
        </>
      )}
    </Shell>
  );
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function MonthTable({ days }: { days: SessionRecord[] }) {
  const now = new Date();
  const years = Array.from(new Set([now.getFullYear(), ...days.map((r) => new Date(r.sleepAt).getFullYear())])).sort((a, b) => b - a);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const rows = days
    .filter((r) => { const d = new Date(r.sleepAt); return d.getFullYear() === year && d.getMonth() === month; })
    .sort((a, b) => a.sleepAt - b.sleepAt);
  return (
    <div className="mt-4">
      <div className="flex gap-3">
        <label className="flex-1 text-sm">
          <span className="font-semibold">Year</span>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="field-input mt-1 w-full">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <label className="flex-1 text-sm">
          <span className="font-semibold">Month</span>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="field-input mt-1 w-full">
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
        </label>
      </div>
      {rows.length === 0 ? (
        <p className="panel mt-4 text-center text-muted-foreground">No records for {MONTHS[month]} {year}.</p>
      ) : (
        <div className="panel mt-4 overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="text-muted-foreground">
              <tr><th className="p-3">Date</th><th className="p-3">Planned</th><th className="p-3">Stopped</th><th className="p-3">Result</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3">{new Date(r.sleepAt).getDate()} {MONTHS[month]?.slice(0, 3)}</td>
                  <td className="p-3">{fmtTime(r.sleepAt)}</td>
                  <td className="p-3">{fmtTime(r.endedAt)}</td>
                  <td className="p-3">{outcomeLabel[r.outcome]}{r.minutesBeyond > 0 ? ` +${r.minutesBeyond}m` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
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
