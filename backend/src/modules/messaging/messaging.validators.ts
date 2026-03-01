import { z } from 'zod';

export const messageKeyEnvelopeSchema = z.object({
    userId: z.string().uuid(),
    keyVersion: z.number().int().min(1),
    wrappedThreadKey: z.string().min(20).max(4096),
    recipientKeyFingerprint: z.string().min(8).max(256),
});

export const sendMessageSchema = z
    .object({
        content: z.string().min(1, 'Message cannot be empty').max(5000).optional(),
        ciphertext: z.string().min(16).max(25000).optional(),
        iv: z.string().min(8).max(512).optional(),
        keyVersion: z.number().int().min(1).optional(),
        encryptionVersion: z.number().int().min(1).optional(),
        senderKeyFingerprint: z.string().min(8).max(256).optional(),
        keyEnvelopes: z.array(messageKeyEnvelopeSchema).max(100).optional(),
    })
    .superRefine((value, ctx) => {
        const hasPlain = !!value.content;
        const hasCipher = !!value.ciphertext;
        if (!hasPlain && !hasCipher) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['content'],
                message: 'Either content or encrypted message fields are required',
            });
        }
        if (hasCipher) {
            if (!value.iv || !value.keyVersion || !value.senderKeyFingerprint) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['ciphertext'],
                    message: 'Encrypted messages require iv, keyVersion, and senderKeyFingerprint',
                });
            }
        }
    });

export const registerMessageKeySchema = z.object({
    publicKeyPem: z.string().min(100).max(10000),
    fingerprint: z.string().min(8).max(256),
    algorithm: z.string().min(3).max(50).default('RSA-OAEP-SHA256').optional(),
});

export const listMessagesQuerySchema = z.object({
    cursor: z.string().optional(),
    limit: z.string().optional().transform((val) => {
        if (!val) return 50;
        const num = parseInt(val, 10);
        return isNaN(num) ? 50 : Math.min(Math.max(1, num), 100);
    }),
    before: z.string().optional(), // For loading older messages
});

export const listThreadsQuerySchema = z.object({
    cursor: z.string().optional(),
    limit: z.string().optional().transform((val) => {
        if (!val) return 20;
        const num = parseInt(val, 10);
        return isNaN(num) ? 20 : Math.min(Math.max(1, num), 50);
    }),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
export type ListThreadsQuery = z.infer<typeof listThreadsQuerySchema>;
export type RegisterMessageKeyInput = z.infer<typeof registerMessageKeySchema>;
