import { Router, type Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { scanLimiter } from "../middleware/rateLimit";
import { scanSchema } from "../schemas";
import { verifyToken } from "../lib/totp";
import { isInsideFence } from "../lib/geo";
import { config } from "../config";

export const attendanceRouter = Router();

type ScanContext = {
  sessionId: string;
  studentId: string;
  latitude: number;
  longitude: number;
  distanceMeters?: number;
  deviceId: string;
};

// Log a rejected attempt to the audit table, then return the 403 response.
async function reject(
  res: Response,
  ctx: ScanContext,
  reason: string,
  message: string,
  extra: object = {}
) {
  await prisma.scanAttempt.create({
    data: {
      sessionId: ctx.sessionId,
      studentId: ctx.studentId,
      outcome: "REJECTED",
      reason,
      capturedLat: ctx.latitude,
      capturedLng: ctx.longitude,
      distanceMeters: ctx.distanceMeters,
      deviceId: ctx.deviceId,
    },
  });
  return res.status(403).json({ error: message, reason, ...extra });
}

/**
 * POST /attendance/scan   (students only)
 * Body: { sessionId, code, latitude, longitude, deviceId }
 *
 * The core validation pipeline. A scan must clear THREE gates, in order —
 * cheapest and most common failure first — before attendance is recorded.
 * Every attempt (accepted or rejected) is logged to ScanAttempt.
 */
attendanceRouter.post(
  "/scan",
  scanLimiter,
  requireAuth,
  requireRole("STUDENT"),
  validate(scanSchema),
  async (req, res) => {
    const studentId = req.user!.id;
    const { sessionId, code, latitude, longitude, deviceId } = req.body;
    const ctx: ScanContext = { sessionId, studentId, latitude, longitude, deviceId };

    // --- Preconditions: the session must exist and be open right now ---
    const session = await prisma.classSession.findUnique({ where: { id: sessionId } });
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (!session.isActive) return res.status(409).json({ error: "Session is closed" });

    const now = new Date();
    if (now < session.startsAt || now > session.endsAt) {
      return res.status(409).json({ error: "Session is not currently running" });
    }

    // The student must be enrolled in the course this session belongs to.
    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId: session.courseId } },
    });
    if (!enrollment) {
      return res.status(403).json({ error: "You are not enrolled in this course" });
    }

    // One check-in per student per session.
    const already = await prisma.attendanceRecord.findUnique({
      where: { sessionId_studentId: { sessionId, studentId } },
    });
    if (already) {
      return res
        .status(409)
        .json({ error: "Attendance already recorded for this session", status: already.status });
    }

    // ===== GATE 1: TOTP — is the scanned code live? ============================
    if (!verifyToken(code, session.totpSecret)) {
      return reject(res, ctx, "EXPIRED_OR_INVALID_CODE", "The QR code has expired or is invalid");
    }

    // ===== GATE 2: GEO-FENCE — is the student physically present? =============
    const { inside, distanceMeters } = isInsideFence(
      { lat: latitude, lng: longitude },
      { lat: session.latitude, lng: session.longitude },
      session.radiusMeters
    );
    ctx.distanceMeters = distanceMeters;
    if (!inside) {
      return reject(
        res,
        ctx,
        "OUTSIDE_FENCE",
        `You appear to be ~${Math.round(distanceMeters)}m away; you must be within ${session.radiusMeters}m`,
        { distanceMeters: Math.round(distanceMeters) }
      );
    }

    // ===== GATE 3: DEVICE BINDING — is this the student's own phone? ==========
    const user = await prisma.user.findUnique({ where: { id: studentId } });
    if (!user?.deviceId || user.deviceId !== deviceId) {
      return reject(
        res,
        ctx,
        "DEVICE_MISMATCH",
        "This scan came from a device that is not bound to your account"
      );
    }

    // ===== All gates passed — record attendance + log the accepted attempt ====
    const graceMs = config.LATE_GRACE_MINUTES * 60_000;
    const status = now.getTime() > session.startsAt.getTime() + graceMs ? "LATE" : "PRESENT";

    const record = await prisma.attendanceRecord.create({
      data: {
        sessionId,
        studentId,
        status,
        capturedLat: latitude,
        capturedLng: longitude,
        distanceMeters,
        deviceId,
      },
    });

    await prisma.scanAttempt.create({
      data: {
        sessionId,
        studentId,
        outcome: "ACCEPTED",
        capturedLat: latitude,
        capturedLng: longitude,
        distanceMeters,
        deviceId,
      },
    });

    return res.status(201).json({
      status: record.status,
      recordedAt: record.scannedAt,
      distanceMeters: Math.round(distanceMeters),
    });
  }
);

/** GET /attendance/me  (student) — this student's own attendance records. */
attendanceRouter.get("/me", requireAuth, requireRole("STUDENT"), async (req, res) => {
  const records = await prisma.attendanceRecord.findMany({
    where: { studentId: req.user!.id },
    orderBy: { scannedAt: "desc" },
    include: {
      session: {
        select: { id: true, title: true, startsAt: true, course: { select: { code: true, title: true } } },
      },
    },
  });
  return res.json(records);
});

/**
 * GET /attendance/summary  (student)
 * True attendance for the logged-in student: overall rate, per-course rates
 * (attended vs sessions actually held), and a full session timeline that
 * includes MISSED classes (absent), not just the ones they scanned.
 */
attendanceRouter.get("/summary", requireAuth, requireRole("STUDENT"), async (req, res) => {
  const studentId = req.user!.id;

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    include: { course: { select: { id: true, code: true, title: true, creditHours: true } } },
  });
  const courseIds = enrollments.map((e) => e.courseId);

  const sessions = courseIds.length
    ? await prisma.classSession.findMany({
        where: { courseId: { in: courseIds } },
        orderBy: { startsAt: "desc" },
        select: {
          id: true,
          title: true,
          startsAt: true,
          course: { select: { id: true, code: true, title: true } },
        },
      })
    : [];

  const records = courseIds.length
    ? await prisma.attendanceRecord.findMany({
        where: { studentId, session: { courseId: { in: courseIds } } },
        select: { sessionId: true, status: true },
      })
    : [];
  const statusBySession = new Map(records.map((r) => [r.sessionId, r.status]));

  // Per-course tally
  const perCourse = new Map<string, { present: number; late: number; held: number }>();
  for (const s of sessions) {
    const cur = perCourse.get(s.course.id) ?? { present: 0, late: 0, held: 0 };
    cur.held += 1;
    const st = statusBySession.get(s.id);
    if (st === "PRESENT") cur.present += 1;
    else if (st === "LATE") cur.late += 1;
    perCourse.set(s.course.id, cur);
  }

  let totalAttended = 0;
  let totalHeld = 0;
  const courses = enrollments.map((e) => {
    const t = perCourse.get(e.courseId) ?? { present: 0, late: 0, held: 0 };
    const attended = t.present + t.late;
    totalAttended += attended;
    totalHeld += t.held;
    return {
      courseId: e.courseId,
      code: e.course.code,
      title: e.course.title,
      creditHours: e.course.creditHours,
      present: t.present,
      late: t.late,
      attended,
      totalSessions: t.held,
      absent: Math.max(t.held - attended, 0),
      rate: t.held ? Math.round((attended / t.held) * 100) : 0,
    };
  });

  const timeline = sessions.map((s) => ({
    sessionId: s.id,
    title: s.title,
    startsAt: s.startsAt,
    courseCode: s.course.code,
    courseTitle: s.course.title,
    status: statusBySession.get(s.id) ?? "ABSENT",
  }));

  return res.json({
    overall: {
      attended: totalAttended,
      totalSessions: totalHeld,
      rate: totalHeld ? Math.round((totalAttended / totalHeld) * 100) : 0,
    },
    courses,
    timeline,
  });
});
