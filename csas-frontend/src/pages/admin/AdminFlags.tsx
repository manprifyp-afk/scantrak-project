import { useState } from "react";
import { Loader2, AlertCircle, ShieldAlert, MapPin, Smartphone, Clock, Download } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { getScanAttempts, type ScanAttempt } from "../../lib/admin";
import { downloadCsv } from "../../lib/csv";

const panel = "rounded-2xl border border-white/5 bg-night text-white";

// Human labels for the machine reason codes the scan validator emits.
const REASONS: Record<string, string> = {
  OUTSIDE_FENCE: "Outside class location",
  BAD_CODE: "Wrong / expired code",
  EXPIRED_CODE: "Expired code",
  DEVICE_MISMATCH: "Different device",
  NOT_ENROLLED: "Not enrolled",
  SESSION_CLOSED: "Session already closed",
  DUPLICATE: "Already checked in",
};
function reasonLabel(r: string | null) {
  if (!r) return "Rejected";
  return REASONS[r] ?? r.replace(/_/g, " ").toLowerCase();
}
function when(iso: string) {
  return new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function AdminFlags() {
  const [outcome, setOutcome] = useState<"REJECTED" | "ALL">("REJECTED");
  const { data, loading, error, reload } = useAsync(() => getScanAttempts(outcome), [outcome]);
  const rows: ScanAttempt[] = data ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-ink-500">Security</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink-900">Flagged scans</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              downloadCsv(
                "flagged-scans.csv",
                ["Student", "Student ID", "Course", "Session", "Outcome", "Reason", "Distance (m)", "When"],
                rows.map((a) => [a.studentName, a.studentId ?? "", a.courseCode, a.sessionTitle ?? "", a.outcome, reasonLabel(a.reason), a.distanceMeters != null ? Math.round(a.distanceMeters) : "", when(a.createdAt)])
              )
            }
            disabled={rows.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-surface px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100 disabled:opacity-40"
          >
            <Download className="size-4" /> Export
          </button>
          <div className="inline-flex rounded-lg border border-ink-200 bg-surface p-0.5">
            {(["REJECTED", "ALL"] as const).map((o) => (
              <button
                key={o}
                onClick={() => setOutcome(o)}
                className={
                  "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors " +
                  (outcome === o ? "bg-brand-600 text-white" : "text-ink-600 hover:text-ink-900")
                }
              >
                {o === "REJECTED" ? "Rejected" : "All"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="mb-4 text-sm text-ink-500">
        Every rejected check-in — wrong location, wrong device, expired code — is logged here. These are the anti-fraud
        gates doing their job.
      </p>

      {loading && (
        <div className="flex items-center gap-2 text-ink-500">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      )}
      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg bg-fail-soft px-4 py-3 text-sm text-fail">
          <span className="flex items-center gap-2"><AlertCircle className="size-4" /> {error}</span>
          <button onClick={reload} className="font-medium underline">Retry</button>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className={panel + " p-10 text-center"}>
          <ShieldAlert className="mx-auto mb-2 size-7 text-ink-400" />
          <p className="text-ink-200">No flagged attempts. Nothing suspicious yet.</p>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <section className={panel + " overflow-hidden"}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 text-left text-[11.5px] uppercase tracking-wide text-ink-400">
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Class</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                  <th className="px-4 py-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3">
                      <p className="text-[13px] font-medium text-white">{a.studentName}</p>
                      {a.studentId && <p className="font-mono text-[11px] text-ink-400">{a.studentId}</p>}
                    </td>
                    <td className="px-4 py-3 text-[12.5px]">
                      <span className="font-mono text-brand-300">{a.courseCode}</span>
                      {a.sessionTitle && <span className="text-ink-300"> · {a.sessionTitle}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "rounded-full px-2.5 py-0.5 text-[11px] font-semibold " +
                          (a.outcome === "ACCEPTED" ? "bg-pass/20 text-[#8fce9a]" : "bg-fail/20 text-[#f0a58f]")
                        }
                      >
                        {a.outcome === "ACCEPTED" ? "Accepted" : reasonLabel(a.reason)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-ink-300">
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {a.distanceMeters != null && (
                          <span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {Math.round(a.distanceMeters)} m</span>
                        )}
                        {a.deviceId && (
                          <span className="inline-flex items-center gap-1"><Smartphone className="size-3" /> {a.deviceId.slice(0, 8)}…</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-ink-400">
                      <span className="inline-flex items-center gap-1"><Clock className="size-3" /> {when(a.createdAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
