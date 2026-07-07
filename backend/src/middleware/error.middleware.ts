import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(
    { 
      err, 
      method: req.method, 
      path: req.path,
      bodySize: req.headers['content-length']
    }, 
    'Unhandled server error'
  );
  
  const isDev = process.env.NODE_ENV === 'development';

  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: isDev ? err.message : undefined,
    stack: isDev ? err.stack : undefined,
  });
};
