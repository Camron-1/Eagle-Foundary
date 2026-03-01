import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    buildTotpUri,
    decryptSensitiveValue,
    encryptSensitiveValue,
    generateBackupCodes,
    generateOtp,
    generateTotpCode,
    generateTotpSecret,
    hashBackupCode,
    hashOtp,
    verifyBackupCode,
    verifyOtp,
    verifyTotpCode,
} from '@utils/security.js';
import { isStudentEmail, isValidCompanyEmail, normalizeEmail } from '@utils/emailRules.js';
import { paginated, success } from '@utils/response.js';
import { decryptTextValue, encryptTextValue } from '@utils/fieldEncryption.js';
import { hashForBlindIndex } from '@connectors/kms.js';

describe('Security Utils', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('generates a 6-digit OTP', () => {
        const otp = generateOtp();
        expect(otp).toMatch(/^\d{6}$/);
    });

    it('hashes and verifies OTP values correctly', () => {
        const otp = '123456';
        const hash = hashOtp(otp);

        expect(verifyOtp(otp, hash)).toBe(true);
        expect(verifyOtp('654321', hash)).toBe(false);
    });

    it('generates and verifies TOTP codes', () => {
        const secret = generateTotpSecret();
        const code = generateTotpCode(secret);

        expect(secret).toMatch(/^[A-Z2-7]+$/);
        expect(code).toMatch(/^\d{6}$/);
        expect(verifyTotpCode(secret, code)).toBe(true);
    });

    it('builds otpauth URI with issuer and account label', () => {
        const secret = generateTotpSecret();
        const uri = buildTotpUri('user@test.edu', secret);

        expect(uri.startsWith('otpauth://totp/')).toBe(true);
        expect(uri.includes('secret=')).toBe(true);
        expect(uri.includes('issuer=')).toBe(true);
    });

    it('encrypts and decrypts sensitive values', () => {
        const plain = 'MY-SUPER-SECRET';
        const encrypted = encryptSensitiveValue(plain);
        const decrypted = decryptSensitiveValue(encrypted);

        expect(encrypted).not.toBe(plain);
        expect(decrypted).toBe(plain);
    });

    it('encrypts and decrypts field envelopes with context binding', async () => {
        const plain = 'secure-file-key';
        const envelope = await encryptTextValue(plain, 'file_s3_key', 'abc-123');
        const decrypted = await decryptTextValue(envelope, 'file_s3_key', 'abc-123');

        expect(envelope.ciphertext).not.toBe(plain);
        expect(decrypted).toBe(plain);
    });

    it('generates stable blind index hashes', () => {
        const hash1 = hashForBlindIndex('message-key');
        const hash2 = hashForBlindIndex('message-key');
        const hash3 = hashForBlindIndex('message-key-2');

        expect(hash1).toBe(hash2);
        expect(hash1).not.toBe(hash3);
    });

    it('generates backup codes and verifies hashed values', () => {
        const backupCodes = generateBackupCodes(5);
        expect(backupCodes).toHaveLength(5);
        expect(new Set(backupCodes).size).toBe(5);

        for (const backupCode of backupCodes) {
            expect(backupCode).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
            const hash = hashBackupCode(backupCode);
            expect(verifyBackupCode(backupCode, hash)).toBe(true);
            expect(verifyBackupCode('AAAA-BBBB', hash)).toBe(false);
        }
    });
});

describe('Email Rules', () => {
    it('validates student email domain', () => {
        expect(isStudentEmail('student@test.edu')).toBe(true);
        expect(isStudentEmail('student@other.edu')).toBe(false);
    });

    it('blocks public email domains for companies', () => {
        expect(isValidCompanyEmail('employee@gmail.com')).toBe(false);
        expect(isValidCompanyEmail('employee@yahoo.com')).toBe(false);
        expect(isValidCompanyEmail('employee@company.com')).toBe(true);
    });

    it('normalizes email addresses', () => {
        expect(normalizeEmail('  Test@Example.COM  ')).toBe('test@example.com');
    });
});

describe('Response Utils', () => {
    it('formats success response correctly', () => {
        const mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        } as any;

        success(mockRes, { data: 'test' });

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
            success: true,
            data: { data: 'test' },
        });
    });

    it('formats paginated response correctly', () => {
        const mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        } as any;

        paginated(mockRes, [{ id: 1 }], { nextCursor: 'abc', hasMore: true });

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
            success: true,
            data: [{ id: 1 }],
            meta: {
                pagination: { nextCursor: 'abc', hasMore: true },
            },
        });
    });
});
