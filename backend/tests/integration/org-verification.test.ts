import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import crypto from 'crypto';

const RUN_DB_INTEGRATION_TESTS = process.env.RUN_DB_INTEGRATION_TESTS === 'true';

if (RUN_DB_INTEGRATION_TESTS) {
    vi.unmock('../../src/connectors/db');
}

describe.skipIf(!RUN_DB_INTEGRATION_TESTS)('Organization Verification Integration Tests', async () => {
    const { db } = await import('../../src/connectors/db.js');
    const authService = await import('../../src/modules/auth/auth.service.js');
    const adminService = await import('../../src/modules/admin/admin.service.js');
    const orgsService = await import('../../src/modules/orgs/orgs.service.js');

    const adminEmail = 'integration_university_admin@test.edu';
    const firstCompanyEmail = 'integration_company_admin@orgverify.com';
    const secondCompanyEmail = 'integration_company_member@orgverify.com';
    const docKey = () => `org_verification_document/${crypto.randomUUID()}/${Date.now()}-verification.pdf`;
    let createdOrgId: string | null = null;

    beforeAll(async () => {
        await db.user.deleteMany({
            where: {
                email: {
                    in: [adminEmail, firstCompanyEmail, secondCompanyEmail],
                },
            },
        });
    });

    afterAll(async () => {
        await db.user.deleteMany({
            where: {
                email: {
                    in: [adminEmail, firstCompanyEmail, secondCompanyEmail],
                },
            },
        });

        if (createdOrgId) {
            await db.file.deleteMany({ where: { contextId: createdOrgId } });
            await db.org.deleteMany({ where: { id: createdOrgId } });
        }

        await db.$disconnect();
    });

    it('requires at least one verification document for company signup', async () => {
        await expect(
            authService.registerCompany({
                email: 'no-docs@orgverify.com',
                password: 'StrongPassword123!',
                companyName: 'No Docs Org',
                firstName: 'No',
                lastName: 'Docs',
                verificationDocumentKeys: [],
            })
        ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    });

    it('creates pending org verification and approves by university admin', async () => {
        const adminUser = await db.user.create({
            data: {
                email: adminEmail,
                passwordHash: 'placeholder-hash',
                role: 'UNIVERSITY_ADMIN',
                status: 'ACTIVE',
                emailVerifiedAt: new Date(),
            },
        });

        const registerResult = await authService.registerCompany({
            email: firstCompanyEmail,
            password: 'StrongPassword123!',
            companyName: 'Org Verify Inc',
            firstName: 'Org',
            lastName: 'Admin',
            verificationDocumentKeys: [docKey()],
        });

        createdOrgId = registerResult.orgId;
        expect(registerResult.nextStage).toBe('ORG_VERIFICATION');

        const createdOrg = await db.org.findUnique({ where: { id: registerResult.orgId } });
        expect(createdOrg?.verificationStatus).toBe('PENDING_REVIEW');
        expect(createdOrg?.verifiedDomains).toContain('orgverify.com');

        await db.user.update({
            where: { id: registerResult.userId },
            data: {
                status: 'PENDING_ORG_VERIFICATION',
                emailVerifiedAt: new Date(),
            },
        });

        const reviewed = await adminService.reviewOrgVerification(adminUser.id, registerResult.orgId, {
            action: 'APPROVE',
            reviewNotes: 'Documents validated',
            verifiedDomains: ['orgverify.com'],
        });
        expect(reviewed.verificationStatus).toBe('APPROVED');

        const adminCompanyUser = await db.user.findUnique({ where: { id: registerResult.userId } });
        expect(adminCompanyUser?.status).toBe('ACTIVE');
    });

    it('creates pending join request for existing approved domain and activates on company admin approval', async () => {
        const registerResult = await authService.registerCompany({
            email: secondCompanyEmail,
            password: 'StrongPassword123!',
            companyName: 'Org Verify Inc',
            firstName: 'Member',
            lastName: 'User',
            verificationDocumentKeys: [docKey()],
        });

        expect(registerResult.nextStage).toBe('ORG_JOIN_APPROVAL');
        expect(registerResult.orgId).toBe(createdOrgId);

        const memberUser = await db.user.findUnique({
            where: { id: registerResult.userId },
            include: { orgJoinRequest: true },
        });
        expect(memberUser?.role).toBe('COMPANY_MEMBER');
        expect(memberUser?.orgJoinRequest?.status).toBe('PENDING');

        await db.user.update({
            where: { id: registerResult.userId },
            data: {
                status: 'PENDING_ORG_APPROVAL',
                emailVerifiedAt: new Date(),
            },
        });

        const companyAdminUser = await db.user.findFirst({
            where: {
                orgId: createdOrgId!,
                role: 'COMPANY_ADMIN',
            },
        });
        expect(companyAdminUser).toBeTruthy();

        const reviewResult = await orgsService.reviewOrgJoinRequest(
            createdOrgId!,
            companyAdminUser!.id,
            memberUser!.orgJoinRequest!.id,
            { action: 'APPROVE' }
        );

        expect(reviewResult.status).toBe('APPROVED');

        const activatedUser = await db.user.findUnique({ where: { id: registerResult.userId } });
        expect(activatedUser?.status).toBe('ACTIVE');
        expect(activatedUser?.role).toBe('COMPANY_MEMBER');
    });
});
