import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const RUN_DB_INTEGRATION_TESTS = process.env.RUN_DB_INTEGRATION_TESTS === 'true';

if (RUN_DB_INTEGRATION_TESTS) {
    vi.unmock('../../src/connectors/db');
}

describe.skipIf(!RUN_DB_INTEGRATION_TESTS)('Session Security Integration Tests', async () => {
    const { db } = await import('../../src/connectors/db.js');
    const authService = await import('../../src/modules/auth/auth.service.js');
    const { hashPassword, generateTotpCode } = await import('../../src/utils/security.js');

    const email = 'integration_sessions_user@test.edu';
    const password = 'StrongPassword123!';

    beforeAll(async () => {
        await db.user.deleteMany({ where: { email } });
    });

    afterAll(async () => {
        await db.user.deleteMany({ where: { email } });
        await db.$disconnect();
    });

    it('lists, revokes, and revokes-other sessions with ownership enforcement', async () => {
        await db.user.deleteMany({ where: { email: 'integration_sessions_other@test.edu' } });

        const user = await db.user.create({
            data: {
                email,
                passwordHash: await hashPassword(password),
                role: 'STUDENT',
                status: 'ACTIVE',
                emailVerifiedAt: new Date(),
                studentProfile: {
                    create: {
                        firstName: 'Session',
                        lastName: 'Tester',
                    },
                },
            },
        });

        const setupChallenge = await authService.login({ email, password });
        const setupStart = await authService.startMfaSetup(setupChallenge.challengeToken);
        const setupComplete = await authService.completeMfaSetup(
            setupChallenge.challengeToken,
            generateTotpCode(setupStart.secret),
            { userAgent: 'session-agent-1', ip: '127.0.0.1' }
        );

        const verifyChallenge = await authService.login({ email, password });
        const verifyComplete = await authService.verifyMfaChallenge(
            verifyChallenge.challengeToken,
            { code: generateTotpCode(setupStart.secret) },
            { userAgent: 'session-agent-2', ip: '127.0.0.2' }
        );

        const initialSessions = await authService.listSessions(user.id, setupComplete.tokens.refreshToken);
        expect(initialSessions.length).toBeGreaterThanOrEqual(2);

        const otherSession = initialSessions.find((session) => !session.isCurrent);
        expect(otherSession).toBeTruthy();

        await authService.revokeSession(user.id, otherSession!.id);
        const afterSingleRevoke = await authService.listSessions(user.id, setupComplete.tokens.refreshToken);
        expect(afterSingleRevoke.some((session) => session.id === otherSession!.id)).toBe(false);

        const revokeOthers = await authService.revokeOtherSessions(user.id, setupComplete.tokens.refreshToken);
        expect(revokeOthers.revokedCount).toBeGreaterThanOrEqual(1);

        const finalSessions = await authService.listSessions(user.id, setupComplete.tokens.refreshToken);
        expect(finalSessions.length).toBe(1);
        expect(finalSessions[0].isCurrent).toBe(true);

        const anotherUser = await db.user.create({
            data: {
                email: 'integration_sessions_other@test.edu',
                passwordHash: await hashPassword(password),
                role: 'STUDENT',
                status: 'ACTIVE',
                emailVerifiedAt: new Date(),
                studentProfile: {
                    create: {
                        firstName: 'Another',
                        lastName: 'User',
                    },
                },
            },
        });

        await expect(
            authService.revokeSession(anotherUser.id, finalSessions[0].id)
        ).rejects.toMatchObject({ code: 'NOT_FOUND' });

        await db.user.delete({ where: { id: anotherUser.id } });
        await db.user.delete({ where: { id: user.id } });

        // Ensure the second token is not optimized away and remains part of the flow.
        expect(verifyComplete.tokens.refreshToken).toBeTruthy();
    });
});
