import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { login } from "../lib/auth";
import { getApiErrorMessage } from "../lib/api";
import { useAuth } from "../store/auth";

interface LoginFormProps {
  title: string;
  subtitle: string;
}

// Shared by the lecturer and student login screens. After a successful login we
// redirect by the user's REAL role (from the server), so it doesn't matter which
// screen they used.
export function LoginForm({ title, subtitle }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const setSession = useAuth((s) => s.setSession);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { token, user } = await login(email.trim(), password);
      setSession(token, user);
      navigate(
        user.role === "STUDENT" ? "/student" : user.role === "ADMIN" ? "/admin" : "/lecturer",
        { replace: true }
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-ink-900">{title}</h1>
        <p className="text-sm text-ink-500">{subtitle}</p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg bg-fail-soft px-3 py-2 text-sm font-medium text-fail"
        >
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-ink-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          placeholder="you@school.edu"
          className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-ink-900 placeholder:text-ink-400 outline-none transition-colors focus:border-brand-500 disabled:opacity-60"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-ink-700">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          placeholder="••••••••"
          className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-ink-900 placeholder:text-ink-400 outline-none transition-colors focus:border-brand-500 disabled:opacity-60"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !email || !password}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
