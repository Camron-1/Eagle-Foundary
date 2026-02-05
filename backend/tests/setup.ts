import 'dotenv/config';
import { beforeAll, afterAll, vi } from 'vitest';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
// process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-at-least-32-chars';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-at-least-32-chars';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.STUDENT_EMAIL_DOMAIN = 'test.edu';
process.env.BLOCKED_EMAIL_DOMAINS = 'gmail.com,yahoo.com,hotmail.com';
process.env.OTP_EXPIRES_IN_MINUTES = '10';
process.env.OTP_MAX_ATTEMPTS = '5';
process.env.OTP_RESEND_COOLDOWN_SECONDS = '60';
process.env.OTP_MAX_SENDS_PER_HOUR = '5';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.AWS_S3_BUCKET = 'test-bucket';
process.env.AWS_SES_FROM_EMAIL = 'noreply@test.com';
process.env.AWS_SQS_QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/test/queue';

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
