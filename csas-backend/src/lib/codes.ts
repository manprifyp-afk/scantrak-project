import { prisma } from "./prisma";

// Unambiguous alphabet — no I, L, O, 0, 1 so codes are easy to read aloud/type.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function randomJoinCode(len = 6): string {
  let s = "";
  for (let i = 0; i < len; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return s;
}

/** A join code guaranteed not to collide with an existing course. */
export async function uniqueJoinCode(): Promise<string> {
  for (let i = 0; i < 12; i++) {
    const code = randomJoinCode(6);
    const exists = await prisma.course.findUnique({ where: { joinCode: code } });
    if (!exists) return code;
  }
  // Extremely unlikely fallback: longer code.
  return randomJoinCode(8);
}
