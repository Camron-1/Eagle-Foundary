import {
    OrgStatus,
    OrgVerificationStatus,
    Prisma,
    ReportStatus,
    StartupStatus,
    UserStatus,
} from '@prisma/client';
import { db } from '../../connectors/db.js';
import { NotFoundError } from '../../middlewares/errorHandler.js';
import { publish } from '../../events/publish.js';
import { buildStartupApprovedEvent, buildStartupRejectedEvent } from '../../events/builders.js';
import {
    ListAdminQuery,
    ListOrgVerificationsQuery,
    ReviewOrgVerificationInput,
    ReviewStartupInput,
    UpdateOrgStatusInput,
    UpdateUserStatusInput,
} from './admin.validators.js';
import { generatePresignedDownloadUrl } from '../../connectors/s3.js';
import * as authService from '../auth/auth.service.js';
import { createNotification } from '../notifications/notifications.service.js';
import { NotificationType } from '../../config/constants.js';
import { sendEmail } from '../../connectors/ses.js';
import { logger } from '../../connectors/logger.js';
import { decryptTextValue, type EncryptedEnvelope } from '../../utils/fieldEncryption.js';

/**
 * Get pending startups for review
 */
export async function getPendingStartups(query: ListAdminQuery) {
    const take = query.limit + 1;

    const startups = await db.startup.findMany({
        where: { status: StartupStatus.SUBMITTED },
        orderBy: { createdAt: 'asc' },
        take,
        ...(query.cursor && {
            cursor: { id: query.cursor },
            skip: 1,
        }),
        include: {
            members: {
                where: { role: 'founder' },
                include: {
                    profile: {
                        select: { firstName: true, lastName: true },
                    },
                },
            },
        },
    });

    const hasMore = startups.length > query.limit;
    const items = hasMore ? startups.slice(0, query.limit) : startups;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    return { items, nextCursor, hasMore };
}

/**
 * Review a startup
 */
export async function reviewStartup(
    adminUserId: string,
    startupId: string,
    data: ReviewStartupInput
) {
    const startup = await db.startup.findUnique({
        where: { id: startupId },
        include: {
            members: {
                where: { role: 'founder' },
                include: {
                    profile: {
                        include: { user: { select: { id: true, email: true } } },
                    },
                },
            },
        },
    });

    if (!startup) {
        throw new NotFoundError('Startup');
    }

    let newStatus: StartupStatus;
    switch (data.action) {
        case 'APPROVE':
            newStatus = StartupStatus.APPROVED;
            break;
        case 'REJECT':
            newStatus = StartupStatus.ARCHIVED;
            break;
        case 'REQUEST_CHANGES':
            newStatus = StartupStatus.NEEDS_CHANGES;
            break;
    }

    const updated = await db.startup.update({
        where: { id: startupId },
        data: {
            status: newStatus,
            adminFeedback: data.feedback,
        },
    });

    await db.auditLog.create({
        data: {
            userId: adminUserId,
            action: `STARTUP_${data.action}`,
            targetType: 'STARTUP',
            targetId: startupId,
            details: { feedback: data.feedback } as Prisma.JsonObject,
        },
    });

    const founder = startup.members[0]?.profile;
    if (founder) {
        if (data.action === 'APPROVE') {
            const event = buildStartupApprovedEvent(
                startupId,
                startup.name,
                founder.user.id,
                founder.user.email
            );
            await publish(event.type, event.payload);
        } else if (data.action === 'REJECT' || data.action === 'REQUEST_CHANGES') {
            const event = buildStartupRejectedEvent(
                startupId,
                startup.name,
                founder.user.id,
                founder.user.email,
                data.feedback || ''
            );
            await publish(event.type, event.payload);
        }
    }

    return updated;
}

/**
 * List all users (admin only)
 */
export async function listUsers(query: ListAdminQuery) {
    const take = query.limit + 1;

    const users = await db.user.findMany({
        where: query.status ? { status: query.status as UserStatus } : undefined,
        orderBy: { createdAt: 'desc' },
        take,
        ...(query.cursor && {
            cursor: { id: query.cursor },
            skip: 1,
        }),
        select: {
            id: true,
            email: true,
            role: true,
            status: true,
            mfaEnabled: true,
            createdAt: true,
            studentProfile: { select: { firstName: true, lastName: true } },
            org: { select: { id: true, name: true } },
        },
    });

    const hasMore = users.length > query.limit;
    const items = hasMore ? users.slice(0, query.limit) : users;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    return { items, nextCursor, hasMore };
}

/**
 * Update user status
 */
export async function updateUserStatus(
    adminUserId: string,
    userId: string,
    data: UpdateUserStatusInput
) {
    const user = await db.user.findUnique({ where: { id: userId } });

    if (!user) {
        throw new NotFoundError('User');
    }

    const updated = await db.user.update({
        where: { id: userId },
        data: { status: data.status as UserStatus },
    });

    await db.auditLog.create({
        data: {
            userId: adminUserId,
            action: `USER_${data.status}`,
            targetType: 'USER',
            targetId: userId,
            details: { reason: data.reason } as Prisma.JsonObject,
        },
    });

    return updated;
}

/**
 * List all orgs (admin only)
 */
export async function listOrgs(query: ListAdminQuery) {
    const take = query.limit + 1;

    const orgs = await db.org.findMany({
        where: query.status ? { status: query.status as OrgStatus } : undefined,
        orderBy: { createdAt: 'desc' },
        take,
        ...(query.cursor && {
            cursor: { id: query.cursor },
            skip: 1,
        }),
        include: {
            _count: { select: { members: true, opportunities: true, joinRequests: true } },
        },
    });

    const hasMore = orgs.length > query.limit;
    const items = hasMore ? orgs.slice(0, query.limit) : orgs;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    return { items, nextCursor, hasMore };
}

export async function listOrgVerifications(query: ListOrgVerificationsQuery) {
    const take = query.limit + 1;

    const orgs = await db.org.findMany({
        where: {
            ...(query.status ? { verificationStatus: query.status as OrgVerificationStatus } : {}),
        },
        orderBy: { verificationSubmittedAt: 'asc' },
        take,
        ...(query.cursor
            ? {
                cursor: { id: query.cursor },
                skip: 1,
            }
            : {}),
        include: {
            _count: {
                select: {
                    members: true,
                },
            },
        },
    });

    const hasMore = orgs.length > query.limit;
    const items = hasMore ? orgs.slice(0, query.limit) : orgs;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    return { items, nextCursor, hasMore };
}

export async function getOrgVerificationDocuments(orgId: string) {
    const org = await db.org.findUnique({
        where: { id: orgId },
        select: { id: true, name: true },
    });

    if (!org) {
        throw new NotFoundError('Organization');
    }

    const files = await db.file.findMany({
        where: {
            context: 'org_verification_document',
            contextId: orgId,
        },
        orderBy: { createdAt: 'desc' },
    });

    const items = await Promise.all(
        files.map(async (file) => {
            const objectKey = await resolveFileKey(file.s3Key, file.s3KeyEncrypted);
            const download = await generatePresignedDownloadUrl(objectKey);
            return {
                id: file.id,
                filename: file.filename,
                createdAt: file.createdAt,
                downloadUrl: download.downloadUrl,
                expiresAt: download.expiresAt,
            };
        })
    );

    return {
        org,
        items,
    };
}

async function resolveFileKey(s3Key: string, s3KeyEncrypted: unknown): Promise<string> {
    if (s3KeyEncrypted && typeof s3KeyEncrypted === 'object') {
        try {
            return await decryptTextValue(
                s3KeyEncrypted as EncryptedEnvelope,
                'file_s3_key',
                s3Key
            );
        } catch {
            return s3Key;
        }
    }

    return s3Key;
}

export async function reviewOrgVerification(
    adminUserId: string,
    orgId: string,
    data: ReviewOrgVerificationInput
) {
    const org = await db.org.findUnique({
        where: { id: orgId },
        include: {
            members: {
                select: {
                    id: true,
                    email: true,
                    role: true,
                    status: true,
                },
            },
        },
    });

    if (!org) {
        throw new NotFoundError('Organization');
    }

    const actionStatus = data.action === 'APPROVE'
        ? OrgVerificationStatus.APPROVED
        : OrgVerificationStatus.REJECTED;

    const normalizedDomains = data.verifiedDomains
        ?.map((domain) => domain.toLowerCase().trim())
        .filter(Boolean);

    const updatedOrg = await db.$transaction(async (tx) => {
        const updated = await tx.org.update({
            where: { id: orgId },
            data: {
                verificationStatus: actionStatus,
                verificationReviewedAt: new Date(),
                verificationReviewNotes: data.reviewNotes,
                ...(normalizedDomains && normalizedDomains.length > 0
                    ? { verifiedDomains: Array.from(new Set(normalizedDomains)) }
                    : {}),
                ...(actionStatus === OrgVerificationStatus.APPROVED
                    ? {
                        status: OrgStatus.ACTIVE,
                        isVerifiedBadge: true,
                    }
                    : {
                        status: OrgStatus.PENDING_OTP,
                        isVerifiedBadge: false,
                    }),
            },
        });

        if (actionStatus === OrgVerificationStatus.APPROVED) {
            await tx.user.updateMany({
                where: {
                    orgId,
                    status: UserStatus.PENDING_ORG_VERIFICATION,
                },
                data: {
                    status: UserStatus.ACTIVE,
                },
            });

            const approvedJoinRequests = await tx.orgJoinRequest.findMany({
                where: {
                    orgId,
                    status: 'APPROVED',
                },
                select: { userId: true },
            });

            await tx.user.updateMany({
                where: {
                    id: { in: approvedJoinRequests.map((item) => item.userId) },
                    status: UserStatus.PENDING_ORG_APPROVAL,
                },
                data: {
                    status: UserStatus.ACTIVE,
                },
            });
        }

        await tx.auditLog.create({
            data: {
                userId: adminUserId,
                action: `ORG_VERIFICATION_${data.action}`,
                targetType: 'ORG',
                targetId: orgId,
                details: {
                    reviewNotes: data.reviewNotes,
                    verifiedDomains: normalizedDomains || null,
                } as Prisma.JsonObject,
            },
        });

        return updated;
    });

    const companyAdmins = org.members.filter((member) => member.role === 'COMPANY_ADMIN');

    for (const admin of companyAdmins) {
        const notificationType = actionStatus === OrgVerificationStatus.APPROVED
            ? NotificationType.ORG_VERIFICATION_APPROVED
            : NotificationType.ORG_VERIFICATION_REJECTED;

        const title = actionStatus === OrgVerificationStatus.APPROVED
            ? 'Organization verified'
            : 'Organization verification update';

        const message = actionStatus === OrgVerificationStatus.APPROVED
            ? `${org.name} has been approved. You can now access company features.`
            : `${org.name} verification needs updates. Review admin notes and resubmit documents.`;

        try {
            await createNotification(admin.id, notificationType, title, message, {
                orgId,
                reviewNotes: data.reviewNotes,
            });
        } catch (error) {
            logger.warn({ orgId, userId: admin.id, error }, 'Failed to create org verification notification');
        }

        try {
            await sendEmail({
                to: admin.email,
                subject: actionStatus === OrgVerificationStatus.APPROVED
                    ? 'Eagle-Foundry Organization Verification Approved'
                    : 'Eagle-Foundry Organization Verification Update',
                htmlBody: `<p>${message}</p>${data.reviewNotes ? `<p>Notes: ${data.reviewNotes}</p>` : ''}`,
                textBody: `${message}${data.reviewNotes ? `\nNotes: ${data.reviewNotes}` : ''}`,
            });
        } catch (error) {
            logger.warn({ orgId, email: admin.email, error }, 'Failed to send org verification email');
        }
    }

    return updatedOrg;
}

export async function resetUserMfa(adminUserId: string, userId: string): Promise<{ success: boolean }> {
    await authService.adminResetUserMfa(adminUserId, userId);
    return { success: true };
}

/**
 * Update org status
 */
export async function updateOrgStatus(
    adminUserId: string,
    orgId: string,
    data: UpdateOrgStatusInput
) {
    const org = await db.org.findUnique({ where: { id: orgId } });

    if (!org) {
        throw new NotFoundError('Organization');
    }

    const updated = await db.org.update({
        where: { id: orgId },
        data: { status: data.status as OrgStatus },
    });

    if (data.status === 'SUSPENDED') {
        await db.user.updateMany({
            where: { orgId },
            data: { status: UserStatus.SUSPENDED },
        });
    }

    await db.auditLog.create({
        data: {
            userId: adminUserId,
            action: `ORG_${data.status}`,
            targetType: 'ORG',
            targetId: orgId,
            details: { reason: data.reason } as Prisma.JsonObject,
        },
    });

    return updated;
}

/**
 * Get dashboard stats
 */
export async function getDashboardStats() {
    const [
        totalUsers,
        activeUsers,
        pendingUsers,
        totalOrgs,
        activeOrgs,
        pendingOrgVerifications,
        totalStartups,
        approvedStartups,
        pendingStartups,
        totalOpportunities,
        publishedOpportunities,
        totalApplications,
        pendingReports,
    ] = await Promise.all([
        db.user.count(),
        db.user.count({ where: { status: UserStatus.ACTIVE } }),
        db.user.count({
            where: {
                status: {
                    in: [
                        UserStatus.PENDING_OTP,
                        UserStatus.PENDING_ORG_VERIFICATION,
                        UserStatus.PENDING_ORG_APPROVAL,
                    ],
                },
            },
        }),
        db.org.count(),
        db.org.count({ where: { status: OrgStatus.ACTIVE } }),
        db.org.count({ where: { verificationStatus: OrgVerificationStatus.PENDING_REVIEW } }),
        db.startup.count(),
        db.startup.count({ where: { status: StartupStatus.APPROVED } }),
        db.startup.count({ where: { status: StartupStatus.SUBMITTED } }),
        db.opportunity.count(),
        db.opportunity.count({ where: { status: 'PUBLISHED' } }),
        db.application.count(),
        db.report.count({ where: { status: ReportStatus.PENDING } }),
    ]);

    return {
        users: { total: totalUsers, active: activeUsers, pending: pendingUsers },
        orgs: { total: totalOrgs, active: activeOrgs, pendingVerification: pendingOrgVerifications },
        startups: { total: totalStartups, approved: approvedStartups, pending: pendingStartups },
        opportunities: { total: totalOpportunities, published: publishedOpportunities },
        applications: { total: totalApplications },
        reports: { pending: pendingReports },
    };
}

/**
 * Get audit logs
 */
export async function getAuditLogs(query: ListAdminQuery) {
    const take = query.limit + 1;

    const logs = await db.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take,
        ...(query.cursor && {
            cursor: { id: query.cursor },
            skip: 1,
        }),
    });

    const hasMore = logs.length > query.limit;
    const items = hasMore ? logs.slice(0, query.limit) : logs;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    return { items, nextCursor, hasMore };
}
