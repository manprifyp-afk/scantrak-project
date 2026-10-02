import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  AlertCircle,
  Download,
  Layers,
  UserCheck,
  Activity,
  ShieldAlert,
  Users,
  Clock,
} from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { listCourses, type Course } from "../../lib/courses";
import {
  getOverview,
  getStudentReport,
  type Overview,
  type StudentsReport,
} from "../../lib/reports";
import { getApiErrorMessage } from "../../lib/api";

type Period = "day" | "week" | "month" | "semester";
const PERIODS: { key: Period; label: string; days: number | null }[] = [
  { key: "day", label: "Day", days: 1 },
  { key: "week", label: "Week", days: 7 },
  { key: "month", label: "Month", days: 30 },
  { key: "semester", label: "Semester", days: null },
];
const AT_RISK = 75; // attendance % below this is flagged at-risk

function rangeFor(period: Period): { from?: string; to?: string } {
  const p = PERIODS.find((x) => x.key === period)!;
  if (p.days == null) return {};
  return {
    from: new Date(Date.now() - p.days * 86_400_000).toISOString(),
    to: new Date().toISOString(),
  };
}
function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
function semesterLabel(s?: string | null) {
  return s === "FIRST" ? "First" : s === "SECOND" ? "Second" : null;
}
function streamLabel(s?: string | null) {
  if (!s) return null;
  return s.charAt(0) + s.slice(1).toLowerCase();
}

function toCsv(rows: (string | number)[][]) {
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}
function saveCsv(csv: string, name: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name.replace(/\s+/g, "-").toLowerCase() + ".csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadSummary(o: Overview, courseLabel: string, periodLabel: string) {
  saveCsv(
    toCsv([
      ["ScanTrak Attendance Report"],
      ["Course", courseLabel],
      ["Period", periodLabel],
      [],
      ["Sessions held", o.sessionsHeld],
      ["Total check-ins", o.totalCheckIns],
      ["Unique students", o.uniqueStudents],
      ["Average attendance rate", `${o.avgAttendanceRate}%`],
      ["Present", o.statusBreakdown.present],
      ["Late", o.statusBreakdown.late],
      ["Absent", o.statusBreakdown.absent],
      ["Flagged attempts", o.flaggedAttempts],
      [],
      ["Date", "Session", "Present", "Late", "Absent", "Rate"],
      ...o.perSession.map((s) => [
        new Date(s.startsAt).toLocaleDateString(),
        s.title ?? s.courseCode,
        s.present,
        s.late,
        s.absent,
        `${s.attendanceRate}%`,
      ]),
    ]),
    `attendance-${courseLabel}-${periodLabel}`
  );
}

function downloadStudents(r: StudentsReport, courseLabel: string) {
  saveCsv(
    toCsv([
      ["ScanTrak — Per-student attendance"],
      ["Course", courseLabel],
      ["Total sessions", r.totalSessions],
      [],
      ["Student", "ID", "Present", "Late", "Attended", "Total", "Rate", "Status"],
      ...r.students.map((s) => [
        s.fullName,
        s.idNumber ?? "",
        s.present,
        s.late,
        s.attended,
        s.totalSessions,
        `${s.attendanceRate}%`,
        s.attendanceRate >= AT_RISK ? "On track" : "At risk",
      ]),
    ]),
    `students-${courseLabel}`
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  suffix,
  tone,
}: {
  icon: typeof Layers;
  label: string;
  value: number;
  suffix?: string;
  tone?: "warn" | "bad";
}) {
  const numTone = tone === "bad" ? "text-[#f0a58f]" : tone === "warn" ? "text-[#e0b878]" : "text-white";
  return (
    <div className="rounded-2xl border border-white/5 bg-night px-4 py-3.5">
      <p className="flex items-center gap-1.5 text-[12px] font-medium text-ink-300">
        <Icon className="size-3.5 text-brand-300" />
        {label}
      </p>
      <p className={"mt-1.5 font-display text-[26px] font-semibold tracking-tight " + numTone}>
        {value}
        {suffix && <span className="text-sm font-medium text-ink-400">{suffix}</span>}
      </p>
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="size-3 rounded-sm" style={{ background: color }} />
      <span className="text-ink-200">{label}</span>
      <span className="ml-auto pl-6 font-mono font-semibold text-white">{value}</span>
    </div>
  );
}

function Breakdown({ present, late, absent }: { present: number; late: number; absent: number }) {
  const total = present + late + absent || 1;
  const p = (present / total) * 100;
  const l = (late / total) * 100;
  const a = (absent / total) * 100;
  const seg = (val: number, color: string, before: number) => (
    <circle cx="21" cy="21" r="15.9155" fill="none" stroke={color} strokeWidth="6"
      strokeDasharray={`${val} ${100 - val}`} strokeDashoffset={25 - before} />
  );
  return (
    <div className="flex items-center gap-5">
      <svg width="118" height="118" viewBox="0 0 42 42" className="shrink-0">
        <circle cx="21" cy="21" r="15.9155" fill="none" stroke="rgba(255,255,255,.10)" strokeWidth="6" />
        {seg(p, "#7fb98a", 0)}
        {seg(l, "#e0b878", p)}
        {seg(a, "#f0a58f", p + l)}
        <text x="21" y="20.5" textAnchor="middle" style={{ fontSize: "7px", fontWeight: 600, fill: "#fff" }}>
          {Math.round(p)}%
        </text>
        <text x="21" y="26" textAnchor="middle" style={{ fontSize: "3.2px", fill: "rgba(255,255,255,.5)" }}>on time</text>
      </svg>
      <div className="flex flex-col gap-2.5 text-sm">
        <Legend color="#7fb98a" label="Present" value={present} />
        <Legend color="#e0b878" label="Late" value={late} />
        <Legend color="#f0a58f" label="Absent" value={absent} />
      </div>
    </div>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-[12.5px] text-ink-300">
      {label} <b className="font-semibold text-white">{value}</b>
    </span>
  );
}

export function Reports() {
  const { data: courses } = useAsync(listCourses);
  const [courseId, setCourseId] = useState("");
  const [period, setPeriod] = useState<Period>("month");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [students, setStudents] = useState<StudentsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const { from, to } = rangeFor(period);
    const overviewP = getOverview({ ...(courseId ? { courseId } : {}), from, to });
    const studentsP = courseId ? getStudentReport(courseId, { from, to }) : Promise.resolve(null);
    Promise.all([overviewP, studentsP])
      .then(([o, s]) => {
        if (!active) return;
        setOverview(o);
        setStudents(s);
        setLoading(false);
      })
      .catch((e) => {
        if (!active) return;
        setError(getApiErrorMessage(e));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [courseId, period]);

  const selectedCourse: Course | undefined = courseId
    ? courses?.find((c) => c.id === courseId)
    : undefined;
  const courseLabel = selectedCourse?.code ?? "All courses";
  const periodLabel = PERIODS.find((p) => p.key === period)!.label;
  const maxAttend = useMemo(
    () => Math.max(1, ...(overview?.perSession.map((s) => s.present + s.late) ?? [1])),
    [overview]
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11.5px] uppercase tracking-[0.1em] text-ink-500">
            {courseLabel} · {periodLabel}
          </p>
          <h1 className="mt-1 text-[25px] font-semibold tracking-tight text-ink-900">Reports</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-lg bg-canvas p-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={
                  "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors " +
                  (period === p.key
                    ? "bg-surface text-ink-900 shadow-sm"
                    : "text-ink-500 hover:text-ink-800")
                }
              >
                {p.label}
              </button>
            ))}
          </div>

          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="rounded-lg border border-ink-200 bg-surface px-3 py-2 text-sm font-medium text-ink-800 outline-none focus:border-brand-500"
          >
            <option value="">All courses</option>
            {courses?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code}
              </option>
            ))}
          </select>

          <button
            onClick={() => overview && downloadSummary(overview, courseLabel, periodLabel)}
            disabled={!overview}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            <Download className="size-4" /> Download summary
          </button>
        </div>
      </div>

      {/* Course meta strip (only when a specific course is picked) */}
      {selectedCourse && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-2xl border border-white/5 bg-night px-4 py-3">
          <span className="font-mono text-[13px] font-medium text-brand-300">{selectedCourse.code}</span>
          <span className="font-display text-sm font-semibold text-white">{selectedCourse.title}</span>
          {selectedCourse.programme && <MetaChip label="Programme" value={selectedCourse.programme} />}
          {selectedCourse.level != null && <MetaChip label="Level" value={String(selectedCourse.level)} />}
          {semesterLabel(selectedCourse.semester) && (
            <MetaChip label="Semester" value={semesterLabel(selectedCourse.semester)!} />
          )}
          {streamLabel(selectedCourse.stream) && (
            <MetaChip label="Stream" value={streamLabel(selectedCourse.stream)!} />
          )}
          {selectedCourse.creditHours != null && (
            <MetaChip label="Credit hours" value={String(selectedCourse.creditHours)} />
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-ink-500">
          <Loader2 className="size-4 animate-spin" /> Loading report…
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-lg bg-fail-soft px-4 py-3 text-sm text-fail">
          <AlertCircle className="size-4" />
          {error}
        </div>
      )}

      {!loading && !error && overview && (
        <>
          <section className="grid grid-cols-2 gap-3.5 md:grid-cols-3 lg:grid-cols-6">
            <Metric icon={Layers} label="Sessions" value={overview.sessionsHeld} />
            <Metric icon={UserCheck} label="Check-ins" value={overview.totalCheckIns} />
            <Metric icon={Users} label="Students" value={overview.uniqueStudents} />
            <Metric icon={Activity} label="Attendance" value={overview.avgAttendanceRate} suffix="%" />
            <Metric icon={Clock} label="Late" value={overview.statusBreakdown.late} tone="warn" />
            <Metric icon={ShieldAlert} label="Flagged" value={overview.flaggedAttempts} tone="bad" />
          </section>

          {overview.sessionsHeld === 0 ? (
            <div className="rounded-xl border border-dashed border-ink-200 p-12 text-center text-ink-500">
              No sessions in this period. Try a wider range or another course.
            </div>
          ) : (
            <>
              <section className="grid gap-3.5 lg:grid-cols-[1.6fr_1fr]">
                <div className="rounded-2xl border border-white/5 bg-night p-5">
                  <h3 className="font-display text-[15px] font-semibold text-white">Attendance per session</h3>
                  <p className="mb-4 text-[12.5px] text-ink-300">Students checked in</p>
                  <div className="flex h-44 items-end gap-2.5">
                    {overview.perSession.map((s) => {
                      const v = s.present + s.late;
                      return (
                        <div key={s.sessionId} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                          <span className="font-mono text-[10.5px] font-semibold text-ink-200">{v}</span>
                          <div
                            className="w-full max-w-[34px] rounded-t-md bg-brand-400"
                            style={{ height: `${(v / maxAttend) * 100}%`, minHeight: v ? 4 : 0 }}
                          />
                          <span className="font-mono text-[10px] text-ink-400">{dayLabel(s.startsAt)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-night p-5">
                  <h3 className="font-display text-[15px] font-semibold text-white">Status breakdown</h3>
                  <p className="mb-4 text-[12.5px] text-ink-300">Across all sessions</p>
                  <Breakdown
                    present={overview.statusBreakdown.present}
                    late={overview.statusBreakdown.late}
                    absent={overview.statusBreakdown.absent}
                  />
                </div>
              </section>

              {/* Per-student breakdown — only when a course is selected */}
              {selectedCourse && students && (
                <section className="overflow-hidden rounded-2xl border border-white/5 bg-night text-white">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-5 py-3.5">
                    <div>
                      <h3 className="font-display text-[15px] font-semibold text-white">
                        Per-student attendance
                      </h3>
                      <p className="text-[12px] text-ink-300">
                        {students.students.length} students · flagged below {AT_RISK}%
                      </p>
                    </div>
                    <button
                      onClick={() => downloadStudents(students, courseLabel)}
                      disabled={students.students.length === 0}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[13px] font-medium text-ink-200 transition-colors hover:bg-white/10 disabled:opacity-50"
                    >
                      <Download className="size-4" /> Student list (CSV)
                    </button>
                  </div>

                  {students.students.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-ink-300">
                      No enrolled students with attendance yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/5 text-left text-[11.5px] uppercase tracking-wide text-ink-400">
                            <th className="px-5 py-2.5 font-medium">Student</th>
                            <th className="px-5 py-2.5 font-medium">ID</th>
                            <th className="px-5 py-2.5 text-right font-medium">Attended</th>
                            <th className="px-5 py-2.5 font-medium">Rate</th>
                            <th className="px-5 py-2.5 text-right font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.students.map((s) => {
                            const atRisk = s.attendanceRate < AT_RISK;
                            const barColor =
                              s.attendanceRate >= AT_RISK
                                ? "bg-[#7fb98a]"
                                : s.attendanceRate >= 50
                                  ? "bg-[#e0b878]"
                                  : "bg-[#f0a58f]";
                            const initials = s.fullName
                              .split(" ")
                              .map((w) => w[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase();
                            return (
                              <tr
                                key={s.studentId}
                                className={
                                  "border-b border-white/5 last:border-0 " +
                                  (atRisk ? "bg-fail/10" : "")
                                }
                              >
                                <td className="px-5 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-500/15 text-[11px] font-semibold text-brand-300">
                                      {initials}
                                    </span>
                                    <span className="text-[13px] font-medium text-white">{s.fullName}</span>
                                  </div>
                                </td>
                                <td className="px-5 py-3 font-mono text-[12px] text-ink-400">
                                  {s.idNumber ?? "—"}
                                </td>
                                <td className="px-5 py-3 text-right font-mono text-[13px] text-ink-200">
                                  {s.attended} / {s.totalSessions}
                                </td>
                                <td className="px-5 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <span className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
                                      <span
                                        className={"block h-full rounded-full " + barColor}
                                        style={{ width: `${s.attendanceRate}%` }}
                                      />
                                    </span>
                                    <span className="font-display text-[13px] font-semibold text-white">
                                      {s.attendanceRate}%
                                    </span>
                                  </div>
                                </td>
                                <td className="px-5 py-3 text-right">
                                  <span
                                    className={
                                      "rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold " +
                                      (atRisk ? "bg-fail/20 text-[#f0a58f]" : "bg-pass/20 text-[#8fce9a]")
                                    }
                                  >
                                    {atRisk ? "At risk" : "On track"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}

              <section className="overflow-hidden rounded-2xl border border-white/5 bg-night text-white">
                <div className="border-b border-white/5 px-5 py-3.5">
                  <h3 className="font-display text-[15px] font-semibold text-white">Sessions</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5 text-left text-[11.5px] uppercase tracking-wide text-ink-400">
                        <th className="px-5 py-2.5 font-medium">Date</th>
                        <th className="px-5 py-2.5 font-medium">Session</th>
                        <th className="px-5 py-2.5 text-right font-medium">Present</th>
                        <th className="px-5 py-2.5 text-right font-medium">Late</th>
                        <th className="px-5 py-2.5 text-right font-medium">Absent</th>
                        <th className="px-5 py-2.5 text-right font-medium">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.perSession.map((s) => {
                        const rateColor =
                          s.attendanceRate >= 85 ? "text-[#8fce9a]" : s.attendanceRate >= 70 ? "text-[#e0b878]" : "text-[#f0a58f]";
                        return (
                          <tr key={s.sessionId} className="border-b border-white/5 last:border-0">
                            <td className="px-5 py-3 font-mono text-[12px] text-ink-300">
                              {new Date(s.startsAt).toLocaleDateString()}
                            </td>
                            <td className="px-5 py-3 text-[13px] text-white/90">{s.title ?? s.courseCode}</td>
                            <td className="px-5 py-3 text-right font-mono text-[13px] text-ink-200">{s.present}</td>
                            <td className="px-5 py-3 text-right font-mono text-[13px] text-ink-200">{s.late}</td>
                            <td className="px-5 py-3 text-right font-mono text-[13px] text-ink-200">{s.absent}</td>
                            <td className={"px-5 py-3 text-right font-mono text-[13px] font-semibold " + rateColor}>
                              {s.attendanceRate}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
