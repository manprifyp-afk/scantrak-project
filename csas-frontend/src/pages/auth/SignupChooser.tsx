import { Link } from "react-router-dom";
import { GraduationCap, Presentation } from "lucide-react";

// Split entry point: choose Lecturer or Student sign-up.
export function SignupChooser() {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-ink-900">Create an account</h1>
        <p className="mt-1 text-sm text-ink-500">Choose the kind of account you need.</p>
      </div>
      <div className="grid gap-3">
        <Link
          to="/signup/student"
          className="flex items-center gap-3 rounded-xl border border-ink-200 p-4 transition-colors hover:border-brand-500 hover:bg-brand-50"
        >
          <GraduationCap className="size-5 text-brand-600" />
          <span>
            <span className="block font-medium text-ink-800">I'm a student</span>
            <span className="block text-xs text-ink-500">Join a class with a course code</span>
          </span>
        </Link>
        <Link
          to="/signup/lecturer"
          className="flex items-center gap-3 rounded-xl border border-ink-200 p-4 transition-colors hover:border-brand-500 hover:bg-brand-50"
        >
          <Presentation className="size-5 text-brand-600" />
          <span>
            <span className="block font-medium text-ink-800">I'm a lecturer</span>
            <span className="block text-xs text-ink-500">Create courses and run sessions</span>
          </span>
        </Link>
      </div>
      <p className="text-center text-sm text-ink-500">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-brand-700 hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
