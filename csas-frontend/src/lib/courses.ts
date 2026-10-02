import { api } from "./api";

export interface Course {
  id: string;
  code: string;
  title: string;
  lecturerId: string;
  programme?: string | null;
  level?: number | null;
  semester?: "FIRST" | "SECOND" | null;
  stream?: "REGULAR" | "WEEKEND" | "EVENING";
  creditHours?: number | null;
  joinCode?: string | null;
  createdAt: string;
  updatedAt: string;
}

// GET /courses — role-scoped by the backend (a lecturer gets the courses they teach).
export async function listCourses(): Promise<Course[]> {
  const { data } = await api.get<Course[]>("/courses");
  return data;
}

export interface CreateCourseInput {
  code: string;
  title: string;
  programme?: string;
  level?: number;
  semester?: "FIRST" | "SECOND";
  stream?: "REGULAR" | "WEEKEND" | "EVENING";
  creditHours?: number;
}

// POST /courses — a lecturer automatically becomes the owner (no lecturerId needed).
export async function createCourse(input: CreateCourseInput): Promise<Course> {
  const { data } = await api.post<Course>("/courses", input);
  return data;
}

// POST /courses/:id/regenerate-code — rotate a course's class join code.
export async function regenerateJoinCode(courseId: string): Promise<string> {
  const { data } = await api.post<{ joinCode: string }>(`/courses/${courseId}/regenerate-code`, {});
  return data.joinCode;
}
