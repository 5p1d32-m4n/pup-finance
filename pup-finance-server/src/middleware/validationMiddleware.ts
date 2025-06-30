import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validate = (schema: AnyZodObject) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params
    });
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: err.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }))
      });
    }
    next(err);
  }
};