import { useState } from "react";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Mail,
  ShieldCheck,
  LogOut,
  KeyRound,
} from "lucide-react";
import { useAuth } from "../../store/auth";
import { changePassword } from "../../lib/auth";
import { getApiErrorMessage } from "../../lib/api";

const field =
  "w-full rounded-lg border border-ink-200 bg-surface px-3 py-2 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20";
const labelCls = "mb-1 block text-xs font-medium text-ink-600";

const roleLabel: Record<string, string> = {
  STUDENT: "Student",
  LECTURER: "Lecturer",
  ADMIN: "Administrator",
};

function initials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

export function Settings() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setError(null);
    setDone(false);
    if (!current || !next) {
      setError("Fill in your current and new password.");
      return;
    }
    if (next.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New password and confirmation don't match.");
      return;
    }
    setSaving(true);
    try {
      await changePassword(current, next);
      setDone(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="font-mono text-[11.5px] uppercase tracking-[0.1em] text-ink-500">Account</p>
        <h1 className="mt-1 text-[25px] font-semibold tracking-tight text-ink-900">Settings</h1>
      </header>

      {/* Profile */}
      <section className="rounded-2xl border border-ink-200 bg-surface p-6">
        <div className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-brand-600 font-display text-xl font-bold text-white">
            {initials(user?.fullName)}
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold text-ink-900">
              {user?.fullName ?? "—"}
            </p>
            <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
              <ShieldCheck className="size-3.5" />
              {user ? roleLabel[user.role] ?? user.role : "—"}
            </span>
          </div>
        </div>
        <div className="mt-5 border-t border-ink-100 pt-4">
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
              <Mail className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-ink-500">Email</p>
              <p className="truncate font-medium text-ink-900">{user?.email ?? "—"}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Change password */}
      <section className="rounded-2xl border border-ink-200 bg-surface p-6">
        <h2 className="mb-1 flex items-center gap-2 font-display text-sm font-semibold text-ink-900">
          <KeyRound className="size-4 text-ink-500" /> Change password
        </h2>
        <p className="mb-4 text-xs text-ink-500">
          Confirm your current password, then choose a new one (at least 6 characters).
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>Current password</label>
            <input
              type="password"
              className={field}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className={labelCls}>New password</label>
            <input
              type="password"
              className={field}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className={labelCls}>Confirm new password</label>
            <input
              type="password"
              className={field}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 flex items-center gap-2 text-sm text-fail">
            <AlertCircle className="size-4" /> {error}
          </p>
        )}
        {done && (
          <p className="mt-3 flex items-center gap-2 text-sm text-pass">
            <CheckCircle2 className="size-4" /> Password updated.
          </p>
        )}

        <div className="mt-5 flex justify-end">
          <button
            onClick={submit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            {saving ? "Saving…" : "Update password"}
          </button>
        </div>
      </section>

      {/* Sign out */}
      <section className="rounded-2xl border border-ink-200 bg-surface p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-sm font-semibold text-ink-900">Sign out</h2>
            <p className="text-xs text-ink-500">End your session on this device.</p>
          </div>
          <button
            onClick={logout}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-100"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </section>
    </div>
  );
}
