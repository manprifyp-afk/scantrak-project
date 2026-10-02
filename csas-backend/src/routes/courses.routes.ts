import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createCourseSchema, enrollSchema, joinCourseSchema } from "../schemas";
import { uniqueJoinCode } from "../lib/codes";

export const courseRouter = Router();

/**
 * POST /courses/join  (STUDENT)
 * Self-enrol in a course by its code — used both at signup and for the in-app
 * "Join a class" action. Idempotent: joining a course you're already in is fine.
 */
courseRouter.post(
  "/join",
  requireAuth,
  requireRole("STUDENT"),
  validate(joinCourseSchema),
  async (req, res) => {
    const course = await prisma.course.findFirst({
      where: { joinCode: { equals: String(req.body.courseCode).trim(), mode: "insensitive" } },
    });
    if (!course) {
      return res.status(404).json({ error: "Class code not found. Check the code with your lecturer." });
    }
    await prisma.enrollment.upsert({
      where: { studentId_courseId: { studentId: req.user!.id, courseId: course.id } },
      update: {},
      create: { studentId: req.user!.id, courseId: course.id },
    });
    return res.json({ course: { id: course.id, code: course.code, title: course.title } });
  }
);

/**
 * POST /courses/:id/regenerate-code  (owning LECTURER or ADMIN)
 * Rotates the class join code — e.g. after sharing it too widely.
 */
courseRouter.post(
  "/:id/regenerate-code",
  requireAuth,
  requireRole("ADMIN", "LECTURER"),
  async (req, res) => {
    const course = await prisma.course.findUnique({ where: { id: req.params.id } });
    if (!course) return res.status(404).json({ error: "Course not found" });
    if (req.user!.role !== "ADMIN" && course.lecturerId !== req.user!.id) {
      return res.status(403).json({ error: "You do not manage this course" });
    }
    const joinCode = await uniqueJoinCode();
    const updated = await prisma.course.update({ where: { id: course.id }, data: { joinCode } });
    return res.json({ joinCode: updated.joinCode });
  }
);

// Helper: does this user own (teach) or administer this course?
async function canManageCourse(courseId: string, userId: string, role: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return { course: null, allowed: false };
  const allowed = role === "ADMIN" || course.lecturerId === userId;
  return { course, allowed };
}

/**
 * POST /courses  (ADMIN or LECTURER)
 * Admins may assign any lecturer via lecturerId; a lecturer becomes the owner.
 */
courseRouter.post(
  "/",
  requireAuth,
  requireRole("ADMIN", "LECTURER"),
  validate(createCourseSchema),
  async (req, res) => {
    const { code, title, programme, level, semester, stream, creditHours } = req.body;
    let lecturerId = req.body.lecturerId as string | undefined;

    if (req.user!.role === "LECTURER") {
      lecturerId = req.user!.id; // lecturers can only create their own courses
    }
    if (!lecturerId) {
      return res.status(400).json({ error: "lecturerId is required when an admin creates a course" });
    }

    const lecturer = await prisma.user.findUnique({ where: { id: lecturerId } });
    if (!lecturer || lecturer.role !== "LECTURER") {
      return res.status(400).json({ error: "lecturerId must refer to a LECTURER" });
    }

    const joinCode = await uniqueJoinCode();
    const course = await prisma.course.create({
      data: { code, title, lecturerId, programme, level, semester, stream, creditHours, joinCode },
    });
    return res.status(201).json(course);
  }
);

/**
 * GET /courses  — role-scoped:
 *   ADMIN    -> all courses
 *   LECTURER -> courses they teach
 *   STUDENT  -> courses they're enrolled in
 */
courseRouter.get("/", requireAuth, async (req, res) => {
  const { id, role } = req.user!;

  if (role === "ADMIN") {
    return res.json(await prisma.course.findMany({ orderBy: { code: "asc" } }));
  }
  if (role === "LECTURER") {
    return res.json(
      await prisma.course.findMany({ where: { lecturerId: id }, orderBy: { code: "asc" } })
    );
  }
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: id },
    include: { course: true },
  });
  return res.json(enrollments.map((e) => e.course));
});

/** GET /courses/:id — details with lecturer and enrollment count. */
courseRouter.get("/:id", requireAuth, async (req, res) => {
  const course = await prisma.course.findUnique({
    where: { id: req.params.id },
    include: {
      lecturer: { select: { id: true, fullName: true, email: true } },
      _count: { select: { enrollments: true, sessions: true } },
    },
  });
  if (!course) return res.status(404).json({ error: "Course not found" });
  return res.json(course);
});

/** GET /courses/:id/sessions — sessions for a course (no secrets returned). */
courseRouter.get("/:id/sessions", requireAuth, async (req, res) => {
  const sessions = await prisma.classSession.findMany({
    where: { courseId: req.params.id },
    orderBy: { startsAt: "desc" },
    select: {
      id: true,
      title: true,
      venue: true,
      startsAt: true,
      endsAt: true,
      isActive: true,
      latitude: true,
      longitude: true,
      radiusMeters: true,
    },
  });
  return res.json(sessions);
});

/**
 * POST /courses/:id/enroll  (ADMIN or owning LECTURER)
 * Enroll a student by studentId or by their idNumber (matric number).
 */
courseRouter.post(
  "/:id/enroll",
  requireAuth,
  requireRole("ADMIN", "LECTURER"),
  validate(enrollSchema),
  async (req, res) => {
    const { allowed, course } = await canManageCourse(req.params.id, req.user!.id, req.user!.role);
    if (!course) return res.status(404).json({ error: "Course not found" });
    if (!allowed) return res.status(403).json({ error: "You do not manage this course" });

    const { studentId, idNumber } = req.body;
    const student = await prisma.user.findFirst({
      where: studentId ? { id: studentId } : { idNumber },
    });
    if (!student || student.role !== "STUDENT") {
      return res.status(404).json({ error: "Student not found" });
    }

    const enrollment = await prisma.enrollment.upsert({
      where: { studentId_courseId: { studentId: student.id, courseId: course.id } },
      update: {},
      create: { studentId: student.id, courseId: course.id },
    });
    return res.status(201).json(enrollment);
  }
);

/** GET /courses/:id/roster  (ADMIN or owning LECTURER) — enrolled students. */
courseRouter.get(
  "/:id/roster",
  requireAuth,
  requireRole("ADMIN", "LECTURER"),
  async (req, res) => {
    const { allowed, course } = await canManageCourse(req.params.id, req.user!.id, req.user!.role);
    if (!course) return res.status(404).json({ error: "Course not found" });
    if (!allowed) return res.status(403).json({ error: "You do not manage this course" });

    const enrollments = await prisma.enrollment.findMany({
      where: { courseId: course.id },
      include: { student: { select: { id: true, fullName: true, idNumber: true, email: true } } },
      orderBy: { enrolledAt: "asc" },
    });
    return res.json(enrollments.map((e) => e.student));
  }
);
