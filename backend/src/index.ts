import 'dotenv/config';
import { config } from './config';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import apiRoutes from './api/routes';
import { errorHandler } from './middleware/error.middleware';
import logger from './utils/logger';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
}));
app.use(express.json({ limit: '10mb' })); // Support larger payloads for batches

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

if (!isServerless && (require.main === module || process.env.NODE_ENV !== 'production')) {
  app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
  });
}

export default app;
