import { useMemo, useState } from "react";
import { Loader2, AlertCircle, Smartphone, SmartphoneNfc, Check, Plus, Pencil, Trash2, KeyRound, Download, Search } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import {
  getAdminUsers,
  resetDevice,
  resetPassword,
  createUser,
  updateUser,
  deleteUser,
  type AdminUser,
} from "../../lib/admin";
import { getApiErrorMessage } from "../../lib/api";
import { downloadCsv } from "../../lib/csv";
import { Modal, adminField, adminLabel } from "../../components/admin/Modal";

const panel = "rounded-2xl border border-white/5 bg-night text-white";
const FILTERS = ["ALL", "STUDENT", "LECTURER", "ADMIN"] as const;

function roleTag(role: AdminUser["role"]) {
  const map: Record<AdminUser["role"], string> = {
    STUDENT: "bg-brand-500/15 text-brand-300",
    LECTURER: "bg-pass/20 text-[#8fce9a]",
    ADMIN: "bg-warn/20 text-[#e0b878]",
  };
  return map[role];
}

type Role = "STUDENT" | "LECTURER" | "ADMIN";

export function AdminUsers() {
  const { data, loading, error, reload } = useAsync(getAdminUsers);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [busy, setBusy] = useState<string | null>(null);
  const [justReset, setJustReset] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminUser | "new" | null>(null);
  const [search, setSearch] = useState("");

  const users = useMemo(
    () =>
      (data ?? [])
        .filter((u) => filter === "ALL" || u.role === filter)
        .filter((u) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          return (
            u.fullName.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            (u.idNumber ?? "").toLowerCase().includes(q)
          );
        }),
    [data, filter, search]
  );

  async function handleResetPw(u: AdminUser) {
    const isStudent = u.role === "STUDENT";
    const msg = isStudent
      ? `Reset ${u.fullName}'s password back to their student ID?`
      : `Enter a new password for ${u.fullName}:`;
    const input = isStudent ? (confirm(msg) ? "" : null) : prompt(msg);
    if (input === null) return;
    setBusy(u.id);
    try {
      await resetPassword(u.id, input || undefined);
      alert(isStudent ? "Password reset to their student ID." : "Password updated.");
    } catch (e) {
      alert(getApiErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  function exportCsv() {
    downloadCsv(
      "users.csv",
      ["Name", "Role", "Email", "Student ID", "Device bound", "Enrolled", "Teaching"],
      (data ?? []).map((u) => [u.fullName, u.role, u.email, u.idNumber ?? "", u.deviceBound ? "yes" : "no", u.enrolledCount, u.teachingCount])
    );
  }

  async function handleReset(u: AdminUser) {
    if (!confirm(`Reset device binding for ${u.fullName}? They'll be able to sign in on a new device.`)) return;
    setBusy(u.id);
    try {
      await resetDevice(u.id);
      setJustReset(u.id);
      setTimeout(() => setJustReset(null), 2000);
      reload();
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(u: AdminUser) {
    if (!confirm(`Delete ${u.fullName}? This can't be undone.`)) return;
    setBusy(u.id);
    try {
      await deleteUser(u.id);
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
          <p className="font-mono text-xs uppercase tracking-wide text-ink-500">People</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink-900">Users</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-surface px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-100"
          >
            <Download className="size-4" /> Export
          </button>
          <button
            onClick={() => setEditing("new")}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            <Plus className="size-4" /> New user
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-ink-200 bg-surface p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={
                "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors " +
                (filter === f ? "bg-brand-600 text-white" : "text-ink-600 hover:text-ink-900")
              }
            >
              {f.toLowerCase()}
            </button>
          ))}
        </div>
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, ID, or email"
            className="w-full rounded-lg border border-ink-200 bg-surface py-2 pl-9 pr-3 text-sm text-ink-900 outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-ink-500">
          <Loader2 className="size-4 animate-spin" /> Loading users…
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
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">ID / Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Device</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3 text-[13px] font-medium text-white">{u.fullName}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-ink-300">
                      {u.role === "STUDENT" ? (u.idNumber ?? "—") : u.email}
                    </td>
                    <td className="px-4 py-3">
                      <span className={"rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize " + roleTag(u.role)}>
                        {u.role.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.deviceBound ? (
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#8fce9a]">
                          <Smartphone className="size-3.5" /> Bound
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-400">
                          <SmartphoneNfc className="size-3.5" /> None
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {u.role === "STUDENT" && u.deviceBound && (
                          <button
                            onClick={() => handleReset(u)}
                            disabled={busy === u.id}
                            title="Reset device binding"
                            className="grid size-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-ink-200 transition-colors hover:bg-white/10 disabled:opacity-50"
                          >
                            {justReset === u.id ? <Check className="size-4 text-[#8fce9a]" /> : <SmartphoneNfc className="size-4" />}
                          </button>
                        )}
                        <button
                          onClick={() => handleResetPw(u)}
                          disabled={busy === u.id}
                          title="Reset password"
                          className="grid size-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-ink-200 transition-colors hover:bg-white/10 disabled:opacity-50"
                        >
                          <KeyRound className="size-4" />
                        </button>
                        <button
                          onClick={() => setEditing(u)}
                          title="Edit"
                          className="grid size-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-ink-200 transition-colors hover:bg-white/10"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={busy === u.id}
                          title="Delete"
                          className="grid size-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-[#f0a58f] transition-colors hover:bg-fail/15 disabled:opacity-50"
                        >
                          {busy === u.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-300">No users in this view.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {editing && (
        <UserForm
          user={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function UserForm({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUser | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !user;
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [role, setRole] = useState<Role>(user?.role ?? "STUDENT");
  const [email, setEmail] = useState(user && user.role !== "STUDENT" ? user.email : "");
  const [idNumber, setIdNumber] = useState(user?.idNumber ?? "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setErr(null);
    setSaving(true);
    try {
      if (isNew) {
        await createUser({ fullName, role, email: email || undefined, idNumber: idNumber || undefined, password: password || undefined });
      } else {
        await updateUser(user!.id, { fullName, role, email: role === "STUDENT" ? undefined : email, idNumber: role === "STUDENT" ? idNumber : undefined });
      }
      onSaved();
    } catch (e) {
      setErr(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isNew ? "New user" : "Edit user"} onClose={onClose}>
      <div className="space-y-3">
        {err && <div className="rounded-lg bg-fail-soft px-3 py-2 text-sm font-medium text-fail">{err}</div>}

        <div>
          <label className={adminLabel}>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} disabled={!isNew} className={adminField}>
            <option value="STUDENT">Student</option>
            <option value="LECTURER">Lecturer</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        <div>
          <label className={adminLabel}>Full name</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={adminField} placeholder="Jane Doe" />
        </div>

        {role === "STUDENT" ? (
          <div>
            <label className={adminLabel}>Student ID</label>
            <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} className={adminField + " font-mono"} placeholder="10912345" />
            {isNew && <p className="mt-1 text-[11px] text-ink-400">Password defaults to the student ID.</p>}
          </div>
        ) : (
          <div>
            <label className={adminLabel}>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className={adminField} placeholder="name@school.edu" />
          </div>
        )}

        {isNew && role !== "STUDENT" && (
          <div>
            <label className={adminLabel}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={adminField} placeholder="At least 6 characters" />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100">Cancel</button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
            {saving && <Loader2 className="size-4 animate-spin" />}
            {isNew ? "Create" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
