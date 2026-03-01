import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service.js';
import { success, created, ErrorCode } from '../../utils/response.js';
import { AppError } from '../../middlewares/errorHandler.js';
import {
    clearRefreshTokenCookie,
    extractRefreshToken,
    setRefreshTokenCookie,
} from '../../utils/cookies.js';
import {
    CompanyDocUploadInput,
    CompanySignupInput,
    ForgotPasswordInput,
    LoginInput,
    MfaRegenerateBackupCodesInput,
    MfaSetupCompleteInput,
    MfaSetupStartInput,
    MfaVerifyInput,
    ResendOtpInput,
    ResetPasswordInput,
    StudentSignupInput,
    VerifyOtpInput,
} from './auth.validators.js';

function getRequestMeta(req: Request<any, any, any, any>): { ip: string | null; userAgent: string | null } {
    const forwardedFor = req.headers['x-forwarded-for'];
    const forwardedIp = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : typeof forwardedFor === 'string'
            ? forwardedFor.split(',')[0]?.trim()
            : null;

    return {
        ip: forwardedIp || req.ip || req.socket.remoteAddress || null,
        userAgent: req.get('user-agent') || null,
    };
}

/**
 * POST /auth/student/signup
 */
export async function studentSignup(
    req: Request<unknown, unknown, StudentSignupInput>,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const result = await authService.registerStudent(req.body);
        created(res, {
            message: 'Account created. Please check your email for verification code.',
            userId: result.userId,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /auth/company/signup/document-upload-url
 */
export async function companyDocumentUploadUrl(
    req: Request<unknown, unknown, CompanyDocUploadInput>,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const result = await authService.getCompanyDocumentUploadUrl(req.body);
        success(res, result);
    } catch (error) {
        next(error);
    }
}

/**
 * POST /auth/company/signup
 */
export async function companySignup(
    req: Request<unknown, unknown, CompanySignupInput>,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const result = await authService.registerCompany(req.body);
        created(res, {
            message: 'Account created. Please check your email for verification code.',
            userId: result.userId,
            orgId: result.orgId,
            nextStage: result.nextStage,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /auth/verify-otp
 */
export async function verifyOtp(
    req: Request<unknown, unknown, VerifyOtpInput>,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const result = await authService.verifySignupOtp(req.body.email, req.body.code);
        success(res, {
            message: 'Email verified successfully. Continue to login.',
            ...result,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /auth/resend-otp
 */
export async function resendOtp(
    req: Request<unknown, unknown, ResendOtpInput>,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const result = await authService.resendSignupOtp(req.body.email);
        success(res, {
            message: 'Verification code sent to your email.',
            ...result,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /auth/login
 */
export async function login(
    req: Request<unknown, unknown, LoginInput>,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const result = await authService.login(req.body);
        success(res, result);
    } catch (error) {
        next(error);
    }
}

/**
 * POST /auth/mfa/setup/start
 */
export async function startMfaSetup(
    req: Request<unknown, unknown, MfaSetupStartInput>,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const result = await authService.startMfaSetup(req.body.challengeToken);
        success(res, result);
    } catch (error) {
        next(error);
    }
}

/**
 * POST /auth/mfa/setup/complete
 */
export async function completeMfaSetup(
    req: Request<unknown, unknown, MfaSetupCompleteInput>,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const result = await authService.completeMfaSetup(
            req.body.challengeToken,
            req.body.code,
            getRequestMeta(req)
        );

        setRefreshTokenCookie(res, result.tokens.refreshToken);
        success(res, {
            accessToken: result.tokens.accessToken,
            expiresIn: result.tokens.expiresIn,
            backupCodes: result.backupCodes,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /auth/mfa/verify
 */
export async function verifyMfa(
    req: Request<unknown, unknown, MfaVerifyInput>,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const result = await authService.verifyMfaChallenge(
            req.body.challengeToken,
            {
                code: req.body.code,
                backupCode: req.body.backupCode,
            },
            getRequestMeta(req)
        );

        setRefreshTokenCookie(res, result.tokens.refreshToken);
        success(res, {
            accessToken: result.tokens.accessToken,
            expiresIn: result.tokens.expiresIn,
            usedBackupCode: result.usedBackupCode || false,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /auth/mfa/status
 */
export async function getMfaStatus(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        if (!req.user) {
            throw new AppError(ErrorCode.UNAUTHORIZED, 'Authentication required', 401);
        }

        const result = await authService.getMfaStatus(req.user.userId);
        success(res, result);
    } catch (error) {
        next(error);
    }
}

/**
 * POST /auth/mfa/backup-codes/regenerate
 */
export async function regenerateBackupCodes(
    req: Request<unknown, unknown, MfaRegenerateBackupCodesInput>,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        if (!req.user) {
            throw new AppError(ErrorCode.UNAUTHORIZED, 'Authentication required', 401);
        }

        const result = await authService.regenerateBackupCodes(req.user.userId, req.body.code);
        success(res, result);
    } catch (error) {
        next(error);
    }
}

/**
 * GET /auth/sessions
 */
export async function getSessions(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        if (!req.user) {
            throw new AppError(ErrorCode.UNAUTHORIZED, 'Authentication required', 401);
        }

        const refreshToken = extractRefreshToken(req);
        const sessions = await authService.listSessions(req.user.userId, refreshToken);
        success(res, sessions);
    } catch (error) {
        next(error);
    }
}

/**
 * DELETE /auth/sessions/:id
 */
export async function revokeSession(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        if (!req.user) {
            throw new AppError(ErrorCode.UNAUTHORIZED, 'Authentication required', 401);
        }

        await authService.revokeSession(req.user.userId, req.params.id);
        success(res, { message: 'Session revoked' });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /auth/sessions/revoke-others
 */
export async function revokeOtherSessions(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        if (!req.user) {
            throw new AppError(ErrorCode.UNAUTHORIZED, 'Authentication required', 401);
        }

        const refreshToken = extractRefreshToken(req);
        const result = await authService.revokeOtherSessions(req.user.userId, refreshToken);
        success(res, result);
    } catch (error) {
        next(error);
    }
}

/**
 * POST /auth/refresh
 */
export async function refreshToken(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const refreshToken = extractRefreshToken(req);

        if (!refreshToken) {
            throw new AppError(ErrorCode.TOKEN_INVALID, 'Refresh token is required', 401);
        }

        const tokens = await authService.refreshAccessToken(refreshToken, getRequestMeta(req));
        setRefreshTokenCookie(res, tokens.refreshToken);
        success(res, {
            accessToken: tokens.accessToken,
            expiresIn: tokens.expiresIn,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /auth/logout
 */
export async function logout(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const refreshToken = extractRefreshToken(req);
        if (refreshToken) {
            await authService.logout(refreshToken);
        }
        clearRefreshTokenCookie(res);
        success(res, { message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /auth/forgot-password
 */
export async function forgotPassword(
    req: Request<unknown, unknown, ForgotPasswordInput>,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        await authService.requestPasswordReset(req.body.email);
        success(res, {
            message: 'If an account exists with this email, you will receive a password reset code.',
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /auth/reset-password
 */
export async function resetPassword(
    req: Request<unknown, unknown, ResetPasswordInput>,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        await authService.resetPassword(req.body);
        success(res, { message: 'Password reset successfully. You can now log in with your new password.' });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /auth/me
 */
export async function getMe(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        if (!req.user) {
            throw new AppError(ErrorCode.UNAUTHORIZED, 'Authentication required', 401);
        }

        const user = await authService.getCurrentUser(req.user.userId);
        success(res, user);
    } catch (error) {
        next(error);
    }
}
