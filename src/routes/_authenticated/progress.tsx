import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { fmtDate, fmtTime, groupByDay, LOCK_EXEMPT_EMAIL, recordResultLabel, stoppedTimeTone, store, summarize, type DayGroup, type SessionRecord } from "@/lib/pause";
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
  const [openDays, setOpenDays] = useState<Set<string>>(new Set());
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setCanClear(data.user?.email === LOCK_EXEMPT_EMAIL));
    const load = () => setRecords(store.getRecords());
    load();
    window.addEventListener("pause:records-synced", load);
    window.addEventListener("pause:record-added", load);
    return () => {
      window.removeEventListener("pause:records-synced", load);
      window.removeEventListener("pause:record-added", load);
    };
  }, []);

  if (!records) return <Shell><p className="text-muted-foreground">Loading…</p></Shell>;
  const dayGroups = groupByDay(records);
  const days = dayGroups.map((g) => g.latest);
  const s = summarize(days);

  const toggleDay = (key: string) => {
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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
            <MonthTable groups={dayGroups} />
          ) : (
          <ul className="mt-4 space-y-3">
            {dayGroups.map((g) => (
              <DayItem key={g.key} group={g} open={openDays.has(g.key)} onToggle={() => toggleDay(g.key)} />
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

function MonthTable({ groups }: { groups: DayGroup[] }) {
  const now = new Date();
  const years = Array.from(new Set([now.getFullYear(), ...groups.map((g) => new Date(g.latest.sleepAt).getFullYear())])).sort((a, b) => b - a);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const rows = groups
    .filter((g) => { const d = new Date(g.latest.sleepAt); return d.getFullYear() === year && d.getMonth() === month; })
    .sort((a, b) => a.latest.sleepAt - b.latest.sleepAt);
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
              <tr><th className="p-3">Date</th><th className="p-3">Planned</th><th className="p-3">+10 mins (1-hr window)</th><th className="p-3">+10 mins (after bedtime)</th><th className="p-3">Stopped</th><th className="p-3">Result</th></tr>
            </thead>
            <tbody>
              {rows.map((g) => (
                <Fragment key={g.key}>
                  <tr className="border-t border-border">
                    <td className="p-3">
                      <span className="flex items-center gap-2">
                        {g.all.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setOpen((prev) => ({ ...prev, [g.key]: !prev[g.key] }))}
                            aria-expanded={!!open[g.key]}
                            aria-label={open[g.key] ? "Hide earlier stops" : "Show earlier stops"}
                            className="link-btn p-0"
                          >
                            <Caret open={!!open[g.key]} />
                          </button>
                        )}
                        {new Date(g.latest.sleepAt).getDate()} {MONTHS[month]?.slice(0, 3)}
                      </span>
                    </td>
                    <td className="p-3">{fmtTime(g.latest.sleepAt)}</td>
                    <td className="p-3">{g.latest.preExtensions ?? 0}</td>
                    <td className="p-3">{g.latest.postExtensions ?? 0}</td>
                    <td className="p-3"><StoppedTime record={g.latest} /></td>
                    <td className="p-3">{recordResultLabel(g.latest)}</td>
                  </tr>
                  {open[g.key] && g.all.slice(1).map((e) => (
                    <tr key={e.id} className="border-t border-border text-sm text-muted-foreground">
                      <td className="p-3 pl-10 text-xs">Earlier stop</td>
                      <td className="p-3">{fmtTime(e.sleepAt)}</td>
                      <td className="p-3">{e.preExtensions ?? 0}</td>
                      <td className="p-3">{e.postExtensions ?? 0}</td>
                      <td className="p-3"><StoppedTime record={e} /></td>
                      <td className="p-3">{recordResultLabel(e)}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Caret({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}>
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DayItem({ group, open, onToggle }: { group: DayGroup; open: boolean; onToggle: () => void }) {
  const r = group.latest;
  const earlier = group.all.slice(1);
  return (
    <li className="panel">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-lg">{fmtDate(r.sleepAt)}</p>
          <p className="text-muted-foreground">Planned {fmtTime(r.sleepAt)} · Stopped <StoppedTime record={r} /></p>
          <p className="text-sm text-muted-foreground">+10 mins: {r.preExtensions ?? 0} in 1-hr window · {r.postExtensions ?? 0} after bedtime</p>
          {r.endReason === "inactive_in_pause" && (
            <p className="mt-1 text-sm text-muted-foreground">Automatically ended due to inactivity in Pause. Activity in other apps is unknown.</p>
          )}
        </div>
        <span className={r.endReason === "inactive_in_pause" ? "text-sm text-muted-foreground" : r.outcome === "continued" ? "chip-warn" : "chip-ok"}>
          {recordResultLabel(r)}
        </span>
      </div>
      {earlier.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <button type="button" onClick={onToggle} aria-expanded={open} className="link-btn flex items-center gap-1 text-sm">
            <Caret open={open} />
            {open ? "Hide earlier stops" : `Show ${earlier.length} earlier stop${earlier.length > 1 ? "s" : ""}`}
          </button>
          {open && (
            <ul className="mt-3 space-y-2">
              {earlier.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">
                    Planned {fmtTime(e.sleepAt)} · Stopped <StoppedTime record={e} /> · +10 mins: {e.preExtensions ?? 0} in 1-hr · {e.postExtensions ?? 0} after
                  </span>
                  <span className={e.endReason === "inactive_in_pause" ? "text-muted-foreground" : e.outcome === "continued" ? "chip-warn" : "chip-ok"}>
                    {recordResultLabel(e)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

const stoppedTimeClasses = {
  green: "text-stop-green",
  amber: "text-stop-amber",
  red: "text-stop-red",
  neutral: "text-muted-foreground",
};

function StoppedTime({ record }: { record: SessionRecord }) {
  return <span className={`font-semibold tabular-nums ${stoppedTimeClasses[stoppedTimeTone(record)]}`}>{fmtTime(record.endedAt)}</span>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel">
      <p className="font-display text-3xl">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
