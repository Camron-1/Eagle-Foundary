import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { generateOtp, hashOtp, verifyOtp } from '@utils/security.js';
import { isStudentEmail, isValidCompanyEmail, normalizeEmail } from '@utils/emailRules.js';
import { success, paginated } from '@utils/response.js';

// Simple health check test
describe('Health Check', () => {
    const app = express();

    app.get('/health', (req, res) => {
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
        });
    });

    it('should return healthy status', async () => {
        const response = await request(app).get('/health');

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('healthy');
        expect(response.body.timestamp).toBeDefined();
    });
});

// Utility function tests
describe('Security Utils', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('should generate a 6-digit OTP', () => {
        const otp = generateOtp();
        expect(otp).toMatch(/^\d{6}$/);
    });

    it('should hash and verify OTP correctly', async () => {
        const otp = '123456';
        const hash = await hashOtp(otp);

        expect(await verifyOtp(otp, hash)).toBe(true);
        expect(await verifyOtp('654321', hash)).toBe(false);
    });
});

// Email rules tests
describe('Email Rules', () => {
    it('should validate student email domain', () => {
        expect(isStudentEmail('student@test.edu')).toBe(true); // Using mocked setup env
        expect(isStudentEmail('student@other.edu')).toBe(false);
        // Note: setup.ts sets STUDENT_EMAIL_DOMAIN='test.edu'
    });

    it('should block public email domains for companies', () => {
        expect(isValidCompanyEmail('employee@gmail.com')).toBe(false);
        expect(isValidCompanyEmail('employee@yahoo.com')).toBe(false);
        expect(isValidCompanyEmail('employee@company.com')).toBe(true);
    });

    it('should normalize email addresses', () => {
        expect(normalizeEmail('  Test@Example.COM  ')).toBe('test@example.com');
    });
});

// Response utility tests
describe('Response Utils', () => {
    it('should format success response correctly', () => {
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

    it('should format paginated response correctly', () => {
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
            }
        });
    });
});
