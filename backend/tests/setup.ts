import 'dotenv/config';
import { beforeAll, afterAll, vi } from 'vitest';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.CORS_ORIGINS = 'http://localhost:5173';
// process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-at-least-32-chars';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-at-least-32-chars';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.STUDENT_EMAIL_DOMAIN = 'test.edu';
process.env.BLOCKED_EMAIL_DOMAINS = 'gmail.com,yahoo.com,hotmail.com';
process.env.OTP_TTL_MINUTES = '10';
process.env.OTP_MAX_ATTEMPTS = '5';
process.env.OTP_RESEND_COOLDOWN_SECONDS = '60';
process.env.OTP_SEND_LIMIT_PER_HOUR = '5';
process.env.OTP_HASH_PEPPER = 'test-otp-pepper-secret-min-32-chars';
process.env.MFA_ENCRYPTION_KEY = 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=';
process.env.MFA_CHALLENGE_TTL_MINUTES = '5';
process.env.MFA_MAX_ATTEMPTS = '5';
process.env.MFA_ISSUER = 'Eagle-Foundry-Test';
process.env.MFA_BACKUP_CODES_COUNT = '10';
process.env.MFA_BACKUP_CODE_PEPPER = 'test-mfa-backup-pepper-secret-min-32';
process.env.FIELD_ENCRYPTION_HASH_PEPPER = 'test-field-encryption-pepper-min-32';
process.env.E2EE_REQUIRED = 'false';
process.env.E2EE_ALLOW_LEGACY_THREADS = 'true';
process.env.LOGIN_MAX_FAILED_ATTEMPTS = '5';
process.env.LOGIN_LOCKOUT_MINUTES = '30';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.S3_BUCKET_NAME = 'test-bucket';
process.env.SES_FROM_EMAIL = 'noreply@test.com';
process.env.SQS_EVENTS_QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';
// Ensure local key wrapping for field encryption (no KMS calls in tests)
process.env.AWS_KMS_KEY_ID = '';

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
    S3Client: vi.fn(),
    PutObjectCommand: vi.fn(),
    GetObjectCommand: vi.fn(),
    DeleteObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: vi.fn().mockResolvedValue('https://mock-presigned-url.com'),
}));

vi.mock('@aws-sdk/client-ses', () => ({
    SESClient: vi.fn(),
    SendEmailCommand: vi.fn(),
}));

vi.mock('@aws-sdk/client-sqs', () => ({
    SQSClient: vi.fn(),
    SendMessageCommand: vi.fn(),
}));

vi.mock('@aws-sdk/client-kms', () => ({
    KMSClient: vi.fn(),
    EncryptCommand: vi.fn(),
    DecryptCommand: vi.fn(),
}));

// Mock Prisma
vi.mock('../src/connectors/db', () => ({
    db: {
        user: {
            findUnique: vi.fn(),
            findFirst: vi.fn(),
            findMany: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            count: vi.fn(),
        },
        // Add other model mocks as needed
    },
    connectDB: vi.fn(),
    disconnectDB: vi.fn(),
}));

beforeAll(() => {
    console.log('Test setup complete');
});

afterAll(() => {
    console.log('Test cleanup complete');
});
