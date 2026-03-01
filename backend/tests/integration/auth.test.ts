import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const RUN_DB_INTEGRATION_TESTS = process.env.RUN_DB_INTEGRATION_TESTS === 'true';

// Unmock DB only for real integration runs.
if (RUN_DB_INTEGRATION_TESTS) {
    vi.unmock('../../src/connectors/db');
}

describe.skipIf(!RUN_DB_INTEGRATION_TESTS)('Auth Integration Tests', async () => {
    const request = (await import('supertest')).default;
    const { app } = await import('../../src/app.js');
    const { db } = await import('../../src/connectors/db.js');

    const testStudent = {
        email: 'integration_test_student@test.edu',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'Student',
    };

    beforeAll(async () => {
        await db.user.deleteMany({ where: { email: testStudent.email } });
    });

    afterAll(async () => {
        await db.user.deleteMany({ where: { email: testStudent.email } });
        await db.$disconnect();
    });

    it('registers a new student account', async () => {
        const res = await request(app)
            .post('/api/auth/student/signup')
            .send(testStudent);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.userId).toBeTruthy();
    });

    it('prevents duplicate student registration', async () => {
        const res = await request(app)
            .post('/api/auth/student/signup')
            .send(testStudent);

        expect(res.status).toBe(409);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('ALREADY_EXISTS');
    });

    it('returns MFA setup challenge after successful login for user without MFA', async () => {
        await db.user.update({
            where: { email: testStudent.email },
            data: { status: 'ACTIVE' },
        });

        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: testStudent.email,
                password: testStudent.password,
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.nextStep).toBe('MFA_SETUP');
        expect(typeof res.body.data.challengeToken).toBe('string');
        expect(res.body.data.accessToken).toBeUndefined();
    });

    it('fails login with incorrect password', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: testStudent.email,
                password: 'WrongPassword123!',
            });

        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
});
