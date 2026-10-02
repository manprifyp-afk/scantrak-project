import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1),
  role: z.enum(["STUDENT", "LECTURER", "ADMIN"]).default("STUDENT"),
  idNumber: z.string().optional(),
});

export const loginSchema = z.object({
  identifier: z.string().min(1), // email (lecturer/admin) or student ID (student)
  password: z.string().min(1),
  // Required so we can enforce one-account-one-device binding at login.
  deviceId: z.string().min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

// Public student self-registration. Role is forced to STUDENT server-side, so
// this endpoint can never mint a lecturer/admin account.
export const signupSchema = z.object({
  fullName: z.string().min(1),
  idNumber: z.string().min(1), // student ID — also becomes their password
  courseCode: z.string().min(1),
});

export const joinCourseSchema = z.object({
  courseCode: z.string().min(1),
});

export const lecturerSignupSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

export const createSessionSchema = z
  .object({
    courseId: z.string().min(1),
    title: z.string().optional(),
    venue: z.string().optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    radiusMeters: z.number().int().positive().max(1000).default(50),
  })
  .refine((d) => d.endsAt > d.startsAt, {
    message: "endsAt must be after startsAt",
    path: ["endsAt"],
  });

export const scanSchema = z.object({
  sessionId: z.string().min(1),
  code: z.string().min(4),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  deviceId: z.string().min(1),
});

export const createCourseSchema = z.object({
  code: z.string().min(2),
  title: z.string().min(1),
  // Academic context for the offering.
  programme: z.string().optional(),
  level: z.number().int().min(100).max(900).optional(),
  semester: z.enum(["FIRST", "SECOND"]).optional(),
  stream: z.enum(["REGULAR", "WEEKEND", "EVENING"]).default("REGULAR"),
  creditHours: z.number().int().min(1).max(12).optional(),
  // Admins may assign any lecturer; lecturers omit this and become the owner.
  lecturerId: z.string().optional(),
});

export const enrollSchema = z
  .object({
    studentId: z.string().optional(),
    idNumber: z.string().optional(),
  })
  .refine((d) => d.studentId || d.idNumber, {
    message: "Provide either studentId or idNumber",
  });
