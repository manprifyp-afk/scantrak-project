import { useState } from "react";
import {
  Loader2,
  AlertCircle,
  LogOut,
  IdCard,
  BookOpen,
  Plus,
  CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAsync } from "../../hooks/useAsync";
import { useAuth } from "../../store/auth";
import { getMe, joinCourse } from "../../lib/auth";
import { listCourses } from "../../lib/courses";
import { getApiErrorMessage } from "../../lib/api";

function initials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}
function semesterLabel(s?: string | null) {
  return s === "FIRST" ? "First" : s === "SECOND" ? "Second" : null;
}
function streamLabel(s?: string | null) {
  return s && s !== "REGULAR" ? s.charAt(0) + s.slice(1).toLowerCase() : null;
}

async function loadProfile() {
  const [me, courses] = await Promise.all([getMe(), listCourses()]);
  return { me, courses };
}

const panel = "rounded-3xl border border-white/5 bg-night p-5 text-white";

export function StudentSettings() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(loadProfile);

  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinOk, setJoinOk] = useState<string | null>(null);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  async function handleJoin() {
    const code = joinCode.trim();
    if (!code) return;
    setJoining(true);
    setJoinError(null);
    setJoinOk(null);
    try {
      const course = await joinCourse(code);
      setJoinOk(`Joined ${course.code} — ${course.title}`);
      setJoinCode("");
      reload();
    } catch (e) {
      setJoinError(getApiErrorMessage(e));
    } finally {
      setJoining(false);
    }
  }

  const fullName = data?.me.fullName ?? user?.fullName ?? "";
  const idNumber = data?.me.idNumber;
  const courses = data?.courses ?? [];
  const programme = courses.find((c) => c.programme)?.programme ?? null;
  const level = courses.find((c) => c.level != null)?.level ?? null;

  return (
    <div className="mx-auto max-w-sm space-y-4 pt-2">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Profile</h1>
        <p className="mt-0.5 text-sm text-ink-500">Your student details.</p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-ink-500">
          <Loader2 className="size-4 animate-spin" /> Loading your profile…
        </div>
      )}
      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-lg bg-fail-soft px-4 py-3 text-sm text-fail">
          <AlertCircle className="size-4" /> {error}
        </div>
      )}

      {!loading && (
        <>
          {/* Identity */}
          <section className={panel}>
            <div className="flex items-center gap-3.5 border-b border-white/5 pb-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-brand-600 font-display text-xl font-bold text-white">
                {initials(fullName)}
              </span>
              <div className="min-w-0">
                <p className="font-display text-lg font-semibold text-white">{fullName}</p>
                <p className="font-mono text-[13px] text-ink-300">{idNumber ?? "No ID on file"}</p>
              </div>
            </div>
            <div className="mt-3 space-y-3">
              {idNumber && (
                <Row icon={IdCard} label="Student ID" value={idNumber} />
              )}
              {programme && <Row icon={BookOpen} label="Programme" value={programme} />}
              {level != null && <Row icon={BookOpen} label="Level" value={String(level)} />}
            </div>
          </section>

          {/* Enrolled courses */}
          <section className={panel}>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-300">Enrolled courses</h2>
            {courses.length === 0 ? (
              <p className="text-sm text-ink-300">You're not enrolled in any courses yet.</p>
            ) : (
              <div className="space-y-2.5">
                {courses.map((c) => {
                  const tags = [
                    c.programme,
                    c.level != null ? `Level ${c.level}` : null,
                    semesterLabel(c.semester),
                    streamLabel(c.stream),
                    c.creditHours != null ? `${c.creditHours} credit hrs` : null,
                  ].filter(Boolean) as string[];
                  return (
                    <div key={c.id} className="rounded-2xl bg-white/5 px-4 py-3">
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-xs font-medium text-brand-300">{c.code}</span>
                        <span className="text-sm font-medium text-white/90">{c.title}</span>
                      </div>
                      {tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {tags.map((t) => (
                            <span key={t} className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-ink-200">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Join a class */}
          <section className={panel}>
            <h2 className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-300">Join a class</h2>
            <p className="mb-3 text-xs text-ink-400">Enter the class code your lecturer shared to enrol.</p>
            <div className="flex gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. K7QM2P"
                disabled={joining}
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono uppercase tracking-wide text-white outline-none placeholder:text-white/30 focus:border-brand-400"
              />
              <button
                onClick={handleJoin}
                disabled={joining || !joinCode.trim()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
              >
                {joining ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Join
              </button>
            </div>
            {joinError && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-[#f0a58f]">
                <AlertCircle className="size-3.5" /> {joinError}
              </p>
            )}
            {joinOk && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-[#8fce9a]">
                <CheckCircle2 className="size-3.5" /> {joinOk}
              </p>
            )}
          </section>

          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-ink-200 bg-surface px-4 py-3 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-100"
          >
            <LogOut className="size-4" /> Sign out
          </button>

          <p className="text-center text-xs text-ink-400">
            Need a detail changed? Contact your department.
          </p>
        </>
      )}
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof IdCard; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-500/15 text-brand-300">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-ink-400">{label}</p>
        <p className="truncate text-[14px] font-medium text-white">{value}</p>
      </div>
    </div>
  );
}
