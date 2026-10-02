import { api } from "./api";

export interface OverviewSession {
  sessionId: string;
  title: string | null;
  startsAt: string;
  courseCode: string;
  courseTitle: string;
  present: number;
  late: number;
  absent: number;
  attendanceRate: number;
}

export interface Overview {
  range: { from: string | null; to: string | null };
  sessionsHeld: number;
  totalCheckIns: number;
  uniqueStudents: number;
  flaggedAttempts: number;
  statusBreakdown: { present: number; late: number; absent: number };
  avgAttendanceRate: number;
  perSession: OverviewSession[];
}

export interface OverviewParams {
  courseId?: string;
  from?: string; // ISO date
  to?: string; // ISO date
}

// GET /reports/overview — aggregated attendance for the period (all managed
// courses if courseId is omitted).
export async function getOverview(params: OverviewParams = {}): Promise<Overview> {
  const { data } = await api.get<Overview>("/reports/overview", { params });
  return data;
}

export interface StudentRow {
  studentId: string;
  fullName: string;
  idNumber: string | null;
  present: number;
  late: number;
  attended: number;
  totalSessions: number;
  attendanceRate: number;
}

export interface StudentsReport {
  courseId: string;
  totalSessions: number;
  students: StudentRow[];
}

// GET /reports/students — per-student attendance for one course over the period.
export async function getStudentReport(
  courseId: string,
  params: { from?: string; to?: string } = {}
): Promise<StudentsReport> {
  const { data } = await api.get<StudentsReport>("/reports/students", {
    params: { courseId, ...params },
  });
  return data;
}
