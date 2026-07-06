import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error({ err }, 'Unhandled error');
  
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
  });
};
