import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('8000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.string().default('info'),
  GROQ_API_KEY: z.string().default(''), // Allow empty at startup to prevent Vercel cold-start crash
  GEMINI_API_KEY: z.string().default(''),
  OPENAI_API_KEY: z.string().default(''),
  ANTHROPIC_API_KEY: z.string().default(''),
  OPENROUTER_API_KEY: z.string().default(''),
  COHERE_API_KEY: z.string().default(''),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  AI_MAX_RETRIES: z.coerce.number().int().min(1).default(3),
  AI_RETRY_DELAY_MS: z.coerce.number().int().min(100).default(2000),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('Invalid environment variables:', _env.error.format());
  // In Vercel serverless, process.exit(1) crashes the cold start and returns a generic 500.
  // We throw so it can be caught, or if uncaught it at least provides a stack trace.
  throw new Error(`Invalid environment variables: ${JSON.stringify(_env.error.format())}`);
}

export const config = _env.data;
