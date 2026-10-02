// Run with:  npm run seed
// Creates a small, predictable dataset so you can exercise every endpoint
// immediately. Safe to run repeatedly (upserts by email/code).

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/security";
import { generateTotpSecret, currentToken } from "../src/lib/totp";

const PASSWORD = "Password123";

// Geo-fence center for the demo session (central Accra). Move this to wherever
// you want to test from, or just feed matching coordinates to /attendance/scan.
const CENTER = { lat: 5.6037, lng: -0.187 };

async function main() {
  const passwordHash = await hashPassword(PASSWORD);

  const admin = await prisma.user.upsert({
    where: { email: "admin@csas.test" },
    update: {},
    create: { email: "admin@csas.test", passwordHash, fullName: "Ada Admin", role: "ADMIN" },
  });

  const lecturer = await prisma.user.upsert({
    where: { email: "lecturer@csas.test" },
    update: {},
    create: {
      email: "lecturer@csas.test",
      passwordHash,
      fullName: "Lana Lecturer",
      role: "LECTURER",
      idNumber: "STAFF-001",
    },
  });

  const student = await prisma.user.upsert({
    where: { email: "student@csas.test" },
    update: {},
    create: {
      email: "student@csas.test",
      passwordHash,
      fullName: "Sam Student",
      role: "STUDENT",
      idNumber: "MAT-1001",
    },
  });

  const course = await prisma.course.upsert({
    where: { code: "CS101" },
    update: {
      programme: "BSc Computer Science",
      level: 100,
      semester: "FIRST",
      stream: "REGULAR",
      creditHours: 3,
      joinCode: "CS101JN",
    },
    create: {
      code: "CS101",
      title: "Intro to Computer Science",
      lecturerId: lecturer.id,
      programme: "BSc Computer Science",
      level: 100,
      semester: "FIRST",
      stream: "REGULAR",
      creditHours: 3,
      joinCode: "CS101JN",
    },
  });

  await prisma.enrollment.upsert({
    where: { studentId_courseId: { studentId: student.id, courseId: course.id } },
    update: {},
    create: { studentId: student.id, courseId: course.id },
  });

  // An active session: started an hour ago, ends in two hours.
  const now = Date.now();
  const session = await prisma.classSession.create({
    data: {
      courseId: course.id,
      title: "Lecture 1 — Welcome",
      venue: "Room B12",
      startsAt: new Date(now - 60 * 60_000),
      endsAt: new Date(now + 120 * 60_000),
      latitude: CENTER.lat,
      longitude: CENTER.lng,
      radiusMeters: 50,
      totpSecret: generateTotpSecret(),
    },
  });

  console.log("\nSeed complete. Accounts (password for all: " + PASSWORD + "):");
  console.log("  admin@csas.test      (ADMIN)   ->", admin.id);
  console.log("  lecturer@csas.test   (LECTURER)->", lecturer.id);
  console.log("  student@csas.test    (STUDENT) ->", student.id);
  console.log("\nCourse CS101 ->", course.id);
  console.log("Active session ->", session.id);
  console.log("  geo-fence center:", CENTER, " radius: 50 m");
  console.log("  a code valid right now:", currentToken(session.totpSecret));
  console.log(
    "  (or call GET /sessions/" + session.id + "/code as the lecturer for a live one)\n"
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
