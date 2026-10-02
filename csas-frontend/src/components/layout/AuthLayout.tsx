import { Navigate, Outlet } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../../store/auth";

// Centered shell for the login screens. If already signed in, skip login and
// go straight to the right home.
export function AuthLayout() {
  const { token, user } = useAuth();
  if (token && user) {
    return <Navigate to={user.role === "STUDENT" ? "/student" : "/lecturer"} replace />;
  }

  return (
    <div className="min-h-dvh grid place-items-center px-4 bg-ink-900">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-6">
          <ShieldCheck className="size-6 text-brand-300" />
          <span className="font-display font-semibold text-lg text-white">ScanTrak</span>
        </div>
        <div className="bg-surface rounded-2xl shadow-xl p-6">
          <Outlet />
        </div>
        <p className="text-center text-xs text-ink-400 mt-6">
          Smart classroom attendance
        </p>
      </div>
    </div>
  );
}
