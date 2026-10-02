import { Link, useParams } from "react-router-dom";
import { Loader2, AlertCircle, ChevronLeft, TriangleAlert, CheckCircle2 } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { getAttendanceSummary, type AttendanceStatus } from "../../lib/attendance";

const PASS_MARK = 75;
const panel = "rounded-3xl border border-white/5 bg-night p-5 text-white";

function statusStyle(s: AttendanceStatus): { label: string; cls: string } {
  switch (s) {
    case "PRESENT":
      return { label: "Present", cls: "bg-pass/20 text-[#8fce9a]" };
    case "LATE":
      return { label: "Late", cls: "bg-warn/20 text-[#e0b878]" };
    case "ABSENT":
      return { label: "Missed", cls: "bg-fail/20 text-[#f0a58f]" };
    default:
      return { label: "Rejected", cls: "bg-white/10 text-ink-300" };
  }
}
function whenLabel(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function Gauge({ pct }: { pct: number }) {
  const r = 82;
  const len = Math.PI * r;
  const d = `M 20 100 A ${r} ${r} 0 0 1 184 100`;
  return (
    <div className="relative mx-auto w-[204px]">
      <svg viewBox="0 0 204 116" className="w-full">
        <path d={d} fill="none" stroke="rgba(255,255,255,.10)" strokeWidth="16" strokeLinecap="round" />
        <path d={d} fill="none" stroke="url(#cdG)" strokeWidth="16" strokeLinecap="round"
          strokeDasharray={len} strokeDashoffset={len * (1 - Math.min(100, Math.max(0, pct)) / 100)} />
        <defs>
          <linearGradient id="cdG" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#db9d75" />
            <stop offset="100%" stopColor="#cd7f55" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <span className="font-display text-3xl font-bold text-white">{pct}</span>
        <span className="font-display text-lg font-semibold text-brand-300">%</span>
      </div>
    </div>
  );
}

export function StudentCourseDetail() {
  const { code = "" } = useParams();
  const { data, loading, error, reload } = useAsync(getAttendanceSummary);

  const course = data?.courses.find((c) => c.code.toLowerCase() === code.toLowerCase());
  const sessions = (data?.timeline ?? []).filter((t) => t.courseCode.toLowerCase() === code.toLowerCase());
  const risk = course ? course.rate < PASS_MARK : false;

  return (
    <div className="mx-auto max-w-sm space-y-4 pt-2">
      <Link to="/student/attendance" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
        <ChevronLeft className="size-4" /> Attendance
      </Link>

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

      {!loading && !error && !course && (
        <div className="rounded-2xl border border-dashed border-ink-200 p-8 text-center text-ink-500">
          Course not found.
        </div>
      )}

      {!loading && !error && course && (
        <>
          <div>
            <span className="font-mono text-sm font-medium text-brand-700">{course.code}</span>
            <h1 className="text-xl font-semibold text-ink-900">{course.title}</h1>
          </div>

          <section className={panel}>
            <Gauge pct={course.rate} />
            <p className="mt-1 text-center text-xs text-ink-300">
              {course.attended} of {course.totalSessions} attended
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/5 pt-4 text-center">
              <div>
                <p className="font-display text-lg font-semibold text-white">{course.present}</p>
                <p className="text-[11px] text-ink-400">Present</p>
              </div>
              <div>
                <p className="font-display text-lg font-semibold text-[#e0b878]">{course.late}</p>
                <p className="text-[11px] text-ink-400">Late</p>
              </div>
              <div>
                <p className="font-display text-lg font-semibold text-[#f0a58f]">{course.absent}</p>
                <p className="text-[11px] text-ink-400">Missed</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center">
              {risk ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-fail/15 px-3 py-1 text-sm font-semibold text-[#f0a58f]">
                  <TriangleAlert className="size-4" /> At risk — below {PASS_MARK}%
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-pass/15 px-3 py-1 text-sm font-semibold text-[#8fce9a]">
                  <CheckCircle2 className="size-4" /> On track
                </span>
              )}
            </div>
          </section>

          <section className={panel}>
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-300">Every session</h2>
            <ul className="divide-y divide-white/5">
              {sessions.map((t) => {
                const st = statusStyle(t.status);
                return (
                  <li key={t.sessionId} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white/90">{t.title ?? "Session"}</p>
                      <p className="text-xs text-ink-400">{whenLabel(t.startsAt)}</p>
                    </div>
                    <span className={"shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium " + st.cls}>{st.label}</span>
                  </li>
                );
              })}
              {sessions.length === 0 && (
                <li className="py-6 text-center text-sm text-ink-300">No sessions held yet.</li>
              )}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
