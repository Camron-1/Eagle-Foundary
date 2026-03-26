import { Router } from 'express';
import * as authController from './auth.controller.js';
import { validateBody, validateParams, uuidParamSchema } from '../../middlewares/validate.js';
import { authMiddleware } from '../../middlewares/auth.js';
import {
    authRateLimiter,
    otpRateLimiter,
    loginRateLimiter,
    passwordResetRateLimiter,
    uploadRateLimiter,
    mfaVerifyRateLimiter,
} from '../../middlewares/rateLimit.js';
import {
    companyDocUploadSchema,
    companySignupSchema,
    forgotPasswordSchema,
    loginSchema,
    mfaRegenerateBackupCodesSchema,
    mfaSetupCompleteSchema,
    mfaSetupStartSchema,
    mfaVerifySchema,
    refreshTokenSchema,
    resendOtpSchema,
    resetPasswordSchema,
    studentSignupSchema,
    verifyOtpSchema,
} from './auth.validators.js';

const router = Router();

// Public endpoints with rate limiting
router.post(
    '/student/signup',
    authRateLimiter,
    validateBody(studentSignupSchema),
    authController.studentSignup
);

router.post(
    '/company/signup/document-upload-url',
    uploadRateLimiter,
    validateBody(companyDocUploadSchema),
    authController.companyDocumentUploadUrl
);

router.post(
    '/company/signup',
    authRateLimiter,
    validateBody(companySignupSchema),
    authController.companySignup
);

router.post(
    '/verify-otp',
    otpRateLimiter,
    validateBody(verifyOtpSchema),
    authController.verifyOtp
);

router.post(
    '/resend-otp',
    otpRateLimiter,
    validateBody(resendOtpSchema),
    authController.resendOtp
);

router.post(
    '/login',
    loginRateLimiter,
    validateBody(loginSchema),
    authController.login
);

router.post(
    '/mfa/setup/start',
    authRateLimiter,
    validateBody(mfaSetupStartSchema),
    authController.startMfaSetup
);

router.post(
    '/mfa/setup/complete',
    authRateLimiter,
    validateBody(mfaSetupCompleteSchema),
    authController.completeMfaSetup
);

router.post(
    '/mfa/verify',
    mfaVerifyRateLimiter,
    validateBody(mfaVerifySchema),
    authController.verifyMfa
);

router.post(
    '/refresh',
    authRateLimiter,
    validateBody(refreshTokenSchema),
    authController.refreshToken
);

router.post(
    '/logout',
    validateBody(refreshTokenSchema),
    authController.logout
);

router.post(
    '/forgot-password',
    passwordResetRateLimiter,
    validateBody(forgotPasswordSchema),
    authController.forgotPassword
);

router.post(
    '/reset-password',
    passwordResetRateLimiter,
    validateBody(resetPasswordSchema),
    authController.resetPassword
);

// Protected endpoints
router.get('/me', authMiddleware, authController.getMe);
router.get('/mfa/status', authMiddleware, authController.getMfaStatus);

router.post(
    '/mfa/backup-codes/regenerate',
    authMiddleware,
    validateBody(mfaRegenerateBackupCodesSchema),
    authController.regenerateBackupCodes
);

router.get('/sessions', authMiddleware, authController.getSessions);

router.delete(
    '/sessions/:id',
    authMiddleware,
    validateParams(uuidParamSchema),
    authController.revokeSession
);

router.post('/sessions/revoke-others', authMiddleware, authController.revokeOtherSessions);

export default router;
