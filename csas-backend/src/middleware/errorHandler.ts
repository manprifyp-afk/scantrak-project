import type { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";

/** 404 for any unmatched route. */
export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "Not found" });
}

/**
 * Final error handler. Thanks to "express-async-errors" (imported in app.ts),
 * errors thrown inside async route handlers reach here instead of hanging the
 * request. Known Prisma errors are mapped to sensible status codes.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "That record already exists" });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Related record not found" });
    }
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({ error: "Invalid data sent to the database" });
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}
