import type { Request, Response, NextFunction } from "express";

interface SafeParseResult<T> {
  success: boolean;
  data?: T;
  error?: { issues: unknown[] };
}

interface ParseableSchema<T> {
  safeParse(data: unknown): SafeParseResult<T>;
}

export function validateBody<T>(schema: ParseableSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: "Validation error",
        details: result.error?.issues,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
