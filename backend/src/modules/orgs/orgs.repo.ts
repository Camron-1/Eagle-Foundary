import { OrgJoinRequestStatus } from '@prisma/client';
import { db } from '../../connectors/db.js';

export interface OrgData {
    id: string;
    name: string;
    description: string | null;
    website: string | null;
    logoUrl: string | null;
    status: string;
    isVerifiedBadge: boolean;
    verificationStatus: string;
    verificationSubmittedAt: Date | null;
    verificationReviewedAt: Date | null;
    verificationReviewNotes: string | null;
    verifiedDomains: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface OrgMemberData {
    id: string;
    email: string;
    role: string;
    createdAt: Date;
}

/**
 * Find org by ID
 */
export async function findById(id: string): Promise<OrgData | null> {
    return db.org.findUnique({ where: { id } });
}

/**
 * Find org with members
 */
export async function findByIdWithMembers(id: string) {
    return db.org.findUnique({
        where: { id },
        include: {
            members: {
                select: {
                    id: true,
                    email: true,
                    role: true,
                    createdAt: true,
                },
            },
        },
    });
}

/**
 * Update org
 */
export async function updateOrg(
    id: string,
    data: Partial<Omit<OrgData, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<OrgData> {
    return db.org.update({
        where: { id },
        data: data as any,
    });
}

/**
 * List active orgs with pagination
 */
export async function listActiveOrgs(
    cursor: string | undefined,
    limit: number,
    search?: string
) {
    const take = limit + 1;

    const where = {
        status: 'ACTIVE' as const,
        verificationStatus: 'APPROVED' as const,
        ...(search && {
            name: { contains: search, mode: 'insensitive' as const },
        }),
    };

    const orgs = await db.org.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        ...(cursor && {
            cursor: { id: cursor },
            skip: 1,
        }),
        select: {
            id: true,
            name: true,
            description: true,
            website: true,
            logoUrl: true,
            status: true,
            isVerifiedBadge: true,
            createdAt: true,
        },
    });

    const hasMore = orgs.length > limit;
    const items = hasMore ? orgs.slice(0, limit) : orgs;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    return { items, nextCursor, hasMore };
}

/**
 * Get org members
 */
export async function getMembers(orgId: string): Promise<OrgMemberData[]> {
    return db.user.findMany({
        where: { orgId },
        select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
        },
    });
}

/**
 * Add member to org
 */
export async function addMember(
    orgId: string,
    userId: string,
    role: 'COMPANY_ADMIN' | 'COMPANY_MEMBER' | 'COMPANY_VIEWER'
): Promise<void> {
    await db.user.update({
        where: { id: userId },
        data: { orgId, role },
    });
}

/**
 * Remove member from org
 */
export async function removeMember(userId: string): Promise<void> {
    await db.user.update({
        where: { id: userId },
        data: { orgId: null, role: 'COMPANY_MEMBER' },
    });
}

/**
 * Count members in org
 */
export async function countMembers(orgId: string): Promise<number> {
    return db.user.count({ where: { orgId } });
}

/**
 * Count admins in org
 */
export async function countAdmins(orgId: string): Promise<number> {
    return db.user.count({
        where: { orgId, role: 'COMPANY_ADMIN' },
    });
}

export async function listOrgJoinRequests(
    orgId: string,
    cursor: string | undefined,
    limit: number,
    status?: OrgJoinRequestStatus
) {
    const take = limit + 1;

    const items = await db.orgJoinRequest.findMany({
        where: {
            orgId,
            ...(status ? { status } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take,
        ...(cursor
            ? {
                cursor: { id: cursor },
                skip: 1,
            }
            : {}),
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    status: true,
                    createdAt: true,
                },
            },
        },
    });

    const hasMore = items.length > limit;
    const sliced = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore && sliced.length > 0 ? sliced[sliced.length - 1].id : null;

    return { items: sliced, nextCursor, hasMore };
}

export async function findOrgJoinRequestById(id: string) {
    return db.orgJoinRequest.findUnique({
        where: { id },
        include: {
            user: true,
            org: true,
        },
    });
}

export async function reviewOrgJoinRequest(
    id: string,
    data: {
        status: OrgJoinRequestStatus;
        reviewedBy: string;
        reviewedAt: Date;
        adminNote?: string | null;
    }
) {
    return db.orgJoinRequest.update({
        where: { id },
        data,
    });
}
