import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AccessTokenPayload } from '../utils/security.js';
import { error, ErrorCode } from '../utils/response.js';
import { db } from '../connectors/db.js';
import { UserStatus } from '../config/constants.js';

declare global {
    namespace Express {
        interface Request {
            user?: AuthenticatedUser;
        }
    }
}

export interface AuthenticatedUser extends AccessTokenPayload {
    status: string;
}

/**
 * Middleware to verify JWT access token and attach user to request
 */
export function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        error(res, ErrorCode.UNAUTHORIZED, 'Missing or invalid authorization header', 401);
        return;
    }

    const token = authHeader.substring(7);

    try {
        const payload = verifyAccessToken(token);

        // Attach user info to request
        req.user = {
            ...payload,
            status: '', // Will be populated if needed
        };

        next();
    } catch (err) {
        if (err instanceof Error && err.name === 'TokenExpiredError') {
            error(res, ErrorCode.TOKEN_EXPIRED, 'Access token has expired', 401);
            return;
        }
        error(res, ErrorCode.TOKEN_INVALID, 'Invalid access token', 401);
    }
}

/**
 * Middleware to require authenticated user with ACTIVE status
 */
export async function requireActiveUser(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    if (!req.user) {
        error(res, ErrorCode.UNAUTHORIZED, 'Authentication required', 401);
        return;
    }

    try {
        const user = await db.user.findUnique({
            where: { id: req.user.userId },
            select: {
                status: true,
                org: {
                    select: { status: true },
                },
            },
        });

        if (!user) {
            error(res, ErrorCode.NOT_FOUND, 'User not found', 404);
            return;
        }

        if (user.status === UserStatus.PENDING_OTP) {
            error(res, ErrorCode.ACCOUNT_PENDING, 'Account pending verification', 403);
            return;
        }

        if (user.status === UserStatus.PENDING_ORG_VERIFICATION) {
            error(res, ErrorCode.ORG_VERIFICATION_PENDING, 'Organization verification is pending', 403);
            return;
        }

        if (user.status === UserStatus.PENDING_ORG_APPROVAL) {
            error(res, ErrorCode.ORG_APPROVAL_PENDING, 'Awaiting organization admin approval', 403);
            return;
        }

        if (user.status === UserStatus.SUSPENDED) {
            error(res, ErrorCode.ACCOUNT_SUSPENDED, 'Account has been suspended', 403);
            return;
        }

        if (user.org?.status === 'SUSPENDED') {
            error(res, ErrorCode.ORG_SUSPENDED, 'Organization has been suspended', 403);
            return;
        }

        req.user.status = user.status;
        next();
    } catch (err) {
        next(err);
    }
}

/**
 * Optional auth middleware - doesn't fail if no token, but attaches user if present
 */
export function optionalAuthMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction
): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        next();
        return;
    }

    const token = authHeader.substring(7);

    try {
        const payload = verifyAccessToken(token);
        req.user = {
            ...payload,
            status: '',
        };
    } catch {
        // Ignore token errors for optional auth
    }

    next();
}
