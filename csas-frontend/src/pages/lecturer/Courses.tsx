import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Loader2,
  AlertCircle,
  BookOpen,
  Radio,
  X,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { listCourses, createCourse, regenerateJoinCode, type Course } from "../../lib/courses";
import { getApiErrorMessage } from "../../lib/api";

const field =
  "w-full rounded-lg border border-ink-200 bg-surface px-3 py-2 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20";
const labelCls = "mb-1 block text-xs font-medium text-ink-600";

function tagsFor(c: Course): string[] {
  const t: string[] = [];
  if (c.programme) t.push(c.programme);
  if (c.level) t.push(`Level ${c.level}`);
  if (c.semester) t.push(c.semester === "FIRST" ? "First sem" : "Second sem");
  if (c.stream && c.stream !== "REGULAR")
    t.push(c.stream === "WEEKEND" ? "Weekend" : "Evening");
  if (c.creditHours) t.push(`${c.creditHours} credit hrs`);
  return t;
}

function CourseCard({ course }: { course: Course }) {
  const [joinCode, setJoinCode] = useState(course.joinCode ?? null);
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);

  async function copy() {
    if (!joinCode) return;
    try {
      await navigator.clipboard.writeText(joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — no-op */
    }
  }
  async function rotate() {
    setRotating(true);
    try {
      const next = await regenerateJoinCode(course.id);
      setJoinCode(next);
    } catch {
      /* ignore */
    } finally {
      setRotating(false);
    }
  }

  const tags = tagsFor(course);
  return (
    <div className="flex flex-col rounded-2xl border border-white/5 bg-night p-5 text-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="font-mono text-xs font-medium text-brand-300">{course.code}</span>
          <h3 className="mt-0.5 font-display font-semibold leading-snug text-white">{course.title}</h3>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-500/15 text-brand-300">
          <BookOpen className="size-4" />
        </span>
      </div>

      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span key={t} className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-ink-200">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Class join code — students use this to enrol */}
      <div className="mt-4 rounded-xl bg-white/5 p-3">
        <p className="text-[10px] font-medium uppercase tracking-wide text-ink-400">Class join code</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="flex-1 font-mono text-lg font-semibold tracking-[0.2em] text-brand-300">
            {joinCode ?? "—"}
          </span>
          <button
            onClick={copy}
            disabled={!joinCode}
            title="Copy code"
            className="grid size-8 place-items-center rounded-lg border border-white/10 text-ink-200 transition-colors hover:bg-white/10 disabled:opacity-40"
          >
            {copied ? <Check className="size-4 text-[#8fce9a]" /> : <Copy className="size-4" />}
          </button>
          <button
            onClick={rotate}
            disabled={rotating}
            title="Regenerate code"
            className="grid size-8 place-items-center rounded-lg border border-white/10 text-ink-200 transition-colors hover:bg-white/10 disabled:opacity-40"
          >
            <RefreshCw className={"size-4 " + (rotating ? "animate-spin" : "")} />
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-ink-400">Share with your students so they can join this class.</p>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-white/5 pt-4">
        <Link
          to={`/lecturer/courses/${course.id}/session`}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          <Radio className="size-4" /> Start session
        </Link>
        <Link
          to="/lecturer/sessions"
          className="inline-flex items-center justify-center rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-ink-200 transition-colors hover:bg-white/5"
        >
          Sessions
        </Link>
      </div>
    </div>
  );
}

export function Courses() {
  const { data: courses, loading, error, reload } = useAsync(listCourses);

  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [programme, setProgramme] = useState("");
  const [level, setLevel] = useState("");
  const [semester, setSemester] = useState("");
  const [stream, setStream] = useState("REGULAR");
  const [creditHours, setCreditHours] = useState("3");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function submit() {
    if (!code.trim() || !title.trim()) {
      setFormError("Course code and title are required.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await createCourse({
        code: code.trim(),
        title: title.trim(),
        programme: programme.trim() || undefined,
        level: level ? Number(level) : undefined,
        semester: (semester || undefined) as "FIRST" | "SECOND" | undefined,
        stream: stream as "REGULAR" | "WEEKEND" | "EVENING",
        creditHours: creditHours ? Number(creditHours) : undefined,
      });
      setCode("");
      setTitle("");
      setProgramme("");
      setLevel("");
      setSemester("");
      setStream("REGULAR");
      setCreditHours("3");
      setOpen(false);
      reload();
    } catch (e) {
      setFormError(getApiErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11.5px] uppercase tracking-[0.1em] text-ink-500">
            Your teaching
          </p>
          <h1 className="mt-1 text-[25px] font-semibold tracking-tight text-ink-900">Courses</h1>
        </div>
        <button
          onClick={() => {
            setOpen((v) => !v);
            setFormError(null);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          {open ? <X className="size-4" /> : <Plus className="size-4" />}
          {open ? "Cancel" : "New course"}
        </button>
      </header>

      {open && (
        <div className="rounded-xl border border-ink-200 bg-surface p-5">
          <h2 className="mb-4 font-display text-sm font-semibold text-ink-900">Add a course</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Course code *</label>
              <input
                className={field}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. CS101"
              />
            </div>
            <div>
              <label className={labelCls}>Title *</label>
              <input
                className={field}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Intro to Computer Science"
              />
            </div>
            <div>
              <label className={labelCls}>Programme</label>
              <input
                className={field}
                value={programme}
                onChange={(e) => setProgramme(e.target.value)}
                placeholder="e.g. BSc Computer Science"
              />
            </div>
            <div>
              <label className={labelCls}>Level</label>
              <select className={field} value={level} onChange={(e) => setLevel(e.target.value)}>
                <option value="">—</option>
                <option value="100">100</option>
                <option value="200">200</option>
                <option value="300">300</option>
                <option value="400">400</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Semester</label>
              <select
                className={field}
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
              >
                <option value="">—</option>
                <option value="FIRST">First</option>
                <option value="SECOND">Second</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Stream</label>
              <select className={field} value={stream} onChange={(e) => setStream(e.target.value)}>
                <option value="REGULAR">Regular</option>
                <option value="WEEKEND">Weekend</option>
                <option value="EVENING">Evening</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Credit hours</label>
              <select
                className={field}
                value={creditHours}
                onChange={(e) => setCreditHours(e.target.value)}
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6</option>
              </select>
            </div>
          </div>

          {formError && (
            <p className="mt-3 flex items-center gap-2 text-sm text-fail">
              <AlertCircle className="size-4" /> {formError}
            </p>
          )}

          <div className="mt-5 flex justify-end">
            <button
              onClick={submit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {submitting ? "Saving…" : "Create course"}
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-ink-500">
          <Loader2 className="size-4 animate-spin" /> Loading courses…
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg bg-fail-soft px-4 py-3 text-sm text-fail"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="size-4" />
            {error}
          </span>
          <button onClick={reload} className="font-medium underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && courses && (
        courses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-200 p-12 text-center text-ink-500">
            <BookOpen className="mx-auto mb-2 size-6 text-ink-400" />
            No courses yet. Add your first one above.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {courses.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
