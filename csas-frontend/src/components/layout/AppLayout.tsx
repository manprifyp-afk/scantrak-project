import { NavLink, Outlet } from "react-router-dom";
import { ShieldCheck, QrCode, ClipboardList, Settings } from "lucide-react";
import { useAuth } from "../../store/auth";

const tab =
  "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors";

function tabClass({ isActive }: { isActive: boolean }) {
  return tab + (isActive ? " text-brand-700" : " text-ink-400 hover:text-ink-600");
}

// Student shell: slim top bar + page content + a bottom tab bar (phone-first).
export function AppLayout() {
  const user = useAuth((s) => s.user);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-ink-200 bg-sidebar">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <div className="flex items-center gap-2 text-brand-600">
            <ShieldCheck className="size-5" />
            <span className="font-display font-semibold text-ink-900">ScanTrak</span>
          </div>
          <span className="truncate text-sm text-ink-500">{user?.fullName}</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 pb-24">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl">
          <NavLink to="/student" end className={tabClass}>
            <QrCode className="size-5" /> Check in
          </NavLink>
          <NavLink to="/student/attendance" className={tabClass}>
            <ClipboardList className="size-5" /> Attendance
          </NavLink>
          <NavLink to="/student/settings" className={tabClass}>
            <Settings className="size-5" /> Settings
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
