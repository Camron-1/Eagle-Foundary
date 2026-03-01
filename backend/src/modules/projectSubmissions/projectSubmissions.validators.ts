import { z } from 'zod';
import { httpUrlSchema } from '../../middlewares/validate.js';

export const projectSubmissionFormAnswersSchema = z
    .object({
        firstName: z.string().max(100).optional(),
        lastName: z.string().max(100).optional(),
        address: z.string().max(500).optional(),
        resumeUrl: httpUrlSchema.optional(),
        coverLetter: z.string().max(5000).optional(),
        customAnswers: z.record(z.string(), z.string().max(2000)).optional(),
    })
    .optional()
    .nullable();

export const createProjectSubmissionSchema = z.object({
    coverLetter: z.string().max(5000).optional().nullable(),
    resumeUrl: httpUrlSchema.optional().nullable(),
    formAnswers: projectSubmissionFormAnswersSchema,
});

export const updateProjectSubmissionStatusSchema = z.object({
    status: z.enum(['SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED']),
    note: z.string().max(500).optional().nullable(),
});

export const listProjectSubmissionsQuerySchema = z.object({
    cursor: z.string().optional(),
    limit: z.string().optional().transform((val) => {
        if (!val) return 20;
        const num = parseInt(val, 10);
        return isNaN(num) ? 20 : Math.min(Math.max(1, num), 100);
    }),
    status: z
        .enum(['SUBMITTED', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED', 'WITHDRAWN'])
        .optional(),
});

export type CreateProjectSubmissionInput = z.infer<typeof createProjectSubmissionSchema>;
export type UpdateProjectSubmissionStatusInput = z.infer<typeof updateProjectSubmissionStatusSchema>;
export type ListProjectSubmissionsQuery = z.infer<typeof listProjectSubmissionsQuerySchema>;
