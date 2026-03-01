import { z } from 'zod';
import { emailSchema, passwordSchema, otpSchema } from '../../middlewares/validate.js';

export const studentSignupSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    firstName: z.string().min(1, 'First name is required').max(100),
    lastName: z.string().min(1, 'Last name is required').max(100),
});

export const companyDocUploadSchema = z.object({
    filename: z.string().min(1).max(255),
    mimeType: z.literal('application/pdf'),
    sizeBytes: z.number().int().min(1).max(10 * 1024 * 1024),
});

export const companySignupSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    companyName: z.string().min(1, 'Company name is required').max(200),
    firstName: z.string().min(1, 'First name is required').max(100),
    lastName: z.string().min(1, 'Last name is required').max(100),
    verificationDocumentKeys: z.array(z.string().min(1)).min(1).max(5),
});

export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
});

export const verifyOtpSchema = z.object({
    email: emailSchema,
    code: otpSchema,
});

export const resendOtpSchema = z.object({
    email: emailSchema,
});

export const forgotPasswordSchema = z.object({
    email: emailSchema,
});

export const resetPasswordSchema = z.object({
    email: emailSchema,
    code: otpSchema,
    newPassword: passwordSchema,
});

export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required').optional(),
});

export const mfaSetupStartSchema = z.object({
    challengeToken: z.string().min(1),
});

export const mfaSetupCompleteSchema = z.object({
    challengeToken: z.string().min(1),
    code: otpSchema,
});

export const mfaVerifySchema = z
    .object({
        challengeToken: z.string().min(1),
        code: otpSchema.optional(),
        backupCode: z.string().min(4).max(32).optional(),
    })
    .superRefine((value, ctx) => {
        if (!value.code && !value.backupCode) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['code'],
                message: 'Either code or backupCode is required',
            });
        }
    });

export const mfaRegenerateBackupCodesSchema = z.object({
    code: otpSchema,
});

export type StudentSignupInput = z.infer<typeof studentSignupSchema>;
export type CompanyDocUploadInput = z.infer<typeof companyDocUploadSchema>;
export type CompanySignupInput = z.infer<typeof companySignupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type MfaSetupStartInput = z.infer<typeof mfaSetupStartSchema>;
export type MfaSetupCompleteInput = z.infer<typeof mfaSetupCompleteSchema>;
export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>;
export type MfaRegenerateBackupCodesInput = z.infer<typeof mfaRegenerateBackupCodesSchema>;
