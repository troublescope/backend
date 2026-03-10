import { NextFunction, Request, Response } from 'express';
import { getErrorResponse } from '../lib/http';

export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
};

export const errorHandler = (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const { statusCode, body } = getErrorResponse(error);

  if (statusCode >= 500) {
    console.error('Unhandled request error:', error);
  }

  res.status(statusCode).json(body);
};
