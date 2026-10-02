import type { Role } from "@prisma/client";

// Lets middleware attach the authenticated user to the request object,
// readable as `req.user` in any handler with full type safety.
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: Role };
    }
  }
}

export {};
