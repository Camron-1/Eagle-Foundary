import { z } from 'zod';

export const reviewStartupSchema = z.object({
    action: z.enum(['APPROVE', 'REJECT', 'REQUEST_CHANGES']),
    feedback: z.string().max(2000).optional().nullable(),
});

export const updateUserStatusSchema = z.object({
    status: z.enum(['ACTIVE', 'SUSPENDED']),
    reason: z.string().max(500).optional().nullable(),
});

export const updateOrgStatusSchema = z.object({
    status: z.enum(['ACTIVE', 'SUSPENDED']),
    reason: z.string().max(500).optional().nullable(),
});

export const reviewOrgVerificationSchema = z.object({
    action: z.enum(['APPROVE', 'REJECT']),
    reviewNotes: z.string().max(2000).optional().nullable(),
    verifiedDomains: z.array(z.string().min(1)).max(20).optional(),
});

export const listOrgVerificationsQuerySchema = z.object({
    cursor: z.string().optional(),
    limit: z.string().optional().transform((val) => {
        if (!val) return 20;
        const num = parseInt(val, 10);
        return isNaN(num) ? 20 : Math.min(Math.max(1, num), 100);
    }),
    status: z.enum(['PENDING_REVIEW', 'REJECTED', 'APPROVED']).optional(),
});

export const createReportSchema = z.object({
    reporterReason: z.string().min(1, 'Reason is required').max(1000),
    targetType: z.enum(['USER', 'ORG', 'STARTUP', 'OPPORTUNITY', 'MESSAGE']),
    targetId: z.string().uuid(),
    evidenceText: z.string().max(2000).optional().nullable(),
    evidenceMessageId: z.string().uuid().optional().nullable(),
});

export const resolveReportSchema = z.object({
    resolution: z.enum(['DISMISSED', 'WARNING', 'CONTENT_REMOVED', 'USER_SUSPENDED', 'ORG_SUSPENDED']),
    adminNotes: z.string().max(1000).optional().nullable(),
});

export const listAdminQuerySchema = z.object({
    cursor: z.string().optional(),
    limit: z.string().optional().transform((val) => {
        if (!val) return 20;
        const num = parseInt(val, 10);
        return isNaN(num) ? 20 : Math.min(Math.max(1, num), 100);
    }),
    status: z.string().optional(),
});

export type ReviewStartupInput = z.infer<typeof reviewStartupSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type UpdateOrgStatusInput = z.infer<typeof updateOrgStatusSchema>;
export type ReviewOrgVerificationInput = z.infer<typeof reviewOrgVerificationSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type ResolveReportInput = z.infer<typeof resolveReportSchema>;
export type ListAdminQuery = z.infer<typeof listAdminQuerySchema>;
export type ListOrgVerificationsQuery = z.infer<typeof listOrgVerificationsQuerySchema>;
