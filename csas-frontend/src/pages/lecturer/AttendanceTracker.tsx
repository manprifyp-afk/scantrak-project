import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  UserCheck,
  ShieldAlert,
} from "lucide-react";
import { getApiErrorMessage } from "../../lib/api";
import {
  getAttendance,
  getRejectedAttempts,
  type AttendanceRecord,
  type ScanAttempt,
} from "../../lib/attendance";

// Human labels for the machine reason codes the backend returns.
const REASON_LABEL: Record<string, string> = {
  OUTSIDE_FENCE: "Outside zone",
  DEVICE_MISMATCH: "Wrong device",
  EXPIRED_OR_INVALID_CODE: "Bad / expired code",
};

function time(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function AttendanceTracker() {
  const { sessionId } = useParams();
  const [records, setRecords] = useState<AttendanceRecord[] | null>(null);
  const [flags, setFlags] = useState<ScanAttempt[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Live poll of both feeds every 4s, silently (no spinner flicker after load).
  useEffect(() => {
    if (!sessionId) return;
    let active = true;

    async function tick() {
      try {
        const [r, f] = await Promise.all([
          getAttendance(sessionId!),
          getRejectedAttempts(sessionId!),
        ]);
        if (!active) return;
        setRecords(r);
        setFlags(f);
        setError(null);
      } catch (e) {
        if (active) setError(getApiErrorMessage(e));
      }
    }

    tick();
    const poll = setInterval(tick, 4000);
    return () => {
      active = false;
      clearInterval(poll);
    };
  }, [sessionId]);

  const loading = records === null && !error;

  return (
    <div className="space-y-6">
      <Link
        to="/lecturer"
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800"
      >
        <ArrowLeft className="size-4" />
        Back to courses
      </Link>

      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold text-ink-900">Live attendance</h1>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-pass-soft px-2.5 py-1 text-xs font-medium text-pass">
          <span className="size-1.5 rounded-full bg-pass" />
          Live
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg bg-fail-soft px-4 py-3 text-sm text-fail"
        >
          <AlertCircle className="size-4" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-ink-500">
          <Loader2 className="size-4 animate-spin" />
          Loading…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:max-w-md">
            <div className="rounded-xl border border-ink-200 bg-surface p-4">
              <p className="text-sm text-ink-500">Checked in</p>
              <p className="mt-1 text-3xl font-semibold text-ink-900">
                {records?.length ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-ink-200 bg-surface p-4">
              <p className="text-sm text-ink-500">Flagged</p>
              <p className="mt-1 text-3xl font-semibold text-fail">{flags?.length ?? 0}</p>
            </div>
          </div>

          {/* Check-ins */}
          <section className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-700">
              <UserCheck className="size-4 text-pass" />
              Check-ins
            </h2>
            {records && records.length > 0 ? (
              <ul className="divide-y divide-ink-100 rounded-xl border border-ink-200 bg-surface">
                {records.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="font-medium text-ink-900">{r.student.fullName}</p>
                      <p className="font-mono text-xs text-ink-400">
                        {r.student.idNumber ?? "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={
                          "rounded-full px-2.5 py-0.5 text-xs font-medium " +
                          (r.status === "LATE"
                            ? "bg-warn-soft text-warn"
                            : "bg-pass-soft text-pass")
                        }
                      >
                        {r.status === "LATE" ? "Late" : "Present"}
                      </span>
                      <span className="w-12 text-right text-xs text-ink-400">
                        {time(r.scannedAt)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-ink-200 px-4 py-6 text-center text-sm text-ink-400">
                No check-ins yet.
              </p>
            )}
          </section>

          {/* Fraud feed */}
          <section className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-700">
              <ShieldAlert className="size-4 text-fail" />
              Flagged attempts
            </h2>
            {flags && flags.length > 0 ? (
              <ul className="divide-y divide-ink-100 rounded-xl border border-ink-200 bg-surface">
                {flags.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="font-medium text-ink-900">{f.student.fullName}</p>
                      <p className="font-mono text-xs text-ink-400">
                        {f.student.idNumber ?? "—"}
                        {f.distanceMeters != null && ` · ${Math.round(f.distanceMeters)} m away`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-fail-soft px-2.5 py-0.5 text-xs font-medium text-fail">
                        {f.reason ? (REASON_LABEL[f.reason] ?? f.reason) : "Rejected"}
                      </span>
                      <span className="w-12 text-right text-xs text-ink-400">
                        {time(f.createdAt)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-ink-200 px-4 py-6 text-center text-sm text-ink-400">
                No flagged attempts — all clear.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
