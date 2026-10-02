import { Routes, Route, Navigate } from "react-router-dom";
import { AuthLayout } from "./components/layout/AuthLayout";
import { AppLayout } from "./components/layout/AppLayout";
import { LecturerLayout } from "./components/layout/LecturerLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginChooser } from "./pages/auth/LoginChooser";
import { LecturerLogin } from "./pages/auth/LecturerLogin";
import { StudentLogin } from "./pages/auth/StudentLogin";
import { StudentSignup } from "./pages/auth/Signup";
import { LecturerSignup } from "./pages/auth/LecturerSignup";
import { SignupChooser } from "./pages/auth/SignupChooser";
import { LecturerDashboard } from "./pages/lecturer/Dashboard";
import { SessionControl } from "./pages/lecturer/SessionControl";
import { AttendanceTracker } from "./pages/lecturer/AttendanceTracker";
import { Reports } from "./pages/lecturer/Reports";
import { Sessions } from "./pages/lecturer/Sessions";
import { Courses } from "./pages/lecturer/Courses";
import { Settings } from "./pages/lecturer/Settings";
import { StudentCheckIn } from "./pages/student/CheckIn";
import { StudentAttendance } from "./pages/student/Attendance";
import { StudentSettings } from "./pages/student/Settings";
import { StudentCourseDetail } from "./pages/student/CourseDetail";
import { AdminLayout } from "./components/layout/AdminLayout";
import { AdminOverview } from "./pages/admin/Overview";
import { AdminUsers } from "./pages/admin/AdminUsers";
import { AdminCourses } from "./pages/admin/AdminCourses";
import { AdminSessions } from "./pages/admin/AdminSessions";
import { AdminFlags } from "./pages/admin/AdminFlags";
import { NotFound } from "./pages/NotFound";

// App route map. Guards, layouts, and role redirects are real; student pages and
// the lecturer session/tracker are still being built out step by step.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public: split login screens under the centered auth shell */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginChooser />} />
        <Route path="/login/lecturer" element={<LecturerLogin />} />
        <Route path="/login/student" element={<StudentLogin />} />
        <Route path="/signup" element={<SignupChooser />} />
        <Route path="/signup/student" element={<StudentSignup />} />
        <Route path="/signup/lecturer" element={<LecturerSignup />} />
      </Route>

      {/* Lecturer / admin area */}
      <Route element={<ProtectedRoute allow={["LECTURER", "ADMIN"]} />}>
        <Route element={<LecturerLayout />}>
          <Route path="/lecturer" element={<LecturerDashboard />} />
          <Route path="/lecturer/reports" element={<Reports />} />
          <Route path="/lecturer/sessions" element={<Sessions />} />
          <Route path="/lecturer/courses" element={<Courses />} />
          <Route path="/lecturer/settings" element={<Settings />} />
          <Route
            path="/lecturer/courses/:courseId/session"
            element={<SessionControl />}
          />
          <Route
            path="/lecturer/sessions/:sessionId/attendance"
            element={<AttendanceTracker />}
          />
        </Route>
      </Route>

      {/* Student area */}
      <Route element={<ProtectedRoute allow={["STUDENT"]} />}>
        <Route element={<AppLayout />}>
          <Route path="/student" element={<StudentCheckIn />} />
          <Route path="/student/attendance" element={<StudentAttendance />} />
          <Route path="/student/courses/:code" element={<StudentCourseDetail />} />
          <Route path="/student/settings" element={<StudentSettings />} />
        </Route>
      </Route>

      {/* Admin area */}
      <Route element={<ProtectedRoute allow={["ADMIN"]} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminOverview />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/courses" element={<AdminCourses />} />
          <Route path="/admin/sessions" element={<AdminSessions />} />
          <Route path="/admin/flags" element={<AdminFlags />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
