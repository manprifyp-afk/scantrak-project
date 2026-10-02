import { Link } from "react-router-dom";
import { Loader2, AlertCircle, ClipboardList, TriangleAlert, CheckCircle2 } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { getAttendanceSummary, type AttendanceStatus } from "../../lib/attendance";

const PASS_MARK = 75;

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
function barColorFor(s: AttendanceStatus) {
  if (s === "PRESENT") return "bg-brand-400";
  if (s === "LATE") return "bg-warn";
  return "bg-white/10";
}
function whenLabel(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Gauge({ pct }: { pct: number }) {
  const r = 82;
  const len = Math.PI * r;
  const d = `M 20 100 A ${r} ${r} 0 0 1 184 100`;
  return (
    <div className="relative mx-auto w-[204px]">
      <svg viewBox="0 0 204 116" className="w-full">
        <path d={d} fill="none" stroke="rgba(255,255,255,.10)" strokeWidth="16" strokeLinecap="round" />
        <path d={d} fill="none" stroke="url(#aGauge)" strokeWidth="16" strokeLinecap="round"
          strokeDasharray={len} strokeDashoffset={len * (1 - Math.min(100, Math.max(0, pct)) / 100)} />
        <defs>
          <linearGradient id="aGauge" x1="0" y1="0" x2="1" y2="0">
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

const panel = "rounded-3xl border border-white/5 bg-night p-5 text-white";

export function StudentAttendance() {
  const { data, loading, error, reload } = useAsync(getAttendanceSummary);

  const overall = data?.overall.rate ?? 0;
  const attended = data?.overall.attended ?? 0;
  const held = data?.overall.totalSessions ?? 0;
  const courses = (data?.courses ?? []).filter((c) => c.totalSessions > 0);
  const timeline = data?.timeline ?? [];
  // last ~20 sessions oldest→newest for the trend strip
  const strip = timeline.slice(0, 20).slice().reverse();
  const hasHistory = timeline.length > 0;

  return (
    <div className="mx-auto max-w-sm space-y-4 pt-2">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">My attendance</h1>
        <p className="mt-0.5 text-ink-500">Your record across all classes.</p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-ink-500">
          <Loader2 className="size-4 animate-spin" /> Loading your records…
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg bg-fail-soft px-4 py-3 text-sm text-fail">
          <span className="flex items-center gap-2">
            <AlertCircle className="size-4" /> {error}
          </span>
          <button onClick={reload} className="font-medium underline">Retry</button>
        </div>
      )}

      {!loading && !error && data && !hasHistory && (
        <div className="rounded-2xl border border-dashed border-ink-200 p-8 text-center text-ink-500">
          <ClipboardList className="mx-auto mb-2 size-6 text-ink-400" />
          No classes yet. Once your lecturer runs a session it'll show up here.
        </div>
      )}

      {!loading && !error && data && hasHistory && (
        <>
          {/* Overall gauge + trend strip */}
          <section className={panel}>
            <h2 className="text-xs font-medium uppercase tracking-wide text-ink-300">Overall attendance</h2>
            <div className="mt-2">
              <Gauge pct={overall} />
            </div>
            <p className="mt-1 text-center text-xs text-ink-300">{attended} of {held} classes attended</p>

            <div className="mt-4 border-t border-white/5 pt-4">
              <p className="mb-2 text-[11px] uppercase tracking-wide text-ink-400">Recent trend</p>
              <div className="flex items-end gap-1">
                {strip.map((t) => (
                  <span
                    key={t.sessionId}
                    title={`${t.courseCode} · ${statusStyle(t.status).label}`}
                    className={"h-8 flex-1 rounded-sm " + barColorFor(t.status)}
                  />
                ))}
              </div>
              <div className="mt-2 flex gap-4 text-[10px] text-ink-400">
                <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-brand-400" /> Present</span>
                <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-warn" /> Late</span>
                <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-white/10" /> Missed</span>
              </div>
            </div>
          </section>

          {/* Per-course with eligibility */}
          {courses.length > 0 && (
            <section className={panel}>
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-300">By course</h2>
              <div className="space-y-4">
                {courses.map((c) => {
                  const risk = c.rate < PASS_MARK;
                  const barColor = c.rate >= PASS_MARK ? "bg-brand-400" : c.rate >= 50 ? "bg-warn" : "bg-fail";
                  return (
                    <Link to={`/student/courses/${c.code}`} key={c.courseId} className="block">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-mono text-xs font-medium text-brand-300">{c.code}</span>
                          <span className="ml-2 text-sm text-white/90">{c.title}</span>
                        </div>
                        <span className="font-display text-sm font-semibold text-white">{c.rate}%</span>
                      </div>
                      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/10">
                        <span className={"block h-full rounded-full " + barColor} style={{ width: `${c.rate}%` }} />
                      </span>
                      <div className="mt-1.5 flex items-center justify-between text-[11px]">
                        <span className="text-ink-400">
                          {c.attended}/{c.totalSessions} attended · {c.absent} missed
                        </span>
                        {risk ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-[#f0a58f]">
                            <TriangleAlert className="size-3" /> At risk
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-[#8fce9a]">
                            <CheckCircle2 className="size-3" /> On track
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
              <p className="mt-4 border-t border-white/5 pt-3 text-[11px] text-ink-400">
                {PASS_MARK}% attendance is typically required to be exam-eligible.
              </p>
            </section>
          )}

          {/* Full history (incl. missed) */}
          <section className={panel}>
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-300">Class history</h2>
            <ul className="divide-y divide-white/5">
              {timeline.map((t) => {
                const st = statusStyle(t.status);
                return (
                  <li key={t.sessionId} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white/90">
                        <span className="font-mono text-brand-300">{t.courseCode}</span>{" "}
                        {t.title ?? t.courseTitle}
                      </p>
                      <p className="text-xs text-ink-400">{whenLabel(t.startsAt)}</p>
                    </div>
                    <span className={"shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium " + st.cls}>
                      {st.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
