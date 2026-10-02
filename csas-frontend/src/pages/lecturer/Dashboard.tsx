import { Link, useNavigate } from "react-router-dom";
import {
  Loader2,
  AlertCircle,
  Radio,
  Layers,
  UserCheck,
  Users,
  ShieldAlert,
  LogOut,
  QrCode,
  ChevronRight,
  BookOpen,
  Plus,
} from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { listCourses, type Course } from "../../lib/courses";
import { getOverview, type Overview } from "../../lib/reports";
import { getAllSessions, type LecturerSession } from "../../lib/sessions";
import { useAuth } from "../../store/auth";

interface DashboardData {
  courses: Course[];
  overview: Overview;
  sessions: LecturerSession[];
}

async function loadDashboard(): Promise<DashboardData> {
  const [courses, overview, sessions] = await Promise.all([
    listCourses(),
    getOverview(),
    getAllSessions(),
  ]);
  return { courses, overview, sessions };
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
const today = new Date().toLocaleDateString(undefined, {
  weekday: "long",
  day: "numeric",
  month: "long",
});
function dateOf(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
function rateColor(rate: number) {
  if (rate >= 75) return "text-pass";
  if (rate >= 50) return "text-warn";
  return "text-fail";
}

/* ---------- Semicircle attendance gauge ---------- */
function Gauge({ pct }: { pct: number }) {
  const r = 88;
  const len = Math.PI * r; // semicircle arc length
  const d = `M 22 110 A ${r} ${r} 0 0 1 198 110`;
  return (
    <div className="relative">
      <svg viewBox="0 0 220 124" className="w-full">
        <path d={d} fill="none" stroke="rgba(255,255,255,.10)" strokeWidth="18" strokeLinecap="round" />
        <path
          d={d}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="18"
          strokeLinecap="round"
          strokeDasharray={len}
          strokeDashoffset={len * (1 - Math.min(100, Math.max(0, pct)) / 100)}
        />
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#db9d75" />
            <stop offset="100%" stopColor="#cd7f55" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-x-0 bottom-1 text-center">
        <span className="font-display text-4xl font-bold text-white">{pct}</span>
        <span className="font-display text-xl font-semibold text-brand-300">%</span>
      </div>
    </div>
  );
}

/* ---------- Area chart for check-ins over time ---------- */
function CheckInChart({ points }: { points: { label: string; value: number }[] }) {
  const W = 620;
  const H = 240;
  const pad = 34;
  const max = Math.max(1, ...points.map((p) => p.value));
  const n = points.length;
  const xStep = n > 1 ? (W - pad * 2) / (n - 1) : 0;
  const xy = points.map((p, i) => {
    const x = pad + i * xStep;
    const y = H - pad - (p.value / max) * (H - pad * 2);
    return [x, y] as const;
  });
  const line = xy.map(([x, y], i) => (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1)).join(" ");
  const area = `${line} L ${(pad + (n - 1) * xStep).toFixed(1)} ${H - pad} L ${pad} ${H - pad} Z`;
  const gridYs = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#cd7f55" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#cd7f55" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {gridYs.map((g, i) => {
        const y = pad + g * (H - pad * 2);
        return (
          <g key={i}>
            <line x1={pad} y1={y} x2={W - pad} y2={y} stroke="rgba(255,255,255,.06)" strokeWidth="1" />
            <text x={pad - 8} y={y + 4} textAnchor="end" fontSize="11" fill="rgba(255,255,255,.35)">
              {Math.round(max * (1 - g))}
            </text>
          </g>
        );
      })}
      <path d={area} fill="url(#areaGrad)" />
      <path d={line} fill="none" stroke="#db9d75" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {xy.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.5" fill="#2a231b" stroke="#db9d75" strokeWidth="2" />
      ))}
      {points.map((p, i) => (
        <text
          key={i}
          x={pad + i * xStep}
          y={H - 10}
          textAnchor="middle"
          fontSize="11"
          fill="rgba(255,255,255,.45)"
        >
          {p.label}
        </text>
      ))}
    </svg>
  );
}

function DarkKpi({
  icon: Icon,
  label,
  value,
  suffix,
  sub,
  danger,
}: {
  icon: typeof Layers;
  label: string;
  value: number;
  suffix?: string;
  sub: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-night p-5">
      <span
        className={
          "grid size-10 place-items-center rounded-xl " +
          (danger ? "bg-fail/20 text-[#f0a58f]" : "bg-brand-500/15 text-brand-300")
        }
      >
        <Icon className="size-5" />
      </span>
      <p className="mt-4 font-display text-3xl font-bold leading-none text-white">
        {value}
        {suffix && <span className="text-lg font-semibold text-ink-300">{suffix}</span>}
      </p>
      <p className="mt-2 text-sm font-medium text-white/90">{label}</p>
      <p className="text-xs text-ink-300">{sub}</p>
    </div>
  );
}

const panel = "rounded-3xl border border-white/5 bg-night p-6 text-white";

export function LecturerDashboard() {
  const { data, loading, error, reload } = useAsync(loadDashboard);
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const live = data?.sessions.filter((s) => s.isActive) ?? [];
  const checkedIn = (sessionId: string) => {
    const p = data?.overview.perSession.find((x) => x.sessionId === sessionId);
    return p ? p.present + p.late : 0;
  };
  const perSession = data?.overview.perSession ?? [];
  const recent = perSession
    .slice()
    .sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt))
    .slice(0, 6);
  // chronological (oldest→newest) for the trend chart
  const chartPoints = perSession
    .slice()
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
    .slice(-9)
    .map((s) => ({ label: dateOf(s.startsAt), value: s.present + s.late }));

  const o = data?.overview;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11.5px] uppercase tracking-[0.1em] text-ink-500">{today}</p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-ink-900">
            {greeting()}, {user?.fullName}
          </h1>
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-surface px-3.5 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-100"
        >
          <LogOut className="size-4" /> Sign out
        </button>
      </header>

      {loading && (
        <div className="flex items-center gap-2 text-ink-500">
          <Loader2 className="size-4 animate-spin" /> Loading your dashboard…
        </div>
      )}
      {error && (
        <div role="alert" className="flex items-center justify-between rounded-lg bg-fail-soft px-4 py-3 text-sm text-fail">
          <span className="flex items-center gap-2">
            <AlertCircle className="size-4" /> {error}
          </span>
          <button onClick={reload} className="font-medium underline">Retry</button>
        </div>
      )}

      {!loading && !error && o && (
        <>
          {/* Row 1: attendance gauge + check-ins trend */}
          <section className="grid gap-5 lg:grid-cols-3">
            <div className={panel + " flex flex-col"}>
              <div>
                <h2 className="font-display text-lg font-semibold">Attendance</h2>
                <p className="text-sm text-ink-300">Average across all sessions</p>
              </div>
              <div className="mt-4 flex flex-1 items-center">
                <div className="w-full">
                  <Gauge pct={o.avgAttendanceRate} />
                </div>
              </div>
              <p className="mt-2 text-center text-xs text-ink-300">
                {o.sessionsHeld} session{o.sessionsHeld === 1 ? "" : "s"} · {o.uniqueStudents} students
              </p>
            </div>

            <div className={panel + " lg:col-span-2"}>
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-semibold">Check-ins over time</h2>
                  <p className="text-sm text-ink-300">Students checked in per session</p>
                </div>
                <span className="rounded-full bg-brand-500/15 px-3 py-1 text-xs font-medium text-brand-300">
                  {o.totalCheckIns} total
                </span>
              </div>
              {chartPoints.length >= 2 ? (
                <CheckInChart points={chartPoints} />
              ) : (
                <div className="grid h-52 place-items-center text-sm text-ink-300">
                  Run a couple of sessions to see the trend.
                </div>
              )}
            </div>
          </section>

          {/* Row 2: KPI cards */}
          <section className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            <DarkKpi icon={UserCheck} label="Total check-ins" value={o.totalCheckIns} sub={`${o.statusBreakdown.late} late`} />
            <DarkKpi icon={Layers} label="Sessions held" value={o.sessionsHeld} sub={`${live.length} live now`} />
            <DarkKpi icon={Users} label="Unique students" value={o.uniqueStudents} sub="seen across courses" />
            <DarkKpi icon={ShieldAlert} label="Flagged attempts" value={o.flaggedAttempts} sub={o.flaggedAttempts === 0 ? "all clear" : "need review"} danger />
          </section>

          {/* Row 3: recent sessions table + live now */}
          <section className="grid gap-5 lg:grid-cols-3">
            <div className={panel + " lg:col-span-2"}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">Recent sessions</h2>
                <Link to="/lecturer/sessions" className="inline-flex items-center gap-1 text-xs font-medium text-brand-300 hover:underline">
                  All sessions <ChevronRight className="size-3.5" />
                </Link>
              </div>
              {recent.length === 0 ? (
                <p className="py-10 text-center text-sm text-ink-300">No sessions yet.</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-ink-400">
                      <th className="pb-2 font-medium">#</th>
                      <th className="pb-2 font-medium">Session</th>
                      <th className="pb-2 font-medium">Attendance</th>
                      <th className="pb-2 text-right font-medium">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((s, i) => (
                      <tr key={s.sessionId} className="border-t border-white/5">
                        <td className="py-3 font-mono text-sm text-ink-300">{String(i + 1).padStart(2, "0")}</td>
                        <td className="py-3">
                          <span className="font-mono text-xs font-medium text-brand-300">{s.courseCode}</span>
                          <span className="ml-2 text-sm text-white/90">{s.title ?? "Session"}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="block h-2 w-full max-w-[160px] overflow-hidden rounded-full bg-white/10">
                            <span className="block h-full rounded-full bg-brand-400" style={{ width: `${s.attendanceRate}%` }} />
                          </span>
                        </td>
                        <td className="py-3 text-right font-display text-sm font-semibold text-white">
                          {s.attendanceRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className={panel}>
              <div className="mb-3 flex items-center gap-2">
                <span className="size-2 animate-pulse rounded-full bg-pass" />
                <h2 className="font-display text-lg font-semibold">Live now</h2>
              </div>
              {live.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-5 text-center text-sm text-ink-300">
                  No live sessions.
                  {data.courses[0] && (
                    <button
                      onClick={() => navigate(`/lecturer/courses/${data.courses[0].id}/session`)}
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
                    >
                      <Radio className="size-4" /> Start a session
                    </button>
                  )}
                </div>
              ) : (
                <ul className="space-y-3">
                  {live.map((s) => (
                    <li key={s.id} className="rounded-2xl bg-white/5 p-4">
                      <p className="font-mono text-xs font-medium text-brand-300">{s.courseCode}</p>
                      <p className="text-sm font-medium text-white">{s.title ?? "Session"}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-ink-300">{checkedIn(s.id)} checked in</span>
                        <button
                          onClick={() => navigate(`/lecturer/courses/${s.courseId}/session`)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
                        >
                          <QrCode className="size-3.5" /> Open
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <Link
                to="/lecturer/courses"
                className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-white/10 py-2.5 text-sm font-medium text-ink-200 hover:bg-white/5"
              >
                <BookOpen className="size-4" /> Manage courses
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
