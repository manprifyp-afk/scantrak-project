// ---------------------------------------------------------------------------
//  Security helpers: password hashing (bcryptjs) and JWT signing/verifying.
//  bcryptjs is the pure-JavaScript bcrypt — no native build step, which keeps
//  setup painless across machines.
// ---------------------------------------------------------------------------

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { config } from "../config";

const TOKEN_TTL = "12h";
const BCRYPT_ROUNDS = 10;

export interface JwtPayload {
  sub: string; // user id
  role: Role;
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, config.JWT_SECRET) as JwtPayload;
}
