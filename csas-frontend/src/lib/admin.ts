import { api } from "./api";

export interface AdminOverview {
  students: number;
  lecturers: number;
  admins: number;
  courses: number;
  sessions: number;
  boundDevices: number;
}

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  idNumber: string | null;
  role: "STUDENT" | "LECTURER" | "ADMIN";
  deviceBound: boolean;
  enrolledCount: number;
  teachingCount: number;
  createdAt: string;
}

export interface AdminCourse {
  id: string;
  code: string;
  title: string;
  joinCode: string | null;
  programme: string | null;
  level: number | null;
  lecturer: string;
  students: number;
  sessions: number;
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const { data } = await api.get<AdminOverview>("/admin/overview");
  return data;
}

export async function getAdminUsers(role?: string): Promise<AdminUser[]> {
  const { data } = await api.get<AdminUser[]>("/admin/users", {
    params: role ? { role } : undefined,
  });
  return data;
}

export async function resetDevice(userId: string): Promise<void> {
  await api.post(`/admin/users/${userId}/reset-device`, {});
}

export async function getAdminCourses(): Promise<AdminCourse[]> {
  const { data } = await api.get<AdminCourse[]>("/admin/courses");
  return data;
}

// ---- User writes ----
export interface CreateUserInput {
  fullName: string;
  role: "STUDENT" | "LECTURER" | "ADMIN";
  email?: string;
  idNumber?: string;
  password?: string;
}
export async function createUser(input: CreateUserInput): Promise<void> {
  await api.post("/admin/users", input);
}
export interface UpdateUserInput {
  fullName?: string;
  email?: string;
  idNumber?: string;
  role?: "STUDENT" | "LECTURER" | "ADMIN";
}
export async function updateUser(id: string, input: UpdateUserInput): Promise<void> {
  await api.patch(`/admin/users/${id}`, input);
}
export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/admin/users/${id}`);
}

// ---- Course writes ----
export interface UpdateCourseInput {
  code?: string;
  title?: string;
  programme?: string | null;
  level?: number | null;
  semester?: "FIRST" | "SECOND";
  stream?: "REGULAR" | "WEEKEND" | "EVENING";
  creditHours?: number | null;
  lecturerId?: string;
}
export async function updateCourse(id: string, input: UpdateCourseInput): Promise<void> {
  await api.patch(`/admin/courses/${id}`, input);
}
export async function deleteCourse(id: string): Promise<void> {
  await api.delete(`/admin/courses/${id}`);
}

// ---- Scan attempts (flags) ----
export interface ScanAttempt {
  id: string;
  outcome: "ACCEPTED" | "REJECTED";
  reason: string | null;
  distanceMeters: number | null;
  deviceId: string | null;
  createdAt: string;
  studentName: string;
  studentId: string | null;
  courseCode: string;
  sessionTitle: string | null;
}
export async function getScanAttempts(outcome = "REJECTED"): Promise<ScanAttempt[]> {
  const { data } = await api.get<ScanAttempt[]>("/admin/scan-attempts", { params: { outcome } });
  return data;
}

// ---- Analytics ----
export interface AdminAnalytics {
  overall: { rate: number; atRiskCount: number; activeSessions: number; totalStudents: number; totalCourses: number };
  perCourse: Array<{ id: string; code: string; title: string; programme: string | null; sessions: number; students: number; rate: number }>;
  perProgramme: Array<{ programme: string; rate: number }>;
  atRisk: Array<{ studentName: string; idNumber: string | null; courseCode: string; rate: number; attended: number; held: number }>;
}
export async function getAnalytics(): Promise<AdminAnalytics> {
  const { data } = await api.get<AdminAnalytics>("/admin/analytics");
  return data;
}

// ---- Sessions oversight ----
export interface AdminSession {
  id: string;
  title: string | null;
  venue: string | null;
  startsAt: string;
  isActive: boolean;
  courseCode: string;
  lecturer: string;
  checkIns: number;
}
export async function getAllSessions(): Promise<AdminSession[]> {
  const { data } = await api.get<AdminSession[]>("/admin/sessions");
  return data;
}
export async function closeSession(id: string): Promise<void> {
  await api.post(`/admin/sessions/${id}/close`, {});
}

// ---- Password reset ----
export async function resetPassword(userId: string, password?: string): Promise<void> {
  await api.post(`/admin/users/${userId}/reset-password`, password ? { password } : {});
}

// ---- Roster ----
export interface RosterStudent {
  id: string;
  fullName: string;
  idNumber: string | null;
  attended: number;
  held: number;
  rate: number;
}
export interface Roster {
  course: { id: string; code: string; title: string };
  held: number;
  students: RosterStudent[];
}
export async function getRoster(courseId: string): Promise<Roster> {
  const { data } = await api.get<Roster>(`/admin/courses/${courseId}/roster`);
  return data;
}
export async function enrollStudent(courseId: string, idNumber: string): Promise<void> {
  await api.post(`/admin/courses/${courseId}/enroll`, { idNumber });
}
export async function unenrollStudent(courseId: string, studentId: string): Promise<void> {
  await api.delete(`/admin/courses/${courseId}/enroll/${studentId}`);
}
