import { z } from 'zod';

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    API_PORT: z.coerce.number().int().positive().default(4000),
    PORT: z.coerce.number().int().positive().optional(),
    CORS_ORIGIN: z.string().trim().url(),
    WEB_ORIGIN: z.string().trim().url().default('http://localhost:3000'),

    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1),

    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    ACCESS_TOKEN_TTL: z.string().default('15m'),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

    TWO_FACTOR_ENCRYPTION_KEY: z
      .string()
      .trim()
      .regex(/^[0-9a-f]{64}$/i, 'must be a 64-char hex string (32 bytes)'),

    EMAIL_DRIVER: z.enum(['console', 'smtp']).default('console'),
    SMTP_HOST: z.string().trim().optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_USER: z.string().trim().optional(),
    SMTP_PASS: z.string().optional(),
    MAIL_FROM: z.string().trim().default('Finance App <no-reply@finance.local>'),

    STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
    STORAGE_LOCAL_PATH: z.string().default('./uploads'),
    STORAGE_S3_BUCKET: z.string().trim().min(1).optional(),
    STORAGE_S3_REGION: z.string().trim().min(1).optional(),
    STORAGE_S3_ENDPOINT: z.string().trim().url().optional(),
    STORAGE_S3_ACCESS_KEY_ID: z.string().trim().min(1).optional(),
    STORAGE_S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),

    DEFAULT_CURRENCY: z.string().length(3).default('LKR'),
  })
  .superRefine((env, ctx) => {
    const requireKeys = (keys: string[], when: boolean) => {
      if (!when) return;
      for (const key of keys) {
        if (!env[key as keyof typeof env]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: 'is required for this configuration',
          });
        }
      }
    };

    if (env.NODE_ENV === 'production' && env.EMAIL_DRIVER !== 'smtp') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['EMAIL_DRIVER'],
        message: 'must be smtp in production',
      });
    }
    if (env.NODE_ENV === 'production' && env.STORAGE_DRIVER !== 's3') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['STORAGE_DRIVER'],
        message: 'must be s3 in production',
      });
    }
    requireKeys(
      ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'],
      env.EMAIL_DRIVER === 'smtp',
    );
    requireKeys(
      [
        'STORAGE_S3_BUCKET',
        'STORAGE_S3_REGION',
        'STORAGE_S3_ENDPOINT',
        'STORAGE_S3_ACCESS_KEY_ID',
        'STORAGE_S3_SECRET_ACCESS_KEY',
      ],
      env.STORAGE_DRIVER === 's3',
    );
    if (
      env.NODE_ENV === 'production' &&
      env.STORAGE_S3_ENDPOINT?.startsWith('http://')
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['STORAGE_S3_ENDPOINT'],
        message: 'must use HTTPS in production',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;
