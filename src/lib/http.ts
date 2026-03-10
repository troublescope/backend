import { NextFunction, Request, Response } from 'express';
import { z, ZodTypeAny } from 'zod';
import { AppError, isAppError } from './errors';

export type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export const asyncHandler = (handler: AsyncRouteHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};

export const validate = <T extends ZodTypeAny>(schema: T, payload: unknown): z.infer<T> => {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new AppError(400, 'Invalid request data', result.error.flatten());
  }
  return result.data;
};

export const getErrorResponse = (error: unknown) => {
  if (isAppError(error)) {
    return {
      statusCode: error.statusCode,
      body: {
        error: error.message,
        ...(error.details ? { details: error.details } : {})
      }
    };
  }

  return {
    statusCode: 500,
    body: { error: 'Internal server error' }
  };
};
