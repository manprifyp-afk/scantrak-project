import { Link } from "react-router-dom";
import { GraduationCap, Presentation } from "lucide-react";

// Split entry point: choose Lecturer or Student login.
export function LoginChooser() {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-ink-900">Sign in</h1>
        <p className="text-sm text-ink-500 mt-1">Choose how you're signing in.</p>
      </div>
      <div className="grid gap-3">
        <Link
          to="/login/lecturer"
          className="flex items-center gap-3 rounded-xl border border-ink-200 p-4 hover:border-brand-500 hover:bg-brand-50 transition-colors"
        >
          <Presentation className="size-5 text-brand-600" />
          <span className="font-medium text-ink-800">I'm a lecturer / admin</span>
        </Link>
        <Link
          to="/login/student"
          className="flex items-center gap-3 rounded-xl border border-ink-200 p-4 hover:border-brand-500 hover:bg-brand-50 transition-colors"
        >
          <GraduationCap className="size-5 text-brand-600" />
          <span className="font-medium text-ink-800">I'm a student</span>
        </Link>
      </div>
      <p className="text-center text-sm text-ink-500">
        New here?{" "}
        <Link to="/signup" className="font-medium text-brand-700 hover:underline">Create an account</Link>
      </p>
    </div>
  );
}
