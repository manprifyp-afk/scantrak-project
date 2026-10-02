import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Check, LayoutDashboard, BarChart3, BookOpen, Radio, Settings, LogOut } from "lucide-react";
import { useAuth } from "../../store/auth";

function initials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

function Brandmark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-7 items-center justify-center rounded-lg bg-brand-600 text-white">
        <Check className="size-4" strokeWidth={3} />
      </span>
      <span className="font-display text-lg font-bold text-ink-900">ScanTrak</span>
    </div>
  );
}

const navBase =
  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors";
const navClass = ({ isActive }: { isActive: boolean }) =>
  navBase +
  (isActive
    ? " bg-brand-50 text-brand-700"
    : " text-ink-600 hover:bg-ink-100 hover:text-ink-900");

// Shell for the lecturer / admin area: light sand sidebar + page content.
export function LecturerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-dvh flex-col bg-canvas md:flex-row">
      {/* Mobile top bar */}
      <div className="flex h-14 items-center justify-between border-b border-ink-200 bg-sidebar px-4 md:hidden">
        <Brandmark />
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900"
        >
          <LogOut className="size-4" /> Sign out
        </button>
      </div>

      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-200 bg-sidebar p-4 md:flex">
        <div className="px-2 pb-4 pt-1">
          <Brandmark />
        </div>

        <nav className="flex flex-col gap-1">
          <NavLink to="/lecturer" end className={navClass}>
            <LayoutDashboard className="size-[18px]" /> Dashboard
          </NavLink>
          <NavLink to="/lecturer/courses" className={navClass}>
            <BookOpen className="size-[18px]" /> Courses
          </NavLink>
          <NavLink to="/lecturer/sessions" className={navClass}>
            <Radio className="size-[18px]" /> Sessions
          </NavLink>
          <NavLink to="/lecturer/reports" className={navClass}>
            <BarChart3 className="size-[18px]" /> Reports
          </NavLink>
          <NavLink to="/lecturer/settings" className={navClass}>
            <Settings className="size-[18px]" /> Settings
          </NavLink>
        </nav>

        <div className="mt-auto space-y-2">
          <div className="flex items-center gap-3 rounded-xl bg-ink-100 p-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
              {initials(user?.fullName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-ink-900">{user?.fullName}</p>
              <p className="font-mono text-[11px] capitalize text-ink-500">
                {user?.role.toLowerCase()}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
          >
            <LogOut className="size-[18px]" /> Sign out
          </button>
        </div>
      </aside>

      {/* Page content */}
      <main className="min-w-0 flex-1 px-5 py-7 md:px-10 md:py-9">
        <Outlet />
      </main>
    </div>
  );
}
