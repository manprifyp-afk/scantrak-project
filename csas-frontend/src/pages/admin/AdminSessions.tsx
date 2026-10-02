import { useState } from "react";
import { Loader2, AlertCircle, Square, Download } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { getAllSessions, closeSession, type AdminSession } from "../../lib/admin";
import { downloadCsv } from "../../lib/csv";

const panel = "rounded-2xl border border-white/5 bg-night text-white";

function when(iso: string) {
  return new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function AdminSessions() {
  const { data, loading, error, reload } = useAsync(getAllSessions);
  const [busy, setBusy] = useState<string | null>(null);
  const sessions: AdminSession[] = data ?? [];
  const liveCount = sessions.filter((s) => s.isActive).length;

  async function handleClose(s: AdminSession) {
    if (!confirm(`Force-close "${s.title ?? s.courseCode}"? Students can no longer check in.`)) return;
    setBusy(s.id);
    try {
      await closeSession(s.id);
      reload();
    } finally {
      setBusy(null);
    }
  }
  function exportCsv() {
    downloadCsv(
      "sessions.csv",
      ["Course", "Session", "Lecturer", "Venue", "When", "Check-ins", "Status"],
      sessions.map((s) => [s.courseCode, s.title ?? "", s.lecturer, s.venue ?? "", when(s.startsAt), s.checkIns, s.isActive ? "Live" : "Ended"])
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-ink-500">Activity</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink-900">Sessions</h1>
          {liveCount > 0 && <p className="mt-1 text-sm text-ink-500">{liveCount} live right now</p>}
        </div>
        <button onClick={exportCsv} disabled={sessions.length === 0} className="inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-surface px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100 disabled:opacity-40">
          <Download className="size-4" /> Export
        </button>
      </div>

      {loading && <div className="flex items-center gap-2 text-ink-500"><Loader2 className="size-4 animate-spin" /> Loading sessions…</div>}
      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg bg-fail-soft px-4 py-3 text-sm text-fail">
          <span className="flex items-center gap-2"><AlertCircle className="size-4" /> {error}</span>
          <button onClick={reload} className="font-medium underline">Retry</button>
        </div>
      )}

      {!loading && !error && (
        <section className={panel + " overflow-hidden"}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 text-left text-[11.5px] uppercase tracking-wide text-ink-400">
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="px-4 py-3 font-medium">Session</th>
                  <th className="px-4 py-3 font-medium">Lecturer</th>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 text-right font-medium">Check-ins</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3 font-mono text-[12.5px] font-medium text-brand-300">{s.courseCode}</td>
                    <td className="px-4 py-3 text-[13px] text-white/90">{s.title ?? "Untitled"}{s.venue && <span className="text-ink-400"> · {s.venue}</span>}</td>
                    <td className="px-4 py-3 text-[12.5px] text-ink-200">{s.lecturer}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-ink-300">{when(s.startsAt)}</td>
                    <td className="px-4 py-3 text-right font-mono text-[13px] text-ink-200">{s.checkIns}</td>
                    <td className="px-4 py-3">
                      {s.isActive ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-pass/20 px-2 py-0.5 text-[11px] font-semibold text-[#8fce9a]"><span className="size-1.5 rounded-full bg-pass" /> Live</span>
                      ) : (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-ink-300">Ended</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {s.isActive ? (
                        <button onClick={() => handleClose(s)} disabled={busy === s.id} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[12px] font-medium text-[#f0a58f] hover:bg-fail/15 disabled:opacity-50">
                          {busy === s.id ? <Loader2 className="size-3.5 animate-spin" /> : <Square className="size-3.5" />} Close
                        </button>
                      ) : (
                        <span className="text-[12px] text-ink-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-ink-300">No sessions yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
