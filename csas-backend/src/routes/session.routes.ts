import { Router } from "express";
import QRCode from "qrcode";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createSessionSchema } from "../schemas";
import { generateTotpSecret, currentToken, secondsUntilRotation } from "../lib/totp";

export const sessionRouter = Router();

/**
 * POST /sessions
 * Lecturer opens a class session. The geo-fence center/radius and a freshly
 * generated TOTP secret are stored here. The secret is NEVER returned.
 */
sessionRouter.post(
  "/",
  requireAuth,
  requireRole("LECTURER", "ADMIN"),
  validate(createSessionSchema),
  async (req, res) => {
    const { courseId, title, venue, startsAt, endsAt, latitude, longitude, radiusMeters } = req.body;

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ error: "Course not found" });

    // A lecturer may only open sessions for courses they teach.
    if (req.user!.role === "LECTURER" && course.lecturerId !== req.user!.id) {
      return res.status(403).json({ error: "You do not teach this course" });
    }

    const session = await prisma.classSession.create({
      data: {
        courseId,
        title,
        venue,
        startsAt,
        endsAt,
        latitude,
        longitude,
        radiusMeters,
        totpSecret: generateTotpSecret(),
      },
    });

    return res.status(201).json({
      id: session.id,
      courseId: session.courseId,
      title: session.title,
      venue: session.venue,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      latitude: session.latitude,
      longitude: session.longitude,
      radiusMeters: session.radiusMeters,
      isActive: session.isActive,
    });
  }
);

/** GET /sessions/:id — session detail (the TOTP secret is never returned). */
sessionRouter.get("/:id", requireAuth, async (req, res) => {
  const session = await prisma.classSession.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      courseId: true,
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
  if (!session) return res.status(404).json({ error: "Session not found" });
  return res.json(session);
});

/**
 * GET /sessions/:id/code
 * Returns the code valid right now plus a JSON payload the lecturer UI turns
 * into a QR. Poll this every ~10s to keep the displayed QR fresh.
 */
sessionRouter.get(
  "/:id/code",
  requireAuth,
  requireRole("LECTURER", "ADMIN"),
  async (req, res) => {
    const session = await prisma.classSession.findUnique({ where: { id: req.params.id } });
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (!session.isActive) return res.status(409).json({ error: "Session is closed" });

    const code = currentToken(session.totpSecret);
    return res.json({
      sessionId: session.id,
      code,
      expiresInSeconds: secondsUntilRotation(),
      qrPayload: JSON.stringify({ sessionId: session.id, code }),
    });
  }
);

/**
 * GET /sessions/:id/qr
 * Same as /code, but rendered to a PNG data URL so you can eyeball the actual
 * QR in a browser while testing.
 */
sessionRouter.get(
  "/:id/qr",
  requireAuth,
  requireRole("LECTURER", "ADMIN"),
  async (req, res) => {
    const session = await prisma.classSession.findUnique({ where: { id: req.params.id } });
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (!session.isActive) return res.status(409).json({ error: "Session is closed" });

    const code = currentToken(session.totpSecret);
    const payload = JSON.stringify({ sessionId: session.id, code });
    const image = await QRCode.toDataURL(payload);
    return res.json({ image, expiresInSeconds: secondsUntilRotation() });
  }
);

/** POST /sessions/:id/close — stop accepting scans for this session. */
sessionRouter.post(
  "/:id/close",
  requireAuth,
  requireRole("LECTURER", "ADMIN"),
  async (req, res) => {
    const session = await prisma.classSession.findUnique({ where: { id: req.params.id } });
    if (!session) return res.status(404).json({ error: "Session not found" });

    if (req.user!.role === "LECTURER") {
      const course = await prisma.course.findUnique({ where: { id: session.courseId } });
      if (course?.lecturerId !== req.user!.id) {
        return res.status(403).json({ error: "You do not teach this course" });
      }
    }

    await prisma.classSession.update({ where: { id: session.id }, data: { isActive: false } });
    return res.json({ id: session.id, isActive: false });
  }
);

/** GET /sessions/:id/attendance — the roster of who checked in. */
sessionRouter.get(
  "/:id/attendance",
  requireAuth,
  requireRole("LECTURER", "ADMIN"),
  async (req, res) => {
    const records = await prisma.attendanceRecord.findMany({
      where: { sessionId: req.params.id },
      orderBy: { scannedAt: "asc" },
      include: { student: { select: { id: true, fullName: true, idNumber: true } } },
    });
    return res.json(records);
  }
);
