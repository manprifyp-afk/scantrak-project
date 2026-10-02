import type { Request, Response, NextFunction } from "express";
import type { Role } from "@prisma/client";
import { verifyJwt } from "../lib/security";

/** Rejects the request unless it carries a valid "Authorization: Bearer <jwt>". */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }
  try {
    const payload = verifyJwt(header.slice(7));
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/** Rejects the request unless the authenticated user has one of the given roles. */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have permission for this action" });
    }
    next();
  };
}
