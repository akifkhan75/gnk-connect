import { z } from 'zod';

// Validated once at boot (plan 04 §8). The API refuses to start on missing or weak secrets.
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(4000),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    // Comma-separated "version:64-hex-chars" keys; the first is used for new encryptions.
    PII_ENCRYPTION_KEY: z
      .string()
      .regex(
        /^(v\d+:[0-9a-f]{64})(,v\d+:[0-9a-f]{64})*$/i,
        'PII_ENCRYPTION_KEY must look like v1:<64 hex chars>',
      ),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:3000,http://localhost:3001,http://localhost:3002'),
    PORTAL_URL: z.string().url().default('http://localhost:3001'),
    ADMIN_URL: z.string().url().default('http://localhost:3002'),
    UPLOAD_DIR: z.string().default('./uploads'),
    SUPPLIER_MODE: z.enum(['mock', 'live']).default('mock'),
    SUPPLIER_SYNC_INTERVAL_MINUTES: z.coerce.number().int().min(0).default(15),
    GEMINI_API_KEY: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.SUPPLIER_MODE === 'live') {
      ctx.addIssue({
        code: 'custom',
        path: ['SUPPLIER_MODE'],
        message: 'The live AirDesk adapter is not available yet; use SUPPLIER_MODE=mock',
      });
    }
  });

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      console.error(`❌ ${issue.path.join('.')}: ${issue.message}`);
    }
    throw new Error('Invalid environment configuration');
  }
  if (parsed.data.NODE_ENV === 'production' && parsed.data.SUPPLIER_MODE === 'mock') {
    console.warn(
      '⚠️  SUPPLIER_MODE=mock in production: bookings are confirmed by the mock AirDesk adapter, not the real supplier.',
    );
  }
  return parsed.data;
}
