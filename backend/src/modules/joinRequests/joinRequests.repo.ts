import { db } from '../../connectors/db.js';
import type { Prisma } from '@prisma/client';

type JoinRequestStatusType = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

function toInputJson(value: Record<string, unknown> | null | undefined): Prisma.InputJsonValue | undefined {
    if (value == null) {
        return undefined;
    }

    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

/**
 * Create join request
 */
export async function createJoinRequest(data: {
    startupId: string;
    profileId: string;
    message?: string | null;
    formAnswers?: Record<string, unknown> | null;
    sensitivePayloadEncrypted?: Record<string, unknown> | null;
}) {
    return db.joinRequest.create({
        data: {
            startupId: data.startupId,
            profileId: data.profileId,
            message: data.message,
            formAnswers: toInputJson(data.formAnswers),
            sensitivePayloadEncrypted: toInputJson(data.sensitivePayloadEncrypted),
            status: 'PENDING',
        },
        include: {
            startup: { select: { id: true, name: true } },
            profile: { select: { id: true, firstName: true, lastName: true, userId: true } },
        },
    });
}

/**
 * Find join request by ID
 */
export async function findById(id: string) {
    return db.joinRequest.findUnique({
        where: { id },
        include: {
            startup: {
                include: {
                    members: {
                        where: { role: 'founder' },
                        include: {
                            profile: {
                                include: {
                                    user: { select: { id: true, email: true } },
                                },
                            },
                        },
                    },
                },
            },
            profile: {
                include: {
                    user: { select: { id: true, email: true } },
                },
            },
        },
    });
}

/**
 * Find existing pending request
 */
export async function findExistingRequest(startupId: string, profileId: string) {
    return db.joinRequest.findFirst({
        where: {
            startupId,
            profileId,
            status: 'PENDING',
        },
    });
}

/**
 * Update join request
 */
export async function updateJoinRequest(id: string, data: {
    status: JoinRequestStatusType;
    threadId?: string;
}) {
    return db.joinRequest.update({
        where: { id },
        data,
    });
}

/**
 * List join requests for a profile
 */
export async function listByProfileId(
    profileId: string,
    cursor: string | undefined,
    limit: number,
    status?: JoinRequestStatusType
) {
    const take = limit + 1;

    const requests = await db.joinRequest.findMany({
        where: {
            profileId,
            ...(status && { status }),
        },
        orderBy: { createdAt: 'desc' },
        take,
        ...(cursor && {
            cursor: { id: cursor },
            skip: 1,
        }),
        include: {
            startup: { select: { id: true, name: true, logoUrl: true } },
        },
    });

    const hasMore = requests.length > limit;
    const items = hasMore ? requests.slice(0, limit) : requests;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    return { items, nextCursor, hasMore };
}

/**
 * List join requests for a startup
 */
export async function listByStartupId(
    startupId: string,
    cursor: string | undefined,
    limit: number,
    status?: JoinRequestStatusType
) {
    const take = limit + 1;

    const requests = await db.joinRequest.findMany({
        where: {
            startupId,
            ...(status && { status }),
        },
        orderBy: { createdAt: 'desc' },
        take,
        ...(cursor && {
            cursor: { id: cursor },
            skip: 1,
        }),
        include: {
            profile: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    major: true,
                    skills: true,
                },
            },
        },
    });

    const hasMore = requests.length > limit;
    const items = hasMore ? requests.slice(0, limit) : requests;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    return { items, nextCursor, hasMore };
}
