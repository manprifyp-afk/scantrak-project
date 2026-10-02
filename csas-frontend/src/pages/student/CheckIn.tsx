import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  CalendarClock,
  QrCode,
  Keyboard,
  ChevronRight,
  Flame,
  TriangleAlert,
} from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { getActiveSessions, type ActiveSession } from "../../lib/student";
import { submitScan, type ScanResult } from "../../lib/scan";
import { getAttendanceSummary, type AttendanceSummary } from "../../lib/attendance";
import { getApiErrorMessage } from "../../lib/api";
import { QrScanner } from "../../components/student/QrScanner";
import { useAuth } from "../../store/auth";

const PASS_MARK = 75; // exam-eligibility threshold

interface HomeData {
  sessions: ActiveSession[];
  summary: AttendanceSummary;
}
async function loadHome(): Promise<HomeData> {
  const [sessions, summary] = await Promise.all([getActiveSessions(), getAttendanceSummary()]);
  return { sessions, summary };
}
function startedAt(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function streakOf(timeline: AttendanceSummary["timeline"]): number {
  let n = 0;
  for (const t of timeline) {
    if (t.status === "ABSENT") break;
    n += 1;
  }
  return n;
}

function Gauge({ pct }: { pct: number }) {
  const r = 82;
  const len = Math.PI * r;
  const d = `M 20 100 A ${r} ${r} 0 0 1 184 100`;
  return (
    <div className="relative mx-auto w-[204px]">
      <svg viewBox="0 0 204 116" className="w-full">
        <path d={d} fill="none" stroke="rgba(255,255,255,.10)" strokeWidth="16" strokeLinecap="round" />
        <path d={d} fill="none" stroke="url(#sGauge)" strokeWidth="16" strokeLinecap="round"
          strokeDasharray={len} strokeDashoffset={len * (1 - Math.min(100, Math.max(0, pct)) / 100)} />
        <defs>
          <linearGradient id="sGauge" x1="0" y1="0" x2="1" y2="0">
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

export function StudentCheckIn() {
  const { data, loading, error, reload } = useAsync(loadHome);
  const user = useAuth((s) => s.user);

  const sessions = data?.sessions ?? [];
  const summary = data?.summary;

  const [showScanner, setShowScanner] = useState(false);
  const [manual, setManual] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [resultLabel, setResultLabel] = useState<string | null>(null);

  useEffect(() => {
    if (sessions.length > 0 && !selectedId) setSelectedId(sessions[0].sessionId);
  }, [sessions, selectedId]);

  function labelFor(sessionId: string): string | null {
    const s = sessions.find((x) => x.sessionId === sessionId);
    return s ? `${s.courseCode} · ${s.courseTitle}` : null;
  }
  async function doScan(sessionId: string, scanCode: string) {
    setSubmitting(true);
    setScanError(null);
    try {
      const r = await submitScan(sessionId, scanCode);
      setResultLabel(labelFor(sessionId));
      setResult(r);
    } catch (e) {
      setScanError(getApiErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }
  function handleScanned(text: string) {
    setShowScanner(false);
    let payload: { sessionId?: unknown; code?: unknown } | null = null;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
    if (!payload || typeof payload.sessionId !== "string" || typeof payload.code !== "string") {
      setScanError("That QR code isn't a ScanTrak check-in code. Try again, or enter the code by hand.");
      return;
    }
    void doScan(payload.sessionId, payload.code);
  }
  function reset() {
    setResult(null);
    setResultLabel(null);
    setCode("");
    setScanError(null);
    setManual(false);
    reload();
  }

  if (result) {
    return (
      <div className="mx-auto max-w-sm pt-6 text-center">
        <CheckCircle2 className="mx-auto size-16 text-pass" />
        <h1 className="mt-4 text-2xl font-semibold text-ink-900">You're checked in</h1>
        {resultLabel && <p className="mt-1 text-ink-500">{resultLabel}</p>}
        <div className="mt-5 inline-flex items-center gap-2">
          <span
            className={
              "rounded-full px-3 py-1 text-sm font-medium " +
              (result.status === "LATE" ? "bg-warn-soft text-warn" : "bg-pass-soft text-pass")
            }
          >
            {result.status === "LATE" ? "Late" : "Present"}
          </span>
          <span className="text-sm text-ink-400">{result.distanceMeters} m from centre</span>
        </div>
        <button onClick={reset} className="mt-8 block w-full text-sm font-medium text-brand-700 hover:underline">
          Back to home
        </button>
      </div>
    );
  }

  const overall = summary?.overall.rate ?? 0;
  const attended = summary?.overall.attended ?? 0;
  const held = summary?.overall.totalSessions ?? 0;
  const streak = summary ? streakOf(summary.timeline) : 0;
  const atRisk = (summary?.courses ?? []).filter((c) => c.totalSessions > 0 && c.rate < PASS_MARK);
  const courses = (summary?.courses ?? []).filter((c) => c.totalSessions > 0);
  const firstName = user?.fullName?.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto max-w-sm space-y-4">
      {showScanner && <QrScanner onResult={handleScanned} onClose={() => setShowScanner(false)} />}

      {/* Hero: greeting + gauge + streak */}
      <header className={panel}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-xl font-semibold">Hi, {firstName}</h1>
            <p className="text-sm text-ink-300">
              {held === 0 ? "Check into your first class below." : `Attended ${attended} of ${held} classes`}
            </p>
          </div>
          {streak > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/15 px-3 py-1 text-sm font-semibold text-brand-300">
              <Flame className="size-4" /> {streak}
            </span>
          )}
        </div>
        <div className="mt-3">
          <Gauge pct={overall} />
        </div>
      </header>

      {loading && (
        <div className="flex items-center gap-2 text-ink-500">
          <Loader2 className="size-4 animate-spin" /> Loading…
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

      {!loading && !error && summary && (
        <>
          {/* Exam-eligibility alert */}
          {atRisk.length > 0 && (
            <Link
              to="/student/attendance"
              className="flex items-start gap-3 rounded-2xl border border-fail/30 bg-fail/10 p-4 text-white"
            >
              <TriangleAlert className="mt-0.5 size-5 shrink-0 text-[#f0a58f]" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#f0a58f]">
                  Below {PASS_MARK}% in {atRisk.length} course{atRisk.length > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-ink-300">
                  {atRisk.map((c) => c.code).join(", ")} — you risk exam ineligibility. Tap for details.
                </p>
              </div>
              <ChevronRight className="mt-1 size-4 shrink-0 text-ink-400" />
            </Link>
          )}

          {/* Scan card */}
          <section className={panel + " space-y-4"}>
            {sessions.length > 0 ? (
              <div className="flex items-center gap-2 rounded-xl bg-pass/15 px-4 py-3 text-sm font-medium text-[#8fce9a]">
                <span className="size-2 animate-pulse rounded-full bg-pass" />
                {sessions.length === 1
                  ? `${sessions[0].courseCode} — ${sessions[0].courseTitle} is live`
                  : `${sessions.length} classes are live right now`}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-ink-300">
                <CalendarClock className="mx-auto mb-1.5 size-5 text-ink-400" />
                No class detected yet. If your lecturer is showing a QR, you can still scan it.
              </div>
            )}

            {scanError && (
              <div role="alert" className="flex items-center gap-2 rounded-xl bg-fail/20 px-4 py-3 text-sm text-[#f0a58f]">
                <AlertCircle className="size-4 shrink-0" /> {scanError}
              </div>
            )}

            <button
              onClick={() => {
                setScanError(null);
                setShowScanner(true);
              }}
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-4 text-lg font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="size-5 animate-spin" /> : <QrCode className="size-5" />}
              {submitting ? "Checking in…" : "Scan QR to check in"}
            </button>

            {sessions.length > 0 &&
              (!manual ? (
                <button
                  onClick={() => setManual(true)}
                  className="inline-flex w-full items-center justify-center gap-1.5 text-sm font-medium text-brand-300 hover:underline"
                >
                  <Keyboard className="size-4" /> Enter code manually
                </button>
              ) : (
                <div className="space-y-3 rounded-xl border border-white/10 p-4">
                  {sessions.length > 1 && (
                    <select
                      value={selectedId}
                      onChange={(e) => setSelectedId(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-brand-400"
                    >
                      {sessions.map((s) => (
                        <option key={s.sessionId} value={s.sessionId} className="text-ink-900">
                          {s.courseCode} — {s.courseTitle} · {startedAt(s.startsAt)}
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    disabled={submitting}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center font-mono text-3xl tracking-[0.3em] text-white outline-none placeholder:text-white/30 focus:border-brand-400 disabled:opacity-60"
                  />
                  <button
                    onClick={() => selectedId && code.length === 6 && doScan(selectedId, code)}
                    disabled={submitting || code.length !== 6}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting && <Loader2 className="size-5 animate-spin" />}
                    Check in with code
                  </button>
                </div>
              ))}

            <p className="text-center text-xs text-ink-400">
              Your location is captured to confirm you're in class.
            </p>
          </section>

          {/* Your courses (true rates + eligibility) */}
          {courses.length > 0 && (
            <section className={panel}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-medium uppercase tracking-wide text-ink-300">Your courses</h2>
                <Link to="/student/attendance" className="inline-flex items-center gap-0.5 text-xs font-medium text-brand-300 hover:underline">
                  See all <ChevronRight className="size-3.5" />
                </Link>
              </div>
              <div className="space-y-3">
                {courses.slice(0, 4).map((c) => {
                  const risk = c.rate < PASS_MARK;
                  const barColor = c.rate >= PASS_MARK ? "bg-brand-400" : c.rate >= 50 ? "bg-warn" : "bg-fail";
                  return (
                    <Link key={c.courseId} to={`/student/courses/${c.code}`} className="flex items-center gap-3">
                      <span className="w-12 shrink-0 font-mono text-xs font-medium text-brand-300">{c.code}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm text-white/90">{c.title}</p>
                          {risk && (
                            <span className="shrink-0 rounded-full bg-fail/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-[#f0a58f]">
                              At risk
                            </span>
                          )}
                        </div>
                        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-white/10">
                          <span className={"block h-full rounded-full " + barColor} style={{ width: `${c.rate}%` }} />
                        </span>
                      </div>
                      <span className="font-display text-sm font-semibold text-white">{c.rate}%</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
