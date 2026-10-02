import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { hashPassword } from "../lib/security";

export const adminRouter = Router();

// Everything here is admin-only.
adminRouter.use(requireAuth, requireRole("ADMIN"));

/** GET /admin/overview — headline counts for the admin dashboard. */
adminRouter.get("/overview", async (_req, res) => {
  const [students, lecturers, admins, courses, sessions, boundDevices] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.user.count({ where: { role: "LECTURER" } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.course.count(),
    prisma.classSession.count(),
    prisma.user.count({ where: { role: "STUDENT", deviceId: { not: null } } }),
  ]);
  return res.json({ students, lecturers, admins, courses, sessions, boundDevices });
});

/** GET /admin/users — every user, with device-binding + enrolment/teaching counts. */
adminRouter.get("/users", async (req, res) => {
  const role = typeof req.query.role === "string" ? req.query.role.toUpperCase() : undefined;
  const users = await prisma.user.findMany({
    where: role === "STUDENT" || role === "LECTURER" || role === "ADMIN" ? { role } : undefined,
    orderBy: [{ role: "asc" }, { fullName: "asc" }],
    select: {
      id: true,
      fullName: true,
      email: true,
      idNumber: true,
      role: true,
      deviceId: true,
      createdAt: true,
      _count: { select: { enrollments: true, coursesTaught: true } },
    },
  });
  return res.json(
    users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      idNumber: u.idNumber,
      role: u.role,
      deviceBound: Boolean(u.deviceId),
      enrolledCount: u._count.enrollments,
      teachingCount: u._count.coursesTaught,
      createdAt: u.createdAt,
    }))
  );
});

/**
 * POST /admin/users/:id/reset-device — clear a student's device binding so they
 * can sign in on a new phone (e.g. lost/replaced device).
 */
adminRouter.post("/users/:id/reset-device", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: "User not found" });
  await prisma.user.update({ where: { id: user.id }, data: { deviceId: null } });
  return res.json({ id: user.id, deviceBound: false });
});

/** GET /admin/courses — all courses with lecturer, join code, and counts. */
adminRouter.get("/courses", async (_req, res) => {
  const courses = await prisma.course.findMany({
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      title: true,
      joinCode: true,
      programme: true,
      level: true,
      lecturer: { select: { fullName: true } },
      _count: { select: { enrollments: true, sessions: true } },
    },
  });
  return res.json(
    courses.map((c) => ({
      id: c.id,
      code: c.code,
      title: c.title,
      joinCode: c.joinCode,
      programme: c.programme,
      level: c.level,
      lecturer: c.lecturer?.fullName ?? "—",
      students: c._count.enrollments,
      sessions: c._count.sessions,
    }))
  );
});

// ---------------------------------------------------------------------------
// User management
// ---------------------------------------------------------------------------

/** POST /admin/users — create a lecturer, admin, or student. */
adminRouter.post("/users", async (req, res) => {
  const fullName = String(req.body.fullName ?? "").trim();
  const role = String(req.body.role ?? "").toUpperCase();
  if (!fullName) return res.status(400).json({ error: "Full name is required" });
  if (!["STUDENT", "LECTURER", "ADMIN"].includes(role)) {
    return res.status(400).json({ error: "Role must be STUDENT, LECTURER or ADMIN" });
  }

  try {
    if (role === "STUDENT") {
      const idNumber = String(req.body.idNumber ?? "").trim();
      if (!idNumber) return res.status(400).json({ error: "Student ID is required" });
      const email =
        String(req.body.email ?? "").trim() ||
        `${idNumber.toLowerCase().replace(/[^a-z0-9]/g, "")}@student.scantrak`;
      const password = String(req.body.password ?? "") || idNumber; // default: ID
      const user = await prisma.user.create({
        data: { fullName, role: "STUDENT", idNumber, email, passwordHash: await hashPassword(password) },
      });
      return res.status(201).json({ id: user.id });
    }

    // Lecturer / admin
    const email = String(req.body.email ?? "").trim();
    const password = String(req.body.password ?? "");
    if (!email) return res.status(400).json({ error: "Email is required" });
    if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
    const user = await prisma.user.create({
      data: { fullName, role: role as "LECTURER" | "ADMIN", email, passwordHash: await hashPassword(password) },
    });
    return res.status(201).json({ id: user.id });
  } catch (e: unknown) {
    const err = e as { code?: string; meta?: { target?: string[] } };
    if (err.code === "P2002") {
      const field = err.meta?.target?.[0] === "idNumber" ? "student ID" : "email";
      return res.status(409).json({ error: `That ${field} is already registered` });
    }
    throw e;
  }
});

/** PATCH /admin/users/:id — edit name, email, student ID, or role. */
adminRouter.patch("/users/:id", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: "User not found" });

  const data: Record<string, unknown> = {};
  if (typeof req.body.fullName === "string" && req.body.fullName.trim()) data.fullName = req.body.fullName.trim();
  if (typeof req.body.email === "string" && req.body.email.trim()) data.email = req.body.email.trim();
  if (typeof req.body.idNumber === "string") data.idNumber = req.body.idNumber.trim() || null;
  if (typeof req.body.role === "string" && ["STUDENT", "LECTURER", "ADMIN"].includes(req.body.role.toUpperCase())) {
    const newRole = req.body.role.toUpperCase();
    // Don't allow demoting the last admin.
    if (user.role === "ADMIN" && newRole !== "ADMIN") {
      const admins = await prisma.user.count({ where: { role: "ADMIN" } });
      if (admins <= 1) return res.status(400).json({ error: "Can't change the role of the last admin" });
    }
    data.role = newRole;
  }

  try {
    await prisma.user.update({ where: { id: user.id }, data });
    return res.json({ id: user.id });
  } catch (e: unknown) {
    const err = e as { code?: string; meta?: { target?: string[] } };
    if (err.code === "P2002") {
      const field = err.meta?.target?.[0] === "idNumber" ? "student ID" : "email";
      return res.status(409).json({ error: `That ${field} is already in use` });
    }
    throw e;
  }
});

/** DELETE /admin/users/:id — with guards for self, last admin, and course-owning lecturers. */
adminRouter.delete("/users/:id", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { coursesTaught: true } } },
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.id === req.user!.id) return res.status(400).json({ error: "You can't delete your own account" });

  if (user.role === "ADMIN") {
    const admins = await prisma.user.count({ where: { role: "ADMIN" } });
    if (admins <= 1) return res.status(400).json({ error: "Can't delete the last admin" });
  }
  if (user.role === "LECTURER" && user._count.coursesTaught > 0) {
    return res.status(400).json({
      error: "This lecturer still owns courses. Reassign or delete those courses first.",
    });
  }

  // Students cascade (enrollments, attendance, scan attempts) via the schema.
  await prisma.user.delete({ where: { id: user.id } });
  return res.json({ id: user.id, deleted: true });
});

// ---------------------------------------------------------------------------
// Course management
// ---------------------------------------------------------------------------

/** PATCH /admin/courses/:id — edit fields and/or reassign the lecturer. */
adminRouter.patch("/courses/:id", async (req, res) => {
  const course = await prisma.course.findUnique({ where: { id: req.params.id } });
  if (!course) return res.status(404).json({ error: "Course not found" });

  const data: Record<string, unknown> = {};
  if (typeof req.body.code === "string" && req.body.code.trim()) data.code = req.body.code.trim();
  if (typeof req.body.title === "string" && req.body.title.trim()) data.title = req.body.title.trim();
  if (typeof req.body.programme === "string") data.programme = req.body.programme.trim() || null;
  if (req.body.level === null || typeof req.body.level === "number") data.level = req.body.level;
  if (["FIRST", "SECOND"].includes(req.body.semester)) data.semester = req.body.semester;
  if (["REGULAR", "WEEKEND", "EVENING"].includes(req.body.stream)) data.stream = req.body.stream;
  if (req.body.creditHours === null || typeof req.body.creditHours === "number") data.creditHours = req.body.creditHours;

  if (typeof req.body.lecturerId === "string" && req.body.lecturerId) {
    const lect = await prisma.user.findUnique({ where: { id: req.body.lecturerId } });
    if (!lect || (lect.role !== "LECTURER" && lect.role !== "ADMIN")) {
      return res.status(400).json({ error: "Chosen lecturer is not valid" });
    }
    data.lecturerId = req.body.lecturerId;
  }

  try {
    await prisma.course.update({ where: { id: course.id }, data });
    return res.json({ id: course.id });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "P2002") return res.status(409).json({ error: "That course code is already in use" });
    throw e;
  }
});

/** DELETE /admin/courses/:id — cascades sessions, enrolments, and attendance. */
adminRouter.delete("/courses/:id", async (req, res) => {
  const course = await prisma.course.findUnique({ where: { id: req.params.id } });
  if (!course) return res.status(404).json({ error: "Course not found" });
  await prisma.course.delete({ where: { id: course.id } });
  return res.json({ id: course.id, deleted: true });
});

// ---------------------------------------------------------------------------
// Fraud / flagged scan attempts
// ---------------------------------------------------------------------------

/** GET /admin/scan-attempts — recent attempts (rejected by default) for review. */
adminRouter.get("/scan-attempts", async (req, res) => {
  const outcome = String(req.query.outcome ?? "REJECTED").toUpperCase();
  const where = outcome === "ALL" ? {} : { outcome: outcome === "ACCEPTED" ? "ACCEPTED" : "REJECTED" } as const;

  const attempts = await prisma.scanAttempt.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      outcome: true,
      reason: true,
      distanceMeters: true,
      deviceId: true,
      createdAt: true,
      student: { select: { fullName: true, idNumber: true } },
      session: { select: { title: true, course: { select: { code: true } } } },
    },
  });

  return res.json(
    attempts.map((a) => ({
      id: a.id,
      outcome: a.outcome,
      reason: a.reason,
      distanceMeters: a.distanceMeters,
      deviceId: a.deviceId,
      createdAt: a.createdAt,
      studentName: a.student?.fullName ?? "—",
      studentId: a.student?.idNumber ?? null,
      courseCode: a.session?.course?.code ?? "—",
      sessionTitle: a.session?.title ?? null,
    }))
  );
});

// ---------------------------------------------------------------------------
// Institution-wide analytics
// ---------------------------------------------------------------------------

const PASS_MARK = 75;

/** GET /admin/analytics — attendance across the whole institution. */
adminRouter.get("/analytics", async (_req, res) => {
  const [courses, enrollments, sessions, records] = await Promise.all([
    prisma.course.findMany({ select: { id: true, code: true, title: true, programme: true } }),
    prisma.enrollment.findMany({
      select: { courseId: true, studentId: true, student: { select: { fullName: true, idNumber: true } } },
    }),
    prisma.classSession.findMany({ select: { id: true, courseId: true, isActive: true } }),
    prisma.attendanceRecord.findMany({
      where: { status: { in: ["PRESENT", "LATE"] } },
      select: { studentId: true, sessionId: true },
    }),
  ]);

  const sessionCourse = new Map(sessions.map((s) => [s.id, s.courseId]));
  const heldByCourse = new Map<string, number>();
  for (const s of sessions) heldByCourse.set(s.courseId, (heldByCourse.get(s.courseId) ?? 0) + 1);

  const attByStudentCourse = new Map<string, number>();
  for (const r of records) {
    const cid = sessionCourse.get(r.sessionId);
    if (!cid) continue;
    const key = `${r.studentId}:${cid}`;
    attByStudentCourse.set(key, (attByStudentCourse.get(key) ?? 0) + 1);
  }

  const courseMeta = new Map(courses.map((c) => [c.id, c]));
  const enrolledByCourse = new Map<string, number>();
  for (const e of enrollments) enrolledByCourse.set(e.courseId, (enrolledByCourse.get(e.courseId) ?? 0) + 1);

  // Per-course rate = attended check-ins / (sessions held × enrolled students)
  const perCourse = courses.map((c) => {
    const held = heldByCourse.get(c.id) ?? 0;
    const enrolled = enrolledByCourse.get(c.id) ?? 0;
    let attended = 0;
    for (const e of enrollments) {
      if (e.courseId !== c.id) continue;
      attended += attByStudentCourse.get(`${e.studentId}:${c.id}`) ?? 0;
    }
    const possible = held * enrolled;
    return {
      id: c.id,
      code: c.code,
      title: c.title,
      programme: c.programme,
      sessions: held,
      students: enrolled,
      rate: possible ? Math.round((attended / possible) * 100) : 0,
    };
  });

  // At-risk students (per enrolment, below the pass mark, where sessions exist)
  const atRisk: Array<{ studentName: string; idNumber: string | null; courseCode: string; rate: number; attended: number; held: number }> = [];
  for (const e of enrollments) {
    const held = heldByCourse.get(e.courseId) ?? 0;
    if (held === 0) continue;
    const attended = attByStudentCourse.get(`${e.studentId}:${e.courseId}`) ?? 0;
    const rate = Math.round((attended / held) * 100);
    if (rate < PASS_MARK) {
      atRisk.push({
        studentName: e.student.fullName,
        idNumber: e.student.idNumber,
        courseCode: courseMeta.get(e.courseId)?.code ?? "—",
        rate,
        attended,
        held,
      });
    }
  }
  atRisk.sort((a, b) => a.rate - b.rate);

  // Per-programme rollup
  const progAgg = new Map<string, { attended: number; possible: number }>();
  for (const c of perCourse) {
    const prog = c.programme ?? "Unspecified";
    const held = c.sessions;
    const enrolled = c.students;
    const possible = held * enrolled;
    const attended = Math.round((c.rate / 100) * possible);
    const cur = progAgg.get(prog) ?? { attended: 0, possible: 0 };
    cur.attended += attended;
    cur.possible += possible;
    progAgg.set(prog, cur);
  }
  const perProgramme = [...progAgg.entries()].map(([programme, v]) => ({
    programme,
    rate: v.possible ? Math.round((v.attended / v.possible) * 100) : 0,
  }));

  const totalPossible = perCourse.reduce((s, c) => s + c.sessions * c.students, 0);
  const totalAttended = perCourse.reduce((s, c) => s + Math.round((c.rate / 100) * c.sessions * c.students), 0);

  return res.json({
    overall: {
      rate: totalPossible ? Math.round((totalAttended / totalPossible) * 100) : 0,
      atRiskCount: atRisk.length,
      activeSessions: sessions.filter((s) => s.isActive).length,
      totalStudents: new Set(enrollments.map((e) => e.studentId)).size,
      totalCourses: courses.length,
    },
    perCourse: perCourse.sort((a, b) => b.rate - a.rate),
    perProgramme: perProgramme.sort((a, b) => b.rate - a.rate),
    atRisk: atRisk.slice(0, 100),
  });
});

// ---------------------------------------------------------------------------
// All-sessions oversight
// ---------------------------------------------------------------------------

/** GET /admin/sessions — every session across all lecturers. */
adminRouter.get("/sessions", async (_req, res) => {
  const sessions = await prisma.classSession.findMany({
    orderBy: [{ isActive: "desc" }, { startsAt: "desc" }],
    take: 200,
    select: {
      id: true,
      title: true,
      venue: true,
      startsAt: true,
      isActive: true,
      course: { select: { code: true, lecturer: { select: { fullName: true } } } },
      _count: { select: { attendanceRecords: true } },
    },
  });
  return res.json(
    sessions.map((s) => ({
      id: s.id,
      title: s.title,
      venue: s.venue,
      startsAt: s.startsAt,
      isActive: s.isActive,
      courseCode: s.course.code,
      lecturer: s.course.lecturer?.fullName ?? "—",
      checkIns: s._count.attendanceRecords,
    }))
  );
});

/** POST /admin/sessions/:id/close — force-close a stuck live session. */
adminRouter.post("/sessions/:id/close", async (req, res) => {
  const session = await prisma.classSession.findUnique({ where: { id: req.params.id } });
  if (!session) return res.status(404).json({ error: "Session not found" });
  await prisma.classSession.update({ where: { id: session.id }, data: { isActive: false } });
  return res.json({ id: session.id, isActive: false });
});

// ---------------------------------------------------------------------------
// Password reset + course roster management
// ---------------------------------------------------------------------------

/** POST /admin/users/:id/reset-password — set a new password (students default to their ID). */
adminRouter.post("/users/:id/reset-password", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: "User not found" });
  let password = String(req.body.password ?? "");
  if (!password) {
    if (user.role === "STUDENT" && user.idNumber) password = user.idNumber;
    else return res.status(400).json({ error: "A new password is required" });
  }
  if (password.length < 4) return res.status(400).json({ error: "Password is too short" });
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
  return res.json({ id: user.id, reset: true });
});

/** GET /admin/courses/:id/roster — enrolled students + their attendance in this course. */
adminRouter.get("/courses/:id/roster", async (req, res) => {
  const course = await prisma.course.findUnique({
    where: { id: req.params.id },
    select: { id: true, code: true, title: true },
  });
  if (!course) return res.status(404).json({ error: "Course not found" });

  const [held, enrollments, records] = await Promise.all([
    prisma.classSession.count({ where: { courseId: course.id } }),
    prisma.enrollment.findMany({
      where: { courseId: course.id },
      select: { student: { select: { id: true, fullName: true, idNumber: true } } },
    }),
    prisma.attendanceRecord.findMany({
      where: { status: { in: ["PRESENT", "LATE"] }, session: { courseId: course.id } },
      select: { studentId: true },
    }),
  ]);
  const attByStudent = new Map<string, number>();
  for (const r of records) attByStudent.set(r.studentId, (attByStudent.get(r.studentId) ?? 0) + 1);

  const students = enrollments.map((e) => {
    const attended = attByStudent.get(e.student.id) ?? 0;
    return {
      id: e.student.id,
      fullName: e.student.fullName,
      idNumber: e.student.idNumber,
      attended,
      held,
      rate: held ? Math.round((attended / held) * 100) : 0,
    };
  });
  students.sort((a, b) => a.fullName.localeCompare(b.fullName));
  return res.json({ course, held, students });
});

/** POST /admin/courses/:id/enroll — add a student to a course by student ID. */
adminRouter.post("/courses/:id/enroll", async (req, res) => {
  const course = await prisma.course.findUnique({ where: { id: req.params.id } });
  if (!course) return res.status(404).json({ error: "Course not found" });
  const idNumber = String(req.body.idNumber ?? "").trim();
  if (!idNumber) return res.status(400).json({ error: "Student ID is required" });
  const student = await prisma.user.findUnique({ where: { idNumber } });
  if (!student || student.role !== "STUDENT") {
    return res.status(404).json({ error: "No student found with that ID" });
  }
  await prisma.enrollment.upsert({
    where: { studentId_courseId: { studentId: student.id, courseId: course.id } },
    update: {},
    create: { studentId: student.id, courseId: course.id },
  });
  return res.json({ studentId: student.id, fullName: student.fullName });
});

/** DELETE /admin/courses/:id/enroll/:studentId — remove a student from a course. */
adminRouter.delete("/courses/:id/enroll/:studentId", async (req, res) => {
  await prisma.enrollment.deleteMany({
    where: { courseId: req.params.id, studentId: req.params.studentId },
  });
  return res.json({ removed: true });
});
