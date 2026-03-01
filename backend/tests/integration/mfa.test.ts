import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const RUN_DB_INTEGRATION_TESTS = process.env.RUN_DB_INTEGRATION_TESTS === 'true';

if (RUN_DB_INTEGRATION_TESTS) {
    vi.unmock('../../src/connectors/db');
}

describe.skipIf(!RUN_DB_INTEGRATION_TESTS)('MFA Integration Tests', async () => {
    const { db } = await import('../../src/connectors/db.js');
    const authService = await import('../../src/modules/auth/auth.service.js');
    const { hashPassword, generateTotpCode } = await import('../../src/utils/security.js');

    const email = 'integration_mfa_user@test.edu';
    const password = 'StrongPassword123!';

    beforeAll(async () => {
        await db.user.deleteMany({ where: { email } });
    });

    afterAll(async () => {
        await db.user.deleteMany({ where: { email } });
        await db.$disconnect();
    });

    it('completes MFA setup and verifies backup code one-time usage', async () => {
        const user = await db.user.create({
            data: {
                email,
                passwordHash: await hashPassword(password),
                role: 'STUDENT',
                status: 'ACTIVE',
                emailVerifiedAt: new Date(),
                studentProfile: {
                    create: {
                        firstName: 'MFA',
                        lastName: 'Tester',
                    },
                },
            },
        });

        const loginResult = await authService.login({ email, password });
        expect(loginResult.nextStep).toBe('MFA_SETUP');

        const setupStart = await authService.startMfaSetup(loginResult.challengeToken);
        const totpCode = generateTotpCode(setupStart.secret);
        const setupComplete = await authService.completeMfaSetup(
            loginResult.challengeToken,
            totpCode,
            { userAgent: 'vitest', ip: '127.0.0.1' }
        );

        expect(setupComplete.tokens.accessToken).toBeTruthy();
        expect(setupComplete.backupCodes.length).toBeGreaterThan(0);

        const verifyChallenge = await authService.login({ email, password });
        expect(verifyChallenge.nextStep).toBe('MFA_VERIFY');

        const backupCode = setupComplete.backupCodes[0];
        const verifyWithBackup = await authService.verifyMfaChallenge(
            verifyChallenge.challengeToken,
            { backupCode },
            { userAgent: 'vitest', ip: '127.0.0.1' }
        );

        expect(verifyWithBackup.usedBackupCode).toBe(true);
        expect(verifyWithBackup.tokens.accessToken).toBeTruthy();

        const secondChallenge = await authService.login({ email, password });
        await expect(
            authService.verifyMfaChallenge(
                secondChallenge.challengeToken,
                { backupCode },
                { userAgent: 'vitest', ip: '127.0.0.1' }
            )
        ).rejects.toMatchObject({
            code: 'MFA_BACKUP_CODE_USED',
        });

        await db.user.delete({ where: { id: user.id } });
    });

    it('locks account after repeated failed login attempts', async () => {
        const lockoutEmail = 'integration_lockout_user@test.edu';
        const lockoutPassword = 'AnotherStrong123!';

        await db.user.deleteMany({ where: { email: lockoutEmail } });

        const user = await db.user.create({
            data: {
                email: lockoutEmail,
                passwordHash: await hashPassword(lockoutPassword),
                role: 'STUDENT',
                status: 'ACTIVE',
                emailVerifiedAt: new Date(),
                studentProfile: {
                    create: {
                        firstName: 'Lockout',
                        lastName: 'Tester',
                    },
                },
            },
        });

        for (let i = 0; i < 5; i += 1) {
            await expect(authService.login({ email: lockoutEmail, password: 'WrongPassword123!' }))
                .rejects
                .toMatchObject({ code: 'INVALID_CREDENTIALS' });
        }

        await expect(authService.login({ email: lockoutEmail, password: lockoutPassword }))
            .rejects
            .toMatchObject({ code: 'ACCOUNT_LOCKED' });

        await db.user.delete({ where: { id: user.id } });
    });
});
