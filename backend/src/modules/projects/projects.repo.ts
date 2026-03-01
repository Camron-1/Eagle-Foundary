import { Prisma, ProjectStatus } from '@prisma/client';
import { db } from '../../connectors/db.js';

export async function createProject(data: {
    orgId: string;
    title: string;
    description?: string | null;
    requirements?: string | null;
    budgetType?: string | null;
    budgetRange?: string | null;
    estimatedDuration?: string | null;
    deadline?: Date | null;
    tags?: string[];
    customQuestions?: unknown;
}) {
    return db.project.create({
        data: {
            orgId: data.orgId,
            title: data.title,
            description: data.description,
            requirements: data.requirements,
            budgetType: data.budgetType,
            budgetRange: data.budgetRange,
            estimatedDuration: data.estimatedDuration,
            deadline: data.deadline,
            tags: data.tags || [],
            customQuestions: data.customQuestions as Prisma.InputJsonValue | undefined,
            status: 'DRAFT',
        },
        include: {
            org: { select: { id: true, name: true, logoUrl: true, isVerifiedBadge: true } },
        },
    });
}

export async function findById(id: string) {
    return db.project.findUnique({
        where: { id },
        include: {
            org: {
                select: {
                    id: true,
                    name: true,
                    logoUrl: true,
                    isVerifiedBadge: true,
                    status: true,
                    verificationStatus: true,
                },
            },
        },
    });
}

export async function updateProject(
    id: string,
    data: Partial<{
        title: string;
        description: string | null;
        requirements: string | null;
        budgetType: string | null;
        budgetRange: string | null;
        estimatedDuration: string | null;
        deadline: Date | null;
        tags: string[];
        customQuestions: unknown;
        status: ProjectStatus;
        publishedAt: Date | null;
        closedAt: Date | null;
    }>
) {
    const { customQuestions, ...rest } = data;
    return db.project.update({
        where: { id },
        data: {
            ...rest,
            ...(customQuestions !== undefined
                ? {
                    customQuestions:
                        customQuestions === null
                            ? Prisma.DbNull
                            : (customQuestions as Prisma.InputJsonValue),
                }
                : {}),
        },
        include: {
            org: { select: { id: true, name: true, logoUrl: true, isVerifiedBadge: true } },
        },
    });
}

export async function listPublishedProjects(
    cursor: string | undefined,
    limit: number,
    filters: {
        budgetType?: string;
        tags?: string[];
        search?: string;
    }
) {
    const take = limit + 1;

    const where: Prisma.ProjectWhereInput = {
        status: 'PUBLISHED',
        org: { status: 'ACTIVE', verificationStatus: 'APPROVED' },
        ...(filters.budgetType && { budgetType: filters.budgetType }),
        ...(filters.tags?.length && { tags: { hasSome: filters.tags } }),
        ...(filters.search && {
            OR: [
                { title: { contains: filters.search, mode: 'insensitive' as const } },
                { description: { contains: filters.search, mode: 'insensitive' as const } },
                { requirements: { contains: filters.search, mode: 'insensitive' as const } },
            ],
        }),
    };

    const projects = await db.project.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        take,
        ...(cursor
            ? {
                cursor: { id: cursor },
                skip: 1,
            }
            : {}),
        include: {
            org: { select: { id: true, name: true, logoUrl: true, isVerifiedBadge: true } },
            _count: { select: { submissions: true } },
        },
    });

    const hasMore = projects.length > limit;
    const items = hasMore ? projects.slice(0, limit) : projects;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    return { items, nextCursor, hasMore };
}

export async function listByOrgId(
    orgId: string,
    cursor: string | undefined,
    limit: number,
    status?: ProjectStatus
) {
    const take = limit + 1;

    const projects = await db.project.findMany({
        where: {
            orgId,
            ...(status ? { status } : {}),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take,
        ...(cursor
            ? {
                cursor: { id: cursor },
                skip: 1,
            }
            : {}),
        include: {
            _count: { select: { submissions: true } },
        },
    });

    const hasMore = projects.length > limit;
    const items = hasMore ? projects.slice(0, limit) : projects;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    return { items, nextCursor, hasMore };
}
