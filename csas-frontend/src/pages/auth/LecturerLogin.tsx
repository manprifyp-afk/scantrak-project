import { Link } from "react-router-dom";
import { LoginForm } from "../../components/LoginForm";

export function LecturerLogin() {
  return (
    <div className="space-y-4">
      <LoginForm
        title="Lecturer sign in"
        subtitle="Access your courses and start live sessions."
      />
      <p className="text-center text-sm text-ink-500">
        New here?{" "}
        <Link to="/signup/lecturer" className="font-medium text-brand-700 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
