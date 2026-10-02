import { useState } from "react";
import { Loader2, AlertCircle, Pencil, Trash2, Users, Download, UserPlus, X } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import {
  getAdminCourses,
  getAdminUsers,
  updateCourse,
  deleteCourse,
  getRoster,
  enrollStudent,
  unenrollStudent,
  type AdminCourse,
  type AdminUser,
  type Roster,
} from "../../lib/admin";
import { getApiErrorMessage } from "../../lib/api";
import { downloadCsv } from "../../lib/csv";
import { Modal, adminField, adminLabel } from "../../components/admin/Modal";

const panel = "rounded-2xl border border-white/5 bg-night text-white";

async function loadData() {
  const [courses, users] = await Promise.all([getAdminCourses(), getAdminUsers()]);
  const lecturers = users.filter((u) => u.role === "LECTURER" || u.role === "ADMIN");
  return { courses, lecturers };
}

export function AdminCourses() {
  const { data, loading, error, reload } = useAsync(loadData);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminCourse | null>(null);
  const [roster, setRoster] = useState<AdminCourse | null>(null);

  const courses = data?.courses ?? [];
  const lecturers = data?.lecturers ?? [];

  function exportCsv() {
    downloadCsv(
      "courses.csv",
      ["Code", "Title", "Lecturer", "Join code", "Programme", "Level", "Students", "Sessions"],
      courses.map((c) => [c.code, c.title, c.lecturer, c.joinCode ?? "", c.programme ?? "", c.level ?? "", c.students, c.sessions])
    );
  }

  async function handleDelete(c: AdminCourse) {
    if (!confirm(`Delete ${c.code} — ${c.title}? This removes its sessions and enrolments too.`)) return;
    setBusy(c.id);
    try {
      await deleteCourse(c.id);
      reload();
    } catch (e) {
      alert(getApiErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-ink-500">Catalog</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink-900">Courses</h1>
        </div>
        <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-surface px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100">
          <Download className="size-4" /> Export
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-ink-500">
          <Loader2 className="size-4 animate-spin" /> Loading courses…
        </div>
      )}
      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg bg-fail-soft px-4 py-3 text-sm text-fail">
          <span className="flex items-center gap-2"><AlertCircle className="size-4" /> {error}</span>
          <button onClick={reload} className="font-medium underline">Retry</button>
        </div>
      )}

      {!loading && !error && (
        <section className={panel + " overflow-hidden"}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 text-left text-[11.5px] uppercase tracking-wide text-ink-400">
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Lecturer</th>
                  <th className="px-4 py-3 font-medium">Join code</th>
                  <th className="px-4 py-3 text-right font-medium">Students</th>
                  <th className="px-4 py-3 text-right font-medium">Sessions</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3 font-mono text-[12.5px] font-medium text-brand-300">{c.code}</td>
                    <td className="px-4 py-3 text-[13px] text-white/90">{c.title}</td>
                    <td className="px-4 py-3 text-[12.5px] text-ink-200">{c.lecturer}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-white/5 px-2 py-1 font-mono text-[12px] font-semibold tracking-wider text-brand-300">
                        {c.joinCode ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[13px] text-ink-200">{c.students}</td>
                    <td className="px-4 py-3 text-right font-mono text-[13px] text-ink-200">{c.sessions}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => setRoster(c)} title="Roster" className="grid size-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-ink-200 hover:bg-white/10">
                          <Users className="size-4" />
                        </button>
                        <button onClick={() => setEditing(c)} title="Edit / reassign" className="grid size-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-ink-200 hover:bg-white/10">
                          <Pencil className="size-4" />
                        </button>
                        <button onClick={() => handleDelete(c)} disabled={busy === c.id} title="Delete" className="grid size-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-[#f0a58f] hover:bg-fail/15 disabled:opacity-50">
                          {busy === c.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {courses.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-ink-300">No courses yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {editing && (
        <CourseForm
          course={editing}
          lecturers={lecturers}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
      {roster && <RosterModal course={roster} onClose={() => setRoster(null)} />}
    </div>
  );
}

function RosterModal({ course, onClose }: { course: AdminCourse; onClose: () => void }) {
  const { data, loading, error, reload } = useAsync(() => getRoster(course.id));
  const [idNumber, setIdNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const roster: Roster | null = data;

  async function add() {
    if (!idNumber.trim()) return;
    setErr(null);
    setBusy(true);
    try {
      await enrollStudent(course.id, idNumber.trim());
      setIdNumber("");
      reload();
    } catch (e) {
      setErr(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(studentId: string, name: string) {
    if (!confirm(`Remove ${name} from ${course.code}?`)) return;
    setBusy(true);
    try {
      await unenrollStudent(course.id, studentId);
      reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`${course.code} · roster`} onClose={onClose}>
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            placeholder="Add student by ID"
            className={adminField + " font-mono"}
          />
          <button onClick={add} disabled={busy || !idNumber.trim()} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
            <UserPlus className="size-4" /> Add
          </button>
        </div>
        {err && <p className="text-xs font-medium text-fail">{err}</p>}

        {loading && <div className="flex items-center gap-2 py-4 text-sm text-ink-500"><Loader2 className="size-4 animate-spin" /> Loading…</div>}
        {error && <p className="text-sm text-fail">{error}</p>}

        {roster && (
          <div className="max-h-72 overflow-y-auto rounded-lg border border-ink-200">
            {roster.students.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-ink-500">No students enrolled yet.</p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {roster.students.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-ink-900">{s.fullName}</p>
                      <p className="font-mono text-[11px] text-ink-500">{s.idNumber ?? "—"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={"text-[12px] font-semibold " + (s.rate >= 75 ? "text-pass" : "text-fail")}>
                        {s.rate}% <span className="font-normal text-ink-400">({s.attended}/{s.held})</span>
                      </span>
                      <button onClick={() => remove(s.id, s.fullName)} disabled={busy} title="Remove" className="grid size-7 place-items-center rounded-lg text-ink-400 hover:bg-fail-soft hover:text-fail disabled:opacity-50">
                        <X className="size-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function CourseForm({
  course,
  lecturers,
  onClose,
  onSaved,
}: {
  course: AdminCourse;
  lecturers: AdminUser[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [code, setCode] = useState(course.code);
  const [title, setTitle] = useState(course.title);
  const [programme, setProgramme] = useState(course.programme ?? "");
  const [level, setLevel] = useState(course.level != null ? String(course.level) : "");
  const [lecturerId, setLecturerId] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setErr(null);
    setSaving(true);
    try {
      await updateCourse(course.id, {
        code,
        title,
        programme: programme.trim() || null,
        level: level ? Number(level) : null,
        lecturerId: lecturerId || undefined,
      });
      onSaved();
    } catch (e) {
      setErr(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Edit ${course.code}`} onClose={onClose}>
      <div className="space-y-3">
        {err && <div className="rounded-lg bg-fail-soft px-3 py-2 text-sm font-medium text-fail">{err}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={adminLabel}>Course code</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} className={adminField + " font-mono"} />
          </div>
          <div>
            <label className={adminLabel}>Level</label>
            <input value={level} onChange={(e) => setLevel(e.target.value.replace(/\D/g, ""))} className={adminField} placeholder="100" />
          </div>
        </div>
        <div>
          <label className={adminLabel}>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={adminField} />
        </div>
        <div>
          <label className={adminLabel}>Programme</label>
          <input value={programme} onChange={(e) => setProgramme(e.target.value)} className={adminField} placeholder="BSc Computer Science" />
        </div>
        <div>
          <label className={adminLabel}>Lecturer</label>
          <select value={lecturerId} onChange={(e) => setLecturerId(e.target.value)} className={adminField}>
            <option value="">Keep current ({course.lecturer})</option>
            {lecturers.map((l) => (
              <option key={l.id} value={l.id}>{l.fullName}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100">Cancel</button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
            {saving && <Loader2 className="size-4 animate-spin" />} Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
