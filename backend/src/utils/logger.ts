import pino from 'pino';

// If VERCEL environment variable is present, we are in a serverless environment
const isServerless = !!process.env.VERCEL;
// Force disable dev tools if running in serverless, even if user accidentally set NODE_ENV=development
const useDevTools = process.env.NODE_ENV === 'development' && !isServerless;

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(useDevTools && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  }),
});

export default logger;
