import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { signupLecturer, login } from "../../lib/auth";
import { getApiErrorMessage } from "../../lib/api";
import { useAuth } from "../../store/auth";

const field =
  "w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-ink-900 placeholder:text-ink-400 outline-none transition-colors focus:border-brand-500 disabled:opacity-60";

export function LecturerSignup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const setSession = useAuth((s) => s.setSession);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      await signupLecturer({ fullName: fullName.trim(), email: email.trim(), password });
      const { token, user } = await login(email.trim(), password);
      setSession(token, user);
      navigate("/lecturer", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-ink-900">Create a lecturer account</h1>
        <p className="text-sm text-ink-500">Register to create courses and run sessions.</p>
      </div>

      {error && (
        <div role="alert" className="rounded-lg bg-fail-soft px-3 py-2 text-sm font-medium text-fail">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="fullName" className="block text-sm font-medium text-ink-700">Full name</label>
        <input id="fullName" type="text" autoComplete="name" required value={fullName}
          onChange={(e) => setFullName(e.target.value)} disabled={loading}
          placeholder="Dr. Lana Mensah" className={field} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-ink-700">Email</label>
        <input id="email" type="email" autoComplete="email" required value={email}
          onChange={(e) => setEmail(e.target.value)} disabled={loading}
          placeholder="you@school.edu" className={field} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-ink-700">Password</label>
        <input id="password" type="password" autoComplete="new-password" required value={password}
          onChange={(e) => setPassword(e.target.value)} disabled={loading}
          placeholder="At least 6 characters" className={field} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirm" className="block text-sm font-medium text-ink-700">Confirm password</label>
        <input id="confirm" type="password" autoComplete="new-password" required value={confirm}
          onChange={(e) => setConfirm(e.target.value)} disabled={loading}
          placeholder="••••••••" className={field} />
      </div>

      <button type="submit" disabled={loading || !fullName || !email || !password}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">
        {loading && <Loader2 className="size-4 animate-spin" />}
        {loading ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-sm text-ink-500">
        Already have an account?{" "}
        <Link to="/login/lecturer" className="font-medium text-brand-700 hover:underline">Sign in</Link>
      </p>
    </form>
  );
}
