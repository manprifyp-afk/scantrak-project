import { Router } from "express";
import { prisma } from "../lib/prisma";
import { hashPassword, comparePassword, signJwt, verifyJwt } from "../lib/security";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { loginLimiter } from "../middleware/rateLimit";
import { registerSchema, loginSchema, changePasswordSchema, signupSchema, lecturerSignupSchema } from "../schemas";

export const authRouter = Router();

/**
 * POST /auth/register
 * Bootstrapping: if there are NO users yet, the first call creates an ADMIN
 * (the provided role is ignored) with no auth required, so a fresh install can
 * be set up. After that, only an ADMIN can create users.
 */
authRouter.post("/register", validate(registerSchema), async (req, res) => {
  const { email, password, fullName, idNumber } = req.body;
  let { role } = req.body;

  const userCount = await prisma.user.count();

  if (userCount === 0) {
    role = "ADMIN"; // force the very first account to be an admin
  } else {
    // Require a valid admin token for all subsequent user creation.
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "An admin token is required to create users" });
    }
    try {
      const payload = verifyJwt(header.slice(7));
      if (payload.role !== "ADMIN") {
        return res.status(403).json({ error: "Only admins can create users" });
      }
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const user = await prisma.user.create({
    data: { email, passwordHash: await hashPassword(password), fullName, role, idNumber },
  });

  return res.status(201).json({
    id: user.id,
    email: user.email,
    role: user.role,
    ...(userCount === 0 ? { bootstrap: true } : {}),
  });
});

/**
 * POST /auth/signup  (PUBLIC)
 * Self-service student registration. Unlike /register, this needs no admin
 * token, but it ALWAYS creates a STUDENT — the role can't be overridden by the
 * caller. (To tighten later: validate idNumber against an enrolled roster, or
 * gate signups behind a per-institution code.)
 */
authRouter.post("/signup", validate(signupSchema), async (req, res) => {
  const { fullName, idNumber, courseCode } = req.body;
  const studentId = idNumber.trim();

  // Students join by class join code — validate it before creating anything.
  const course = await prisma.course.findFirst({
    where: { joinCode: { equals: courseCode.trim(), mode: "insensitive" } },
  });
  if (!course) {
    return res
      .status(400)
      .json({ error: "Class code not found. Check the code with your lecturer." });
  }

  const idTaken = await prisma.user.findUnique({ where: { idNumber: studentId } });
  if (idTaken) return res.status(409).json({ error: "That student ID is already registered" });

  // Student ID is the login identity; we synthesise an internal email to satisfy
  // the unique-email constraint, and the password IS the student ID.
  const email = `${studentId.toLowerCase().replace(/[^a-z0-9]/g, "")}@student.scantrak`;
  const emailTaken = await prisma.user.findUnique({ where: { email } });
  if (emailTaken) return res.status(409).json({ error: "That student ID is already registered" });

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(studentId), // password == student ID
      fullName,
      role: "STUDENT",
      idNumber: studentId,
    },
  });

  await prisma.enrollment.create({
    data: { studentId: user.id, courseId: course.id },
  });

  return res.status(201).json({ id: user.id, idNumber: user.idNumber, role: user.role });
});

/**
 * POST /auth/signup-lecturer  (PUBLIC)
 * Self-service lecturer registration. Always creates a LECTURER. Tighten later
 * behind an institution invite code if open sign-up isn't desired.
 */
authRouter.post("/signup-lecturer", validate(lecturerSignupSchema), async (req, res) => {
  const { fullName, email, password } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      fullName,
      role: "LECTURER",
    },
  });

  return res.status(201).json({ id: user.id, email: user.email, role: user.role });
});

/**
 * POST /auth/login
 * Verifies credentials and, for students, enforces device binding:
 *   - first successful login binds the account to the device
 *   - later logins must come from that same device
 * Returns a JWT used as a Bearer token on every other endpoint.
 */
authRouter.post("/login", loginLimiter, validate(loginSchema), async (req, res) => {
  const { identifier, password, deviceId } = req.body;

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { idNumber: identifier }] },
  });
  if (!user || !(await comparePassword(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (user.role === "STUDENT") {
    if (user.deviceId === null) {
      const taken = await prisma.user.findUnique({ where: { deviceId } });
      if (taken) {
        return res.status(409).json({ error: "This device is already bound to another account" });
      }
      await prisma.user.update({ where: { id: user.id }, data: { deviceId } });
    } else if (user.deviceId !== deviceId) {
      return res.status(403).json({ error: "This account is locked to a different device" });
    }
  }

  const token = signJwt({ sub: user.id, role: user.role });
  return res.json({
    token,
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
  });
});

/** GET /auth/me — the currently authenticated user's profile. */
authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, fullName: true, role: true, idNumber: true, deviceId: true },
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json(user);
});

/**
 * POST /auth/change-password
 * The signed-in user changes their own password after confirming the current one.
 */
authRouter.post(
  "/change-password",
  requireAuth,
  validate(changePasswordSchema),
  async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!(await comparePassword(currentPassword, user.passwordHash))) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    return res.json({ ok: true });
  }
);
