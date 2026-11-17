import { Request, Response, NextFunction } from 'express';

/**
 * Sanitizes input to protect against NoSQL operator injection attacks ($where, $gt, $regex, etc.)
 */
export function sanitizeNoSqlInput(req: Request, res: Response, next: NextFunction): void {
  const sanitize = (obj: any): any => {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }

    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Strip dangerous keys starting with $ or containing dots
      if (key.startsWith('$') || key.includes('.')) {
        console.warn(`[Security Alert] Blocked potential NoSQL injection key: "${key}"`);
        continue;
      }
      clean[key] = sanitize(value);
    }
    return clean;
  };

  if (req.body) req.body = sanitize(req.body);
  if (req.params) req.params = sanitize(req.params) as any;
  // Express req.query getter
  if (req.query) {
    for (const key of Object.keys(req.query)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete req.query[key];
      }
    }
  }

  next();
}

/**
 * Validates request body schema using a validator function or basic checks
 */
export function validateBody(requiredFields: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missing = requiredFields.filter((field) => {
      const val = req.body?.[field];
      return val === undefined || val === null || val === '';
    });

    if (missing.length > 0) {
      res.status(400).json({
        error: `Validation error: Missing required fields: ${missing.join(', ')}`,
        missingFields: missing,
      });
      return;
    }

    next();
  };
}
