import { db } from '../../connectors/db.js';

export async function findThreadById(threadId: string) {
    return db.messageThread.findUnique({
        where: { id: threadId },
        include: {
            participants: {
                where: { removedAt: null },
                select: { userId: true },
            },
            keyEnvelopes: {
                orderBy: { createdAt: 'desc' },
            },
            application: {
                include: {
                    profile: { include: { user: { select: { id: true } } } },
                    opportunity: {
                        include: {
                            org: { include: { members: { select: { id: true } } } },
                        },
                    },
                },
            },
            joinRequest: {
                include: {
                    profile: { include: { user: { select: { id: true } } } },
                    startup: {
                        include: {
                            members: {
                                where: { role: 'founder' },
                                include: {
                                    profile: { select: { userId: true } },
                                },
                            },
                        },
                    },
                },
            },
        },
    });
}

export async function createMessage(data: {
    threadId: string;
    senderId: string;
    content?: string | null;
    ciphertext?: string | null;
    iv?: string | null;
    keyVersion?: number | null;
    encryptionVersion?: number | null;
    isEncrypted: boolean;
    senderKeyFingerprint?: string | null;
}) {
    return db.message.create({
        data: {
            threadId: data.threadId,
            senderId: data.senderId,
            content: data.content,
            ciphertext: data.ciphertext,
            iv: data.iv,
            keyVersion: data.keyVersion,
            encryptionVersion: data.encryptionVersion,
            isEncrypted: data.isEncrypted,
            senderKeyFingerprint: data.senderKeyFingerprint,
        },
    });
}

export async function getMessages(
    threadId: string,
    cursor: string | undefined,
    limit: number
) {
    const take = limit + 1;

    const messages = await db.message.findMany({
        where: { threadId },
        orderBy: { createdAt: 'desc' },
        take,
        ...(cursor && {
            cursor: { id: cursor },
            skip: 1,
        }),
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    return { items: items.reverse(), nextCursor, hasMore };
}

export async function getThreadsForUser(userId: string, cursor: string | undefined, limit: number) {
    const profile = await db.studentProfile.findUnique({
        where: { userId },
        select: { id: true },
    });

    const user = await db.user.findUnique({
        where: { id: userId },
        select: { orgId: true },
    });

    const take = limit + 1;
    const orConditions: object[] = [];

    if (profile) {
        orConditions.push({ application: { profileId: profile.id } });
        orConditions.push({ joinRequest: { profileId: profile.id } });
    }

    if (user?.orgId) {
        orConditions.push({ application: { opportunity: { orgId: user.orgId } } });
    }

    if (orConditions.length === 0) {
        return { items: [], nextCursor: null, hasMore: false };
    }

    const threads = await db.messageThread.findMany({
        where: { OR: orConditions },
        orderBy: { updatedAt: 'desc' },
        take,
        ...(cursor && {
            cursor: { id: cursor },
            skip: 1,
        }),
        include: {
            messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
            },
            application: {
                include: {
                    profile: { select: { firstName: true, lastName: true } },
                    opportunity: { select: { title: true } },
                },
            },
            joinRequest: {
                include: {
                    profile: { select: { firstName: true, lastName: true } },
                    startup: { select: { name: true } },
                },
            },
        },
    });

    const hasMore = threads.length > limit;
    const items = hasMore ? threads.slice(0, limit) : threads;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    return { items, nextCursor, hasMore };
}

