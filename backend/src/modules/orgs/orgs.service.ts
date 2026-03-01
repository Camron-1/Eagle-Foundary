import crypto from 'crypto';
import { OrgJoinRequestStatus, OrgStatus, OrgVerificationStatus, UserRole, UserStatus } from '@prisma/client';
import { db } from '../../connectors/db.js';
import * as orgsRepo from './orgs.repo.js';
import { AppError, ForbiddenError, NotFoundError } from '../../middlewares/errorHandler.js';
import { ErrorCode } from '../../utils/response.js';
import { hashPassword } from '../../utils/security.js';
import { getEmailDomain, isValidCompanyEmail, normalizeEmail } from '../../utils/emailRules.js';
import {
    AddMemberInput,
    ListOrgJoinRequestsQuery,
    ListOrgsQuery,
    ReviewOrgJoinRequestInput,
    UpdateOrgInput,
} from './orgs.validators.js';

/**
 * Get current user's org
 */
export async function getMyOrg(orgId: string) {
    const org = await orgsRepo.findById(orgId);

    if (!org) {
        throw new NotFoundError('Organization');
    }

    return org;
}

/**
 * Update current user's org
 */
export async function updateMyOrg(orgId: string, data: UpdateOrgInput) {
    const org = await orgsRepo.findById(orgId);

    if (!org) {
        throw new NotFoundError('Organization');
    }

    return orgsRepo.updateOrg(orgId, data);
}

/**
 * Get org members
 */
export async function getMembers(orgId: string) {
    const org = await orgsRepo.findById(orgId);

    if (!org) {
        throw new NotFoundError('Organization');
    }

    return orgsRepo.getMembers(orgId);
}

/**
 * Add member to org (admin only)
 */
export async function addMember(orgId: string, _inviterId: string, data: AddMemberInput) {
    const org = await orgsRepo.findById(orgId);

    if (!org) {
        throw new NotFoundError('Organization');
    }

    if (org.status !== OrgStatus.ACTIVE || org.verificationStatus !== OrgVerificationStatus.APPROVED) {
        throw new AppError(ErrorCode.ORG_VERIFICATION_PENDING, 'Organization is not approved for member management', 403);
    }

    const email = normalizeEmail(data.email);
    const domain = getEmailDomain(email);

    if (!isValidCompanyEmail(email)) {
        throw new AppError(
            ErrorCode.BLOCKED_EMAIL_DOMAIN,
            'Please use a company email address',
            400
        );
    }

    if (!domain || !org.verifiedDomains.includes(domain)) {
        throw new AppError(
            ErrorCode.INVALID_EMAIL_DOMAIN,
            'Email domain is not approved for this organization',
            400
        );
    }

    const existingUser = await db.user.findUnique({ where: { email } });

    if (existingUser) {
        if (existingUser.orgId) {
            throw new AppError(ErrorCode.CONFLICT, 'User is already part of an organization', 409);
        }

        await orgsRepo.addMember(orgId, existingUser.id, data.role as 'COMPANY_ADMIN' | 'COMPANY_MEMBER');

        return { userId: existingUser.id, invited: false };
    }

    const tempPassword = await hashPassword(crypto.randomUUID());

    const newUser = await db.user.create({
        data: {
            email,
            passwordHash: tempPassword,
            role: data.role as UserRole,
            status: UserStatus.PENDING_OTP,
            orgId,
        },
    });

    return { userId: newUser.id, invited: true };
}

/**
 * Remove member from org (admin only)
 */
export async function removeMember(orgId: string, removerId: string, memberId: string) {
    const org = await orgsRepo.findById(orgId);

    if (!org) {
        throw new NotFoundError('Organization');
    }

    if (memberId === removerId) {
        throw new AppError(ErrorCode.CONFLICT, 'Cannot remove yourself', 400);
    }

    const member = await db.user.findUnique({ where: { id: memberId } });

    if (!member) {
        throw new NotFoundError('Member');
    }

    if (member.orgId !== orgId) {
        throw new ForbiddenError('Member is not part of your organization');
    }

    if (member.role === UserRole.COMPANY_ADMIN) {
        const adminCount = await orgsRepo.countAdmins(orgId);
        if (adminCount <= 1) {
            throw new AppError(
                ErrorCode.CONFLICT,
                'Cannot remove the last admin. Transfer admin rights first.',
                400
            );
        }
    }

    await orgsRepo.removeMember(memberId);
}

export async function listOrgJoinRequests(orgId: string, query: ListOrgJoinRequestsQuery) {
    const org = await orgsRepo.findById(orgId);

    if (!org) {
        throw new NotFoundError('Organization');
    }

    return orgsRepo.listOrgJoinRequests(
        orgId,
        query.cursor,
        query.limit,
        query.status as OrgJoinRequestStatus | undefined
    );
}

export async function reviewOrgJoinRequest(
    orgId: string,
    reviewerId: string,
    requestId: string,
    data: ReviewOrgJoinRequestInput
) {
    const joinRequest = await orgsRepo.findOrgJoinRequestById(requestId);

    if (!joinRequest || joinRequest.orgId !== orgId) {
        throw new NotFoundError('Organization join request');
    }

    if (joinRequest.status !== OrgJoinRequestStatus.PENDING) {
        throw new AppError(ErrorCode.CONFLICT, 'Join request has already been reviewed', 409);
    }

    const reviewedStatus = data.action === 'APPROVE'
        ? OrgJoinRequestStatus.APPROVED
        : OrgJoinRequestStatus.REJECTED;

    await db.$transaction(async (tx) => {
        await tx.orgJoinRequest.update({
            where: { id: requestId },
            data: {
                status: reviewedStatus,
                reviewedBy: reviewerId,
                reviewedAt: new Date(),
                adminNote: data.adminNote,
            },
        });

        await tx.user.update({
            where: { id: joinRequest.userId },
            data: {
                status: reviewedStatus === OrgJoinRequestStatus.APPROVED
                    ? UserStatus.ACTIVE
                    : UserStatus.PENDING_ORG_APPROVAL,
                role: reviewedStatus === OrgJoinRequestStatus.APPROVED
                    ? UserRole.COMPANY_MEMBER
                    : joinRequest.user.role,
            },
        });
    });

    return {
        success: true,
        status: reviewedStatus,
    };
}

/**
 * List active orgs (public)
 */
export async function listActiveOrgs(query: ListOrgsQuery) {
    return orgsRepo.listActiveOrgs(query.cursor, query.limit, query.search);
}

/**
 * Get org by ID (public profile)
 */
export async function getOrgById(orgId: string) {
    const org = await orgsRepo.findById(orgId);

    if (!org) {
        throw new NotFoundError('Organization');
    }

    if (org.status !== OrgStatus.ACTIVE || org.verificationStatus !== OrgVerificationStatus.APPROVED) {
        throw new NotFoundError('Organization');
    }

    return {
        id: org.id,
        name: org.name,
        description: org.description,
        website: org.website,
        logoUrl: org.logoUrl,
        isVerifiedBadge: org.isVerifiedBadge,
    };
}
