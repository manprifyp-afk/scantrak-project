import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { login } from "../../lib/auth";
import { getApiErrorMessage } from "../../lib/api";
import { useAuth } from "../../store/auth";

const field =
  "w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-ink-900 placeholder:text-ink-400 outline-none transition-colors focus:border-brand-500 disabled:opacity-60";

export function StudentLogin() {
  const [idNumber, setIdNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const setSession = useAuth((s) => s.setSession);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const id = idNumber.trim();
    if (!id) {
      setError("Enter your student ID.");
      return;
    }
    setLoading(true);
    try {
      // For students, the password is their student ID.
      const { token, user } = await login(id, id);
      setSession(token, user);
      navigate("/student", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-ink-900">Student sign in</h1>
          <p className="text-sm text-ink-500">Sign in with your student ID to check in to classes.</p>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-fail-soft px-3 py-2 text-sm font-medium text-fail">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="idNumber" className="block text-sm font-medium text-ink-700">Student ID</label>
          <input
            id="idNumber"
            type="text"
            inputMode="text"
            autoComplete="username"
            required
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            disabled={loading}
            placeholder="e.g. 10912345"
            className={field + " font-mono"}
          />
          <p className="text-xs text-ink-400">Your password is your student ID.</p>
        </div>

        <button
          type="submit"
          disabled={loading || !idNumber}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="text-center text-sm text-ink-500">
        New here?{" "}
        <Link to="/signup/student" className="font-medium text-brand-700 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
