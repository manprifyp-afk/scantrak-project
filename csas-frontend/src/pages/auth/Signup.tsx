import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Info } from "lucide-react";
import { signupStudent, login } from "../../lib/auth";
import { getApiErrorMessage } from "../../lib/api";
import { useAuth } from "../../store/auth";

const field =
  "w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-ink-900 placeholder:text-ink-400 outline-none transition-colors focus:border-brand-500 disabled:opacity-60";

export function StudentSignup() {
  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const setSession = useAuth((s) => s.setSession);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const id = idNumber.trim();
    if (!id) {
      setError("Your student ID is required.");
      return;
    }
    setLoading(true);
    try {
      await signupStudent({ fullName: fullName.trim(), idNumber: id, courseCode: courseCode.trim() });
      // Password is the student ID; log straight in (binds this device).
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
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-ink-900">Create your student account</h1>
        <p className="text-sm text-ink-500">Join your class and start checking in.</p>
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
          placeholder="Ama Mensah" className={field} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="idNumber" className="block text-sm font-medium text-ink-700">Student ID</label>
        <input id="idNumber" type="text" required value={idNumber}
          onChange={(e) => setIdNumber(e.target.value)} disabled={loading}
          placeholder="e.g. 10912345" className={field + " font-mono"} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="courseCode" className="block text-sm font-medium text-ink-700">Class code</label>
        <input id="courseCode" type="text" required value={courseCode}
          onChange={(e) => setCourseCode(e.target.value.toUpperCase())} disabled={loading}
          placeholder="e.g. K7QM2P" className={field + " font-mono uppercase tracking-wide"} />
        <p className="text-xs text-ink-400">The class code your lecturer shared — it enrols you in that class.</p>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2.5 text-xs text-brand-800">
        <Info className="mt-0.5 size-4 shrink-0 text-brand-600" />
        <span>Your <b>password is your Student ID</b>. Keep it private — your account locks to the first device you sign in on.</span>
      </div>

      <button type="submit" disabled={loading || !fullName || !idNumber || !courseCode}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">
        {loading && <Loader2 className="size-4 animate-spin" />}
        {loading ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-sm text-ink-500">
        Already have an account?{" "}
        <Link to="/login/student" className="font-medium text-brand-700 hover:underline">Sign in</Link>
      </p>
    </form>
  );
}
