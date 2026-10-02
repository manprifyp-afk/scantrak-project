import { api } from "./api";

export interface StudentBrief {
  id: string;
  fullName: string;
  idNumber: string | null;
}

export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "REJECTED";

export interface AttendanceRecord {
  id: string;
  status: AttendanceStatus;
  distanceMeters: number | null;
  scannedAt: string;
  student: StudentBrief;
}

export type ScanOutcome = "ACCEPTED" | "REJECTED";

export interface ScanAttempt {
  id: string;
  outcome: ScanOutcome;
  reason: string | null;
  distanceMeters: number | null;
  createdAt: string;
  student: StudentBrief;
}

// Who has successfully checked in.
export async function getAttendance(sessionId: string): Promise<AttendanceRecord[]> {
  const { data } = await api.get<AttendanceRecord[]>(`/sessions/${sessionId}/attendance`);
  return data;
}

// The fraud feed: rejected scan attempts (out of zone, wrong device, bad code).
export async function getRejectedAttempts(sessionId: string): Promise<ScanAttempt[]> {
  const { data } = await api.get<ScanAttempt[]>(`/reports/sessions/${sessionId}/attempts`, {
    params: { outcome: "REJECTED" },
  });
  return data;
}

// ---- Student's own attendance history (GET /attendance/me) ----
export interface MyAttendanceRecord {
  id: string;
  status: AttendanceStatus;
  distanceMeters: number | null;
  scannedAt: string;
  session: {
    id: string;
    title: string | null;
    startsAt: string;
    course: { code: string; title: string };
  };
}

export async function getMyAttendance(): Promise<MyAttendanceRecord[]> {
  const { data } = await api.get<MyAttendanceRecord[]>("/attendance/me");
  return data;
}

// ---- Student's true attendance summary (GET /attendance/summary) ----
export interface CourseAttendance {
  courseId: string;
  code: string;
  title: string;
  creditHours: number | null;
  present: number;
  late: number;
  attended: number;
  totalSessions: number;
  absent: number;
  rate: number; // attended / sessions actually held
}

export interface TimelineEntry {
  sessionId: string;
  title: string | null;
  startsAt: string;
  courseCode: string;
  courseTitle: string;
  status: AttendanceStatus; // PRESENT | LATE | ABSENT
}

export interface AttendanceSummary {
  overall: { attended: number; totalSessions: number; rate: number };
  courses: CourseAttendance[];
  timeline: TimelineEntry[];
}

export async function getAttendanceSummary(): Promise<AttendanceSummary> {
  const { data } = await api.get<AttendanceSummary>("/attendance/summary");
  return data;
}
