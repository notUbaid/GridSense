import 'dotenv/config';
import { config } from './config';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import apiRoutes from './api/routes';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/error.middleware';
import logger from './utils/logger';

const app = express();
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.FRONTEND_URL,
}));
app.use(express.json({ limit: '10mb' })); // Support larger payloads for batches

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', apiLimiter);

// Routes
app.use('/api/v1/process', apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Global Error Handler
app.use(errorHandler);

const PORT = config.PORT || 8000;

const isServerless = !!process.env.VERCEL;

if (!isServerless && process.env.NODE_ENV !== 'test' && (require.main === module || process.env.NODE_ENV !== 'production')) {
  app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
  });
}

export default app;
