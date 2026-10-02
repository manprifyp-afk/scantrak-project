import { Loader2, AlertCircle, GraduationCap, TriangleAlert, Radio, BookOpen, Download } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { getAnalytics } from "../../lib/admin";
import { downloadCsv } from "../../lib/csv";

const panel = "rounded-2xl border border-white/5 bg-night text-white";

function Gauge({ pct }: { pct: number }) {
  const r = 82;
  const len = Math.PI * r;
  const d = `M 20 100 A ${r} ${r} 0 0 1 184 100`;
  return (
    <div className="relative mx-auto w-[190px]">
      <svg viewBox="0 0 204 116" className="w-full">
        <path d={d} fill="none" stroke="rgba(255,255,255,.10)" strokeWidth="16" strokeLinecap="round" />
        <path d={d} fill="none" stroke="url(#ov)" strokeWidth="16" strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - Math.min(100, Math.max(0, pct)) / 100)} />
        <defs><linearGradient id="ov" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#db9d75" /><stop offset="100%" stopColor="#cd7f55" /></linearGradient></defs>
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <span className="font-display text-3xl font-bold text-white">{pct}</span>
        <span className="font-display text-lg font-semibold text-brand-300">%</span>
      </div>
    </div>
  );
}
function Stat({ icon: Icon, label, value, tone }: { icon: typeof Radio; label: string; value: number; tone?: string }) {
  return (
    <div className={panel + " p-4"}>
      <span className="grid size-9 place-items-center rounded-lg bg-brand-500/15 text-brand-300"><Icon className="size-4" /></span>
      <p className={"mt-3 font-display text-2xl font-bold " + (tone ?? "text-white")}>{value}</p>
      <p className="text-xs text-ink-300">{label}</p>
    </div>
  );
}

export function AdminOverview() {
  const { data, loading, error, reload } = useAsync(getAnalytics);

  function exportAtRisk() {
    if (!data) return;
    downloadCsv(
      "at-risk-students.csv",
      ["Student", "Student ID", "Course", "Attended", "Sessions", "Rate %"],
      data.atRisk.map((s) => [s.studentName, s.idNumber ?? "", s.courseCode, s.attended, s.held, s.rate])
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <p className="font-mono text-xs uppercase tracking-wide text-ink-500">System</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink-900">Overview</h1>
      </div>

      {loading && <div className="flex items-center gap-2 text-ink-500"><Loader2 className="size-4 animate-spin" /> Loading analytics…</div>}
      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg bg-fail-soft px-4 py-3 text-sm text-fail">
          <span className="flex items-center gap-2"><AlertCircle className="size-4" /> {error}</span>
          <button onClick={reload} className="font-medium underline">Retry</button>
        </div>
      )}

      {!loading && !error && data && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className={panel + " p-5 md:row-span-1"}>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-300">Institution attendance</p>
              <Gauge pct={data.overall.rate} />
              <p className="mt-1 text-center text-xs text-ink-400">across all courses</p>
            </div>
            <div className="grid grid-cols-2 gap-4 md:col-span-2">
              <Stat icon={GraduationCap} label="Students" value={data.overall.totalStudents} />
              <Stat icon={BookOpen} label="Courses" value={data.overall.totalCourses} />
              <Stat icon={Radio} label="Live sessions" value={data.overall.activeSessions} />
              <Stat icon={TriangleAlert} label="At-risk (below 75%)" value={data.overall.atRiskCount} tone="text-[#f0a58f]" />
            </div>
          </div>

          {/* Per-course attendance */}
          <section className={panel + " overflow-hidden"}>
            <div className="border-b border-white/5 px-5 py-3.5"><h2 className="font-display text-[15px] font-semibold text-white">Attendance by course</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-white/5 text-left text-[11px] uppercase tracking-wide text-ink-400">
                  <th className="px-5 py-2.5 font-medium">Course</th><th className="px-5 py-2.5 font-medium">Programme</th>
                  <th className="px-5 py-2.5 text-right font-medium">Students</th><th className="px-5 py-2.5 text-right font-medium">Sessions</th>
                  <th className="px-5 py-2.5 font-medium">Rate</th>
                </tr></thead>
                <tbody>
                  {data.perCourse.map((c) => {
                    const col = c.rate >= 75 ? "#7fb98a" : c.rate >= 50 ? "#e0b878" : "#f0a58f";
                    return (
                      <tr key={c.id} className="border-b border-white/5 last:border-0">
                        <td className="px-5 py-3"><span className="font-mono text-[12px] text-brand-300">{c.code}</span> <span className="text-[12.5px] text-white/90">{c.title}</span></td>
                        <td className="px-5 py-3 text-[12px] text-ink-300">{c.programme ?? "—"}</td>
                        <td className="px-5 py-3 text-right font-mono text-[12.5px] text-ink-200">{c.students}</td>
                        <td className="px-5 py-3 text-right font-mono text-[12.5px] text-ink-200">{c.sessions}</td>
                        <td className="px-5 py-3"><div className="flex items-center gap-2"><span className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full" style={{ width: `${c.rate}%`, background: col }} /></span><span className="font-display text-[12.5px] font-semibold text-white">{c.rate}%</span></div></td>
                      </tr>
                    );
                  })}
                  {data.perCourse.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-ink-300">No courses yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          {/* At-risk students */}
          <section className={panel + " overflow-hidden"}>
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-3.5">
              <h2 className="font-display text-[15px] font-semibold text-white">At-risk students</h2>
              <button onClick={exportAtRisk} disabled={data.atRisk.length === 0} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] font-medium text-ink-200 hover:bg-white/10 disabled:opacity-40">
                <Download className="size-3.5" /> Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-white/5 text-left text-[11px] uppercase tracking-wide text-ink-400">
                  <th className="px-5 py-2.5 font-medium">Student</th><th className="px-5 py-2.5 font-medium">ID</th>
                  <th className="px-5 py-2.5 font-medium">Course</th><th className="px-5 py-2.5 text-right font-medium">Attended</th><th className="px-5 py-2.5 text-right font-medium">Rate</th>
                </tr></thead>
                <tbody>
                  {data.atRisk.map((s, i) => (
                    <tr key={i} className="border-b border-white/5 last:border-0">
                      <td className="px-5 py-3 text-[13px] font-medium text-white">{s.studentName}</td>
                      <td className="px-5 py-3 font-mono text-[12px] text-ink-300">{s.idNumber ?? "—"}</td>
                      <td className="px-5 py-3 font-mono text-[12px] text-brand-300">{s.courseCode}</td>
                      <td className="px-5 py-3 text-right font-mono text-[12.5px] text-ink-200">{s.attended}/{s.held}</td>
                      <td className="px-5 py-3 text-right"><span className="rounded-full bg-fail/20 px-2.5 py-0.5 text-[11.5px] font-semibold text-[#f0a58f]">{s.rate}%</span></td>
                    </tr>
                  ))}
                  {data.atRisk.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-ink-300">No at-risk students. Everyone's above 75%.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
