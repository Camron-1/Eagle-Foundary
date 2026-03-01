import { z } from 'zod';

const envSchema = z.object({
    // Server
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().transform(Number).default('3000'),
    CORS_ORIGINS: z
        .string()
        .transform((s) =>
            s
                .split(',')
                .map((origin) => origin.trim())
                .filter(Boolean)
        )
        .default('http://localhost:5173,http://localhost:3000'),

    // Database
    DATABASE_URL: z.string().url(),

    // JWT
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    REFRESH_COOKIE_NAME: z.string().default('ef_refresh_token'),
    REFRESH_COOKIE_DOMAIN: z.string().optional(),
    REFRESH_COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax'),
    REFRESH_COOKIE_SECURE: z
        .enum(['true', 'false'])
        .default('true')
        .transform((v) => v === 'true'),
    UPLOAD_TOKEN_SECRET: z.string().min(32).optional(),

    // Email Domain Rules
    STUDENT_EMAIL_DOMAIN: z.string().default('ashland.edu'),
    BLOCKED_EMAIL_DOMAINS: z
        .string()
        .transform((s) =>
            s
                .split(',')
                .map((domain) => domain.trim())
                .filter(Boolean)
        )
        .default('gmail.com,yahoo.com,outlook.com,hotmail.com,icloud.com,proton.me'),

    // OTP Configuration
    OTP_TTL_MINUTES: z.string().transform(Number).default('10'),
    OTP_MAX_ATTEMPTS: z.string().transform(Number).default('5'),
    OTP_RESEND_COOLDOWN_SECONDS: z.string().transform(Number).default('60'),
    OTP_SEND_LIMIT_PER_HOUR: z.string().transform(Number).default('5'),
    OTP_HASH_PEPPER: z.string().min(16),

    // MFA Configuration
    MFA_ENCRYPTION_KEY: z.string().min(44), // 32-byte base64 key
    MFA_CHALLENGE_TTL_MINUTES: z.string().transform(Number).default('5'),
    MFA_MAX_ATTEMPTS: z.string().transform(Number).default('5'),
    MFA_ISSUER: z.string().default('Eagle-Foundry'),
    MFA_BACKUP_CODES_COUNT: z.string().transform(Number).default('10'),
    MFA_BACKUP_CODE_PEPPER: z.string().min(16),

    // Field encryption + KMS
    AWS_KMS_KEY_ID: z.string().optional(),
    FIELD_ENCRYPTION_HASH_PEPPER: z.string().min(16),
    E2EE_REQUIRED: z
        .enum(['true', 'false'])
        .default('false')
        .transform((v) => v === 'true'),
    E2EE_ALLOW_LEGACY_THREADS: z
        .enum(['true', 'false'])
        .default('true')
        .transform((v) => v === 'true'),

    // Login lockout
    LOGIN_MAX_FAILED_ATTEMPTS: z.string().transform(Number).default('5'),
    LOGIN_LOCKOUT_MINUTES: z.string().transform(Number).default('30'),

    // AWS
    AWS_REGION: z.string().default('us-east-1'),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    S3_BUCKET_NAME: z.string(),
    SES_FROM_EMAIL: z.string().email(),
    SQS_EVENTS_QUEUE_URL: z.string().url(),

    // Sentry
    SENTRY_DSN: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.REFRESH_COOKIE_SAME_SITE === 'none' && !data.REFRESH_COOKIE_SECURE) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['REFRESH_COOKIE_SECURE'],
            message: 'REFRESH_COOKIE_SECURE must be true when REFRESH_COOKIE_SAME_SITE is "none"',
        });
    }
});

function loadEnv() {
    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
        console.error('Invalid environment variables:');
        console.error(parsed.error.flatten().fieldErrors);
        process.exit(1);
    }

    return parsed.data;
}

export const env = loadEnv();

export type Env = z.infer<typeof envSchema>;
