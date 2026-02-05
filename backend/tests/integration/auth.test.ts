import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Unmock DB for integration tests
vi.unmock('../../src/connectors/db');

import request from 'supertest';
import { app } from '../../src/app.js';
import { db } from '../../src/connectors/db.js';
import { hashPassword } from '../../src/utils/security.js';

describe('Auth Integration Tests', () => {
    const testStudent = {
        email: 'integration_test@test.edu',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
    };

    beforeAll(async () => {
        // Clean up potentially existing test user
        await db.user.deleteMany({ where: { email: testStudent.email } });
    });

    afterAll(async () => {
        // Clean up
        await db.user.deleteMany({ where: { email: testStudent.email } });
        await db.$disconnect();
    });

    it('should register a new student', async () => {
        const res = await request(app)
            .post('/api/auth/student/signup')
            .send(testStudent);

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.data).toHaveProperty('userId');
    });

    it('should prevent duplicate registration', async () => {
        const res = await request(app)
            .post('/api/auth/student/signup')
            .send(testStudent);

        expect(res.status).toBe(409); // Conflict
        expect(res.body).toHaveProperty('success', false);
        expect(res.body.error.code).toBe('ALREADY_EXISTS');
    });

    it('should login with correct credentials (after manual verification simulation)', async () => {
        // Manually verify the user in DB since we can't easily get the OTP in tests without mocking
        await db.user.update({
            where: { email: testStudent.email },
            data: { status: 'ACTIVE' }
        });

        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: testStudent.email,
                password: testStudent.password
            });

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('accessToken');
        expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('should fail login with incorrect password', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: testStudent.email,
                password: 'WrongPassword123!'
            });

        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
});
