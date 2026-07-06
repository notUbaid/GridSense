import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('8000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.string().default('info'),
  GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  AI_MAX_RETRIES: z.coerce.number().int().min(1).default(3),
  AI_RETRY_DELAY_MS: z.coerce.number().int().min(100).default(2000),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('Invalid environment variables:', _env.error.format());
  process.exit(1);
}

export const config = _env.data;
