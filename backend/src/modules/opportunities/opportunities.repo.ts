import { Prisma } from '@prisma/client';
import { db } from '../../connectors/db.js';

/**
 * Create opportunity
 */
export async function createOpportunity(data: {
    orgId: string;
    title: string;
    description?: string | null;
    requirements?: string | null;
    budgetType?: string | null;
    budgetRange?: string | null;
    tags?: string[];
}) {
    return db.opportunity.create({
        data: {
            orgId: data.orgId,
            title: data.title,
            description: data.description,
            requirements: data.requirements,
            budgetType: data.budgetType,
            budgetRange: data.budgetRange,
            tags: data.tags || [],
            status: 'DRAFT',
        },
        include: {
            org: { select: { id: true, name: true, logoUrl: true, isVerifiedBadge: true } },
        },
    });
}

/**
 * Find opportunity by ID
 */
export async function findById(id: string) {
    return db.opportunity.findUnique({
        where: { id },
        include: {
            org: { select: { id: true, name: true, logoUrl: true, isVerifiedBadge: true, status: true, verificationStatus: true } },
        },
    });
}

/**
 * Update opportunity
 */
export async function updateOpportunity(
    id: string,
    data: Partial<{
        title: string;
        description: string | null;
        requirements: string | null;
        budgetType: string | null;
        budgetRange: string | null;
        tags: string[];
        status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
        publishedAt: Date | null;
        closedAt: Date | null;
    }>
) {
    return db.opportunity.update({
        where: { id },
        data,
        include: {
            org: { select: { id: true, name: true, logoUrl: true, isVerifiedBadge: true } },
        },
    });
}

/**
 * List opportunities (for students - published only from active orgs)
 */
export async function listPublishedOpportunities(
    cursor: string | undefined,
    limit: number,
    filters: {
        budgetType?: string;
        tags?: string[];
        search?: string;
    }
) {
    const take = limit + 1;

    const where: Prisma.OpportunityWhereInput = {
        status: 'PUBLISHED',
        org: { status: 'ACTIVE', verificationStatus: 'APPROVED' },
        ...(filters.budgetType && { budgetType: filters.budgetType }),
        ...(filters.tags?.length && { tags: { hasSome: filters.tags } }),
        ...(filters.search && {
            OR: [
                { title: { contains: filters.search, mode: 'insensitive' as const } },
                { description: { contains: filters.search, mode: 'insensitive' as const } },
            ],
        }),
    };

    const opportunities = await db.opportunity.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        take,
        ...(cursor && {
            cursor: { id: cursor },
            skip: 1,
        }),
        include: {
            org: { select: { id: true, name: true, logoUrl: true, isVerifiedBadge: true } },
            _count: { select: { applications: true } },
        },
    });

    const hasMore = opportunities.length > limit;
    const items = hasMore ? opportunities.slice(0, limit) : opportunities;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    return { items, nextCursor, hasMore };
}

/**
 * List opportunities for an org
 */
export async function listByOrgId(
    orgId: string,
    cursor: string | undefined,
    limit: number,
    status?: 'DRAFT' | 'PUBLISHED' | 'CLOSED'
) {
    const take = limit + 1;

    const opportunities = await db.opportunity.findMany({
        where: {
            orgId,
            ...(status && { status }),
        },
        orderBy: { createdAt: 'desc' },
        take,
        ...(cursor && {
            cursor: { id: cursor },
            skip: 1,
        }),
        include: {
            _count: { select: { applications: true } },
        },
    });

    const hasMore = opportunities.length > limit;
    const items = hasMore ? opportunities.slice(0, limit) : opportunities;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    return { items, nextCursor, hasMore };
}
