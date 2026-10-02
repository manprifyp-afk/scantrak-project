import type { Request, Response, NextFunction } from "express";
import type { ZodTypeAny } from "zod";

/**
 * Validates and parses req.body against a Zod schema.
 * On success, req.body is replaced with the typed, parsed value.
 * On failure, returns 400 with a field-by-field breakdown.
 */
export function validate(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: result.error.flatten().fieldErrors,
      });
    }
    req.body = result.data;
    next();
  };
}
