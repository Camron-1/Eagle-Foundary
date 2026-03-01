import { z } from 'zod';
import { emailSchema, httpUrlSchema } from '../../middlewares/validate.js';

export const updateOrgSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional().nullable(),
    website: httpUrlSchema.optional().nullable(),
    logoUrl: httpUrlSchema.optional().nullable(),
});

export const addMemberSchema = z.object({
    email: emailSchema,
    role: z.enum(['COMPANY_ADMIN', 'COMPANY_MEMBER'], {
        errorMap: () => ({ message: 'Role must be COMPANY_ADMIN or COMPANY_MEMBER' }),
    }),
});

export const listOrgsQuerySchema = z.object({
    cursor: z.string().optional(),
    limit: z.string().optional().transform((val) => {
        if (!val) return 20;
        const num = parseInt(val, 10);
        return isNaN(num) ? 20 : Math.min(Math.max(1, num), 100);
    }),
    search: z.string().optional(),
});

export const listOrgJoinRequestsQuerySchema = z.object({
    cursor: z.string().optional(),
    limit: z.string().optional().transform((val) => {
        if (!val) return 20;
        const num = parseInt(val, 10);
        return isNaN(num) ? 20 : Math.min(Math.max(1, num), 100);
    }),
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
});

export const reviewOrgJoinRequestSchema = z.object({
    action: z.enum(['APPROVE', 'REJECT']),
    adminNote: z.string().max(500).optional().nullable(),
});

export type UpdateOrgInput = z.infer<typeof updateOrgSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type ListOrgsQuery = z.infer<typeof listOrgsQuerySchema>;
export type ListOrgJoinRequestsQuery = z.infer<typeof listOrgJoinRequestsQuerySchema>;
export type ReviewOrgJoinRequestInput = z.infer<typeof reviewOrgJoinRequestSchema>;
