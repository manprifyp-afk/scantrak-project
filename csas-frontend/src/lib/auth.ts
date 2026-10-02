import { api } from "./api";
import { getDeviceId } from "./device";
import type { User } from "../types";

interface LoginResponse {
  token: string;
  user: User;
}

export interface MeResponse extends User {
  idNumber?: string | null;
  deviceId?: string | null;
}

// GET /auth/me — the signed-in user's profile, including their student ID.
export async function getMe(): Promise<MeResponse> {
  const { data } = await api.get<MeResponse>("/auth/me");
  return data;
}

// POST /auth/login — identifier is an email (lecturer/admin) or a student ID
// (student). The backend requires deviceId on every login; a student's first
// login binds the device, later ones must match.
export async function login(identifier: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/auth/login", {
    identifier,
    password,
    deviceId: getDeviceId(),
  });
  return data;
}

// POST /auth/change-password — confirm the current password, then set a new one.
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await api.post("/auth/change-password", { currentPassword, newPassword });
}

export interface SignupInput {
  fullName: string;
  idNumber: string; // student ID (also becomes the password)
  courseCode: string;
}

// POST /auth/signup — public student registration. Creates a STUDENT (password
// = student ID) and enrols them in the course code they entered.
export async function signupStudent(input: SignupInput): Promise<void> {
  await api.post("/auth/signup", input);
}

// POST /courses/join — student self-enrols in another class by course code.
export async function joinCourse(courseCode: string): Promise<{ code: string; title: string }> {
  const { data } = await api.post<{ course: { code: string; title: string } }>("/courses/join", {
    courseCode,
  });
  return data.course;
}

export interface LecturerSignupInput {
  fullName: string;
  email: string;
  password: string;
}

// POST /auth/signup-lecturer — public lecturer registration. Always LECTURER.
export async function signupLecturer(input: LecturerSignupInput): Promise<void> {
  await api.post("/auth/signup-lecturer", input);
}
