import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}`;

  logger.error(
    { 
      err: err.message,
      stack: err.stack,
      method: req.method, 
      path: req.path,
      requestId,
      bodySize: req.headers['content-length']
    }, 
    'Unhandled server error'
  );
  
  const isDev = process.env.NODE_ENV === 'development';

  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    requestId,
    message: isDev ? err.message : undefined,
    stack: isDev ? err.stack : undefined,
  });
};
