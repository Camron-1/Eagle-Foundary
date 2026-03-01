import { db } from '../../connectors/db.js';
import * as messagingRepo from './messaging.repo.js';
import { AppError, ForbiddenError, NotFoundError } from '../../middlewares/errorHandler.js';
import { publish } from '../../events/publish.js';
import { buildMessageSentEvent } from '../../events/builders.js';
import {
    ListMessagesQuery,
    ListThreadsQuery,
    RegisterMessageKeyInput,
    SendMessageInput,
} from './messaging.validators.js';
import { EncryptionConstants } from '../../config/constants.js';
import { env } from '../../config/env.js';
import { ErrorCode } from '../../utils/response.js';

type ThreadWithRelations = NonNullable<Awaited<ReturnType<typeof messagingRepo.findThreadById>>>;

function getThreadParticipantUserIds(thread: ThreadWithRelations): string[] {
    const participants = new Set<string>();

    for (const participant of thread.participants) {
        participants.add(participant.userId);
    }

    if (thread.application) {
        participants.add(thread.application.profile.user.id);
        for (const orgMember of thread.application.opportunity.org.members) {
            participants.add(orgMember.id);
        }
    }

    if (thread.joinRequest) {
        participants.add(thread.joinRequest.profile.user.id);
        for (const founder of thread.joinRequest.startup.members) {
            participants.add(founder.profile.userId);
        }
    }

    return Array.from(participants);
}

async function ensureThreadParticipants(threadId: string, userIds: string[]): Promise<void> {
    await Promise.all(
        userIds.map((participantUserId) =>
            db.messageThreadParticipant.upsert({
                where: {
                    threadId_userId: {
                        threadId,
                        userId: participantUserId,
                    },
                },
                update: {
                    removedAt: null,
                },
                create: {
                    threadId,
                    userId: participantUserId,
                },
            })
        )
    );
}

async function getAccessibleThread(userId: string, threadId: string): Promise<ThreadWithRelations> {
    const thread = await messagingRepo.findThreadById(threadId);
    if (!thread) {
        throw new NotFoundError('Thread');
    }

    const participantIds = getThreadParticipantUserIds(thread);
    if (!participantIds.includes(userId)) {
        throw new ForbiddenError('Access denied to this thread');
    }

    await ensureThreadParticipants(thread.id, participantIds);
    return thread;
}

function shouldRequireEncryptedPayload(thread: ThreadWithRelations): boolean {
    if (thread.isLegacyPlaintextThread && env.E2EE_ALLOW_LEGACY_THREADS) {
        return false;
    }

    if (thread.encryptionRequired) {
        return true;
    }

    return env.E2EE_REQUIRED;
}

export async function registerMessageKey(userId: string, input: RegisterMessageKeyInput) {
    return db.userMessageKey.upsert({
        where: { userId },
        update: {
            publicKeyPem: input.publicKeyPem,
            fingerprint: input.fingerprint,
            algorithm: input.algorithm || 'RSA-OAEP-SHA256',
            revokedAt: null,
        },
        create: {
            userId,
            publicKeyPem: input.publicKeyPem,
            fingerprint: input.fingerprint,
            algorithm: input.algorithm || 'RSA-OAEP-SHA256',
        },
        select: {
            userId: true,
            publicKeyPem: true,
            fingerprint: true,
            algorithm: true,
            createdAt: true,
        },
    });
}

export async function getMyMessageKey(userId: string) {
    const key = await db.userMessageKey.findUnique({
        where: { userId },
        select: {
            userId: true,
            publicKeyPem: true,
            fingerprint: true,
            algorithm: true,
            createdAt: true,
            revokedAt: true,
        },
    });

    if (!key || key.revokedAt) {
        throw new AppError(ErrorCode.NOT_FOUND, 'Message encryption key not found', 404);
    }

    return key;
}

export async function getThreadCryptoContext(userId: string, threadId: string) {
    const thread = await getAccessibleThread(userId, threadId);
    const participantIds = getThreadParticipantUserIds(thread);

    const [keys, envelopes] = await Promise.all([
        db.userMessageKey.findMany({
            where: {
                userId: { in: participantIds },
                revokedAt: null,
            },
            select: {
                userId: true,
                publicKeyPem: true,
                fingerprint: true,
                algorithm: true,
                createdAt: true,
            },
        }),
        db.messageKeyEnvelope.findMany({
            where: {
                threadId,
                keyVersion: thread.currentKeyVersion,
            },
            select: {
                userId: true,
                keyVersion: true,
                wrappedThreadKey: true,
                recipientKeyFingerprint: true,
                wrappedByUserId: true,
                createdAt: true,
            },
        }),
    ]);

    return {
        threadId: thread.id,
        encryptionRequired: thread.encryptionRequired || env.E2EE_REQUIRED,
        currentKeyVersion: thread.currentKeyVersion,
        isLegacyPlaintextThread: thread.isLegacyPlaintextThread,
        participants: participantIds,
        keys,
        keyEnvelopes: envelopes,
    };
}

export async function sendMessage(
    userId: string,
    threadId: string,
    data: SendMessageInput
) {
    const thread = await getAccessibleThread(userId, threadId);
    const requiresEncryptedPayload = shouldRequireEncryptedPayload(thread);
    const isEncrypted = Boolean(data.ciphertext);

    if (requiresEncryptedPayload && !isEncrypted) {
        throw new AppError(
            ErrorCode.VALIDATION_ERROR,
            'Encrypted payload is required for this thread',
            400
        );
    }

    if (isEncrypted) {
        const senderKey = await db.userMessageKey.findUnique({
            where: { userId },
            select: { fingerprint: true, revokedAt: true },
        });

        if (!senderKey || senderKey.revokedAt || senderKey.fingerprint !== data.senderKeyFingerprint) {
            throw new AppError(ErrorCode.FORBIDDEN, 'Invalid sender encryption key', 403);
        }
    }

    const message = await messagingRepo.createMessage({
        threadId,
        senderId: userId,
        content: isEncrypted ? null : (data.content ?? null),
        ciphertext: data.ciphertext ?? null,
        iv: data.iv ?? null,
        keyVersion: data.keyVersion ?? null,
        encryptionVersion: data.encryptionVersion ?? EncryptionConstants.DEFAULT_ENCRYPTION_VERSION,
        isEncrypted,
        senderKeyFingerprint: data.senderKeyFingerprint ?? null,
    });

    const participantIds = getThreadParticipantUserIds(thread);
    await ensureThreadParticipants(thread.id, participantIds);

    const nextKeyVersion = data.keyVersion && data.keyVersion > thread.currentKeyVersion
        ? data.keyVersion
        : thread.currentKeyVersion;

    await db.$transaction(async (tx) => {
        await tx.messageThread.update({
            where: { id: threadId },
            data: {
                updatedAt: new Date(),
                currentKeyVersion: nextKeyVersion,
            },
        });

        if (data.keyEnvelopes && data.keyEnvelopes.length > 0) {
            for (const envelope of data.keyEnvelopes) {
                await tx.messageKeyEnvelope.upsert({
                    where: {
                        threadId_userId_keyVersion: {
                            threadId,
                            userId: envelope.userId,
                            keyVersion: envelope.keyVersion,
                        },
                    },
                    update: {
                        wrappedThreadKey: envelope.wrappedThreadKey,
                        recipientKeyFingerprint: envelope.recipientKeyFingerprint,
                        wrappedByUserId: userId,
                    },
                    create: {
                        threadId,
                        userId: envelope.userId,
                        keyVersion: envelope.keyVersion,
                        wrappedThreadKey: envelope.wrappedThreadKey,
                        recipientKeyFingerprint: envelope.recipientKeyFingerprint,
                        wrappedByUserId: userId,
                    },
                });
            }
        }
    });

    const recipients = participantIds.filter((participantId) => participantId !== userId);
    if (recipients.length > 0) {
        const event = buildMessageSentEvent(
            message.id,
            threadId,
            userId,
            recipients[0],
            isEncrypted ? EncryptionConstants.MESSAGE_PREVIEW_REDACTED : (data.content ?? '').substring(0, 100)
        );
        await publish(event.type, event.payload);
    }

    return message;
}

export async function getMessages(
    userId: string,
    threadId: string,
    query: ListMessagesQuery
) {
    await getAccessibleThread(userId, threadId);
    return messagingRepo.getMessages(threadId, query.cursor, query.limit);
}

export async function getMyThreads(userId: string, query: ListThreadsQuery) {
    const result = await messagingRepo.getThreadsForUser(userId, query.cursor, query.limit);

    for (const thread of result.items) {
        if (thread.messages?.length && thread.messages[0].isEncrypted) {
            thread.messages[0].content = EncryptionConstants.MESSAGE_PREVIEW_REDACTED;
        }
    }

    return result;
}

export async function getThread(userId: string, threadId: string) {
    const thread = await getAccessibleThread(userId, threadId);
    return thread;
}

