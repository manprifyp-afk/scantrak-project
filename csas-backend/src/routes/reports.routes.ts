import { Router, type Request } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

export const reportRouter = Router();

async function assertManages(courseId: string, userId: string, role: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return { ok: false as const, status: 404, error: "Course not found" };
  if (role !== "ADMIN" && course.lecturerId !== userId) {
    return { ok: false as const, status: 403, error: "You do not manage this course" };
  }
  return { ok: true as const, course };
}

/**
 * GET /reports/courses/:courseId/summary  (ADMIN or owning LECTURER)
 * Per-session attendance counts plus a per-student total across all sessions.
 */
reportRouter.get(
  "/courses/:courseId/summary",
  requireAuth,
  requireRole("ADMIN", "LECTURER"),
  async (req, res) => {
    const guard = await assertManages(req.params.courseId, req.user!.id, req.user!.role);
    if (!guard.ok) return res.status(guard.status).json({ error: guard.error });

    const sessions = await prisma.classSession.findMany({
      where: { courseId: req.params.courseId },
      orderBy: { startsAt: "asc" },
      include: { attendanceRecords: true },
    });

    const totalEnrolled = await prisma.enrollment.count({
      where: { courseId: req.params.courseId },
    });

    const perSession = sessions.map((s) => {
      const present = s.attendanceRecords.filter((r) => r.status === "PRESENT").length;
      const late = s.attendanceRecords.filter((r) => r.status === "LATE").length;
      const attended = present + late;
      return {
        sessionId: s.id,
        title: s.title,
        startsAt: s.startsAt,
        present,
        late,
        attended,
        absent: Math.max(totalEnrolled - attended, 0),
        attendanceRate: totalEnrolled ? Math.round((attended / totalEnrolled) * 100) : 0,
      };
    });

    return res.json({ courseId: req.params.courseId, totalEnrolled, sessions: perSession });
  }
);

/**
 * GET /reports/sessions/:sessionId/attempts  (ADMIN or owning LECTURER)
 * Every scan attempt for a session — accepted and rejected — as a fraud signal.
 * Optional ?outcome=REJECTED filter.
 */
reportRouter.get(
  "/sessions/:sessionId/attempts",
  requireAuth,
  requireRole("ADMIN", "LECTURER"),
  async (req, res) => {
    const session = await prisma.classSession.findUnique({
      where: { id: req.params.sessionId },
    });
    if (!session) return res.status(404).json({ error: "Session not found" });

    const guard = await assertManages(session.courseId, req.user!.id, req.user!.role);
    if (!guard.ok) return res.status(guard.status).json({ error: guard.error });

    const outcome = req.query.outcome === "REJECTED" || req.query.outcome === "ACCEPTED"
      ? req.query.outcome
      : undefined;

    const attempts = await prisma.scanAttempt.findMany({
      where: { sessionId: req.params.sessionId, ...(outcome ? { outcome } : {}) },
      orderBy: { createdAt: "desc" },
      include: { student: { select: { id: true, fullName: true, idNumber: true } } },
    });
    return res.json(attempts);
  }
);

// --- Helpers for the analytics endpoints -----------------------------------

/** Course ids this user is allowed to report on (all for ADMIN, owned for LECTURER). */
async function managedCourseIds(userId: string, role: string): Promise<string[]> {
  const courses = await prisma.course.findMany({
    where: role === "ADMIN" ? {} : { lecturerId: userId },
    select: { id: true },
  });
  return courses.map((c) => c.id);
}

/** Parse optional ?from= & ?to= ISO dates into a Prisma date filter (or undefined). */
function parseRange(req: Request): { gte?: Date; lte?: Date } | undefined {
  const toDate = (v: unknown) => {
    if (!v) return undefined;
    const d = new Date(String(v));
    return isNaN(d.getTime()) ? undefined : d;
  };
  const gte = toDate(req.query.from);
  const lte = toDate(req.query.to);
  if (!gte && !lte) return undefined;
  return { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
}

/**
 * GET /reports/overview?courseId=&from=&to=   (ADMIN or owning LECTURER)
 * Aggregated attendance for a period: totals, per-session counts, status
 * breakdown and flagged attempts. Powers the Reports page and dashboard cards.
 * Omit courseId to span every course the user manages.
 */
reportRouter.get(
  "/overview",
  requireAuth,
  requireRole("ADMIN", "LECTURER"),
  async (req, res) => {
    const managed = await managedCourseIds(req.user!.id, req.user!.role);

    let courseIds = managed;
    if (req.query.courseId) {
      const wanted = String(req.query.courseId);
      if (!managed.includes(wanted)) {
        return res.status(403).json({ error: "You do not manage this course" });
      }
      courseIds = [wanted];
    }

    const startsAt = parseRange(req);
    const empty = {
      range: { from: startsAt?.gte ?? null, to: startsAt?.lte ?? null },
      sessionsHeld: 0,
      totalCheckIns: 0,
      uniqueStudents: 0,
      flaggedAttempts: 0,
      statusBreakdown: { present: 0, late: 0, absent: 0 },
      avgAttendanceRate: 0,
      perSession: [] as unknown[],
    };
    if (courseIds.length === 0) return res.json(empty);

    const sessions = await prisma.classSession.findMany({
      where: { courseId: { in: courseIds }, ...(startsAt ? { startsAt } : {}) },
      orderBy: { startsAt: "asc" },
      include: {
        attendanceRecords: { select: { studentId: true, status: true } },
        course: { select: { id: true, code: true, title: true } },
      },
    });

    const enroll = await prisma.enrollment.groupBy({
      by: ["courseId"],
      where: { courseId: { in: courseIds } },
      _count: { _all: true },
    });
    const enrolledBy = new Map(enroll.map((e) => [e.courseId, e._count._all]));

    let totalPresent = 0;
    let totalLate = 0;
    let totalAbsent = 0;
    let sumEnrolled = 0;
    const students = new Set<string>();

    const perSession = sessions.map((s) => {
      let present = 0;
      let late = 0;
      for (const r of s.attendanceRecords) {
        if (r.status === "PRESENT") present++;
        else if (r.status === "LATE") late++;
        students.add(r.studentId);
      }
      const enrolled = enrolledBy.get(s.courseId) ?? 0;
      const attended = present + late;
      const absent = Math.max(enrolled - attended, 0);
      totalPresent += present;
      totalLate += late;
      totalAbsent += absent;
      sumEnrolled += enrolled;
      return {
        sessionId: s.id,
        title: s.title,
        startsAt: s.startsAt,
        courseCode: s.course.code,
        courseTitle: s.course.title,
        present,
        late,
        absent,
        attendanceRate: enrolled ? Math.round((attended / enrolled) * 100) : 0,
      };
    });

    const totalCheckIns = totalPresent + totalLate;

    const flaggedAttempts = await prisma.scanAttempt.count({
      where: {
        outcome: "REJECTED",
        session: { courseId: { in: courseIds }, ...(startsAt ? { startsAt } : {}) },
      },
    });

    return res.json({
      range: { from: startsAt?.gte ?? null, to: startsAt?.lte ?? null },
      sessionsHeld: sessions.length,
      totalCheckIns,
      uniqueStudents: students.size,
      flaggedAttempts,
      statusBreakdown: { present: totalPresent, late: totalLate, absent: totalAbsent },
      avgAttendanceRate: sumEnrolled ? Math.round((totalCheckIns / sumEnrolled) * 100) : 0,
      perSession,
    });
  }
);

/**
 * GET /reports/students?courseId=&from=&to=   (ADMIN or owning LECTURER)
 * Per-student attendance for a course over the period: how many of the
 * sessions each enrolled student attended, sorted lowest-rate first so
 * students who are falling behind surface at the top.
 */
reportRouter.get(
  "/students",
  requireAuth,
  requireRole("ADMIN", "LECTURER"),
  async (req, res) => {
    if (!req.query.courseId) {
      return res.status(400).json({ error: "courseId is required" });
    }
    const courseId = String(req.query.courseId);

    const managed = await managedCourseIds(req.user!.id, req.user!.role);
    if (!managed.includes(courseId)) {
      return res.status(403).json({ error: "You do not manage this course" });
    }

    const startsAt = parseRange(req);

    const sessions = await prisma.classSession.findMany({
      where: { courseId, ...(startsAt ? { startsAt } : {}) },
      select: { id: true },
    });
    const sessionIds = sessions.map((s) => s.id);
    const totalSessions = sessionIds.length;

    const enrollments = await prisma.enrollment.findMany({
      where: { courseId },
      include: { student: { select: { id: true, fullName: true, idNumber: true } } },
    });

    const records = sessionIds.length
      ? await prisma.attendanceRecord.findMany({
          where: { sessionId: { in: sessionIds }, status: { in: ["PRESENT", "LATE"] } },
          select: { studentId: true, status: true },
        })
      : [];

    const tally = new Map<string, { present: number; late: number }>();
    for (const r of records) {
      const e = tally.get(r.studentId) ?? { present: 0, late: 0 };
      if (r.status === "PRESENT") e.present++;
      else e.late++;
      tally.set(r.studentId, e);
    }

    const students = enrollments
      .map((en) => {
        const a = tally.get(en.studentId) ?? { present: 0, late: 0 };
        const attended = a.present + a.late;
        return {
          studentId: en.student.id,
          fullName: en.student.fullName,
          idNumber: en.student.idNumber,
          present: a.present,
          late: a.late,
          attended,
          totalSessions,
          attendanceRate: totalSessions ? Math.round((attended / totalSessions) * 100) : 0,
        };
      })
      .sort((x, y) => x.attendanceRate - y.attendanceRate);

    return res.json({ courseId, totalSessions, students });
  }
);
