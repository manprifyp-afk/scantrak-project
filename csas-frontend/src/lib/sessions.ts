import { api } from "./api";
import { listCourses } from "./courses";

export interface Session {
  id: string;
  courseId: string;
  title: string | null;
  venue: string | null;
  startsAt: string;
  endsAt: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
}

export interface CreateSessionInput {
  courseId: string;
  title?: string;
  startsAt: string; // ISO
  endsAt: string; // ISO
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface CurrentCode {
  sessionId: string;
  code: string;
  expiresInSeconds: number;
  qrPayload: string;
}

export async function createSession(input: CreateSessionInput): Promise<Session> {
  const { data } = await api.post<Session>("/sessions", input);
  return data;
}

export async function getCurrentCode(sessionId: string): Promise<CurrentCode> {
  const { data } = await api.get<CurrentCode>(`/sessions/${sessionId}/code`);
  return data;
}

export async function getQrImage(
  sessionId: string
): Promise<{ image: string; expiresInSeconds: number }> {
  const { data } = await api.get<{ image: string; expiresInSeconds: number }>(
    `/sessions/${sessionId}/qr`
  );
  return data;
}

export async function closeSession(sessionId: string): Promise<void> {
  await api.post(`/sessions/${sessionId}/close`);
}

export interface LecturerSession extends Session {
  courseCode: string;
  courseTitle: string;
}

// Every session across the courses this lecturer manages, newest first.
export async function getAllSessions(): Promise<LecturerSession[]> {
  const courses = await listCourses();
  const groups = await Promise.all(
    courses.map(async (c) => {
      const { data } = await api.get<Session[]>(`/courses/${c.id}/sessions`);
      return data.map((s) => ({
        ...s,
        courseId: c.id,
        courseCode: c.code,
        courseTitle: c.title,
      }));
    })
  );
  return groups.flat().sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt));
}
