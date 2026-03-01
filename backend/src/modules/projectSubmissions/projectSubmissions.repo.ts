import { db } from '../../connectors/db.js';
import type { Prisma, PrismaClient } from '@prisma/client';

type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

const ApplicationStatusValues = {
    SUBMITTED: 'SUBMITTED',
    SHORTLISTED: 'SHORTLISTED',
    INTERVIEW: 'INTERVIEW',
    SELECTED: 'SELECTED',
    REJECTED: 'REJECTED',
    WITHDRAWN: 'WITHDRAWN',
} as const;

type ApplicationStatusType = (typeof ApplicationStatusValues)[keyof typeof ApplicationStatusValues];

function toInputJson(value: Record<string, unknown> | null | undefined): Prisma.InputJsonValue | undefined {
    if (value == null) {
        return undefined;
    }

    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function createProjectSubmission(data: {
    projectId: string;
    profileId: string;
    coverLetter?: string | null;
    resumeUrl?: string | null;
    formAnswers?: Record<string, unknown> | null;
    sensitivePayloadEncrypted?: Record<string, unknown> | null;
}) {
    return db.projectSubmission.create({
        data: {
            projectId: data.projectId,
            profileId: data.profileId,
            coverLetter: data.coverLetter,
            resumeUrl: data.resumeUrl,
            formAnswers: toInputJson(data.formAnswers),
            sensitivePayloadEncrypted: toInputJson(data.sensitivePayloadEncrypted),
            status: 'SUBMITTED',
            statusHistory: {
                create: {
                    toStatus: 'SUBMITTED',
                    changedBy: data.profileId,
                },
            },
        },
        include: {
            project: { select: { id: true, title: true } },
            profile: { select: { id: true, firstName: true, lastName: true } },
        },
    });
}

export async function findById(id: string) {
    return db.projectSubmission.findUnique({
        where: { id },
        include: {
            project: {
                include: {
                    org: { select: { id: true, name: true } },
                },
            },
            profile: {
                include: {
                    user: { select: { id: true, email: true } },
                },
            },
            statusHistory: {
                orderBy: { createdAt: 'desc' },
            },
        },
    });
}

export async function findExistingProjectSubmission(projectId: string, profileId: string) {
    return db.projectSubmission.findFirst({
        where: {
            projectId,
            profileId,
            status: { not: 'WITHDRAWN' },
        },
    });
}

export async function updateProjectSubmission(
    id: string,
    data: {
        status?: ApplicationStatusType;
        threadId?: string;
    },
    tx?: TransactionClient
) {
    const client = tx ?? db;
    return client.projectSubmission.update({
        where: { id },
        data,
    });
}

export async function addStatusHistory(
    data: {
        projectSubmissionId: string;
        fromStatus: ApplicationStatusType | null;
        toStatus: ApplicationStatusType;
        changedBy: string;
        note?: string | null;
    },
    tx?: TransactionClient
) {
    const client = tx ?? db;
    return client.projectSubmissionStatusHistory.create({ data });
}

export async function listByProfileId(
    profileId: string,
    cursor: string | undefined,
    limit: number,
    status?: ApplicationStatusType
) {
    const take = limit + 1;

    const submissions = await db.projectSubmission.findMany({
        where: {
            profileId,
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
            project: {
                select: {
                    id: true,
                    title: true,
                    status: true,
                    budgetType: true,
                    budgetRange: true,
                    tags: true,
                    publishedAt: true,
                    closedAt: true,
                    estimatedDuration: true,
                    deadline: true,
                    org: { select: { id: true, name: true } },
                    _count: { select: { submissions: true } },
                },
            },
        },
    });

    const hasMore = submissions.length > limit;
    const items = hasMore ? submissions.slice(0, limit) : submissions;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    return { items, nextCursor, hasMore };
}

export async function listByProjectId(
    projectId: string,
    cursor: string | undefined,
    limit: number,
    status?: ApplicationStatusType
) {
    const take = limit + 1;

    const submissions = await db.projectSubmission.findMany({
        where: {
            projectId,
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
            profile: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    major: true,
                    skills: true,
                    resumeUrl: true,
                },
            },
        },
    });

    const hasMore = submissions.length > limit;
    const items = hasMore ? submissions.slice(0, limit) : submissions;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    return { items, nextCursor, hasMore };
}
