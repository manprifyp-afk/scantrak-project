import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../store/auth";
import type { Role } from "../types";

// Wraps routes that require a logged-in user with one of the allowed roles.
// Not logged in -> sent to login. Wrong role -> sent to their own home.
export function ProtectedRoute({ allow }: { allow: Role[] }) {
  const { token, user } = useAuth();

  if (!token || !user) return <Navigate to="/login" replace />;

  if (!allow.includes(user.role)) {
    return <Navigate to={user.role === "STUDENT" ? "/student" : "/lecturer"} replace />;
  }

  return <Outlet />;
}
