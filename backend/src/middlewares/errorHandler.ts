import { Request, Response, NextFunction } from 'express';
import { logger } from '../connectors/logger.js';
import { captureException } from '../connectors/sentry.js';
import { error, ErrorCode } from '../utils/response.js';

/**
 * Custom application error class
 */
export class AppError extends Error {
    constructor(
        public code: string,
        message: string,
        public statusCode: number = 400,
        public details?: unknown
    ) {
        super(message);
        this.name = 'AppError';
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
    constructor(resource: string = 'Resource') {
        super(ErrorCode.NOT_FOUND, `${resource} not found`, 404);
        this.name = 'NotFoundError';
    }
}

/**
 * Unauthorized error
 */
export class UnauthorizedError extends AppError {
    constructor(message: string = 'Unauthorized') {
        super(ErrorCode.UNAUTHORIZED, message, 401);
        this.name = 'UnauthorizedError';
    }
}

/**
 * Forbidden error
 */
export class ForbiddenError extends AppError {
    constructor(message: string = 'Access denied') {
        super(ErrorCode.FORBIDDEN, message, 403);
        this.name = 'ForbiddenError';
    }
}

/**
 * Conflict error
 */
export class ConflictError extends AppError {
    constructor(message: string = 'Resource already exists') {
        super(ErrorCode.CONFLICT, message, 409);
        this.name = 'ConflictError';
    }
}

/**
 * Global error handler middleware
 */
export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: NextFunction
): void {
    // Log the error
    logger.error(
        {
            err,
            requestId: req.requestId,
            method: req.method,
            url: req.url,
            userId: req.user?.userId,
        },
        'Request error'
    );

    // Handle known application errors
    if (err instanceof AppError) {
        error(res, err.code, err.message, err.statusCode, err.details);
        return;
    }

    // Handle Prisma errors
    if (err.name === 'PrismaClientKnownRequestError') {
        const prismaError = err as unknown as { code: string; meta?: { target?: string[] } };

        if (prismaError.code === 'P2002') {
            // Unique constraint violation
            const field = prismaError.meta?.target?.[0] || 'field';
            error(res, ErrorCode.ALREADY_EXISTS, `${field} already exists`, 409);
            return;
        }

        if (prismaError.code === 'P2025') {
            // Record not found
            error(res, ErrorCode.NOT_FOUND, 'Resource not found', 404);
            return;
        }

        if (prismaError.code === 'P2022') {
            // Column does not exist (usually schema drift / pending migration)
            error(
                res,
                ErrorCode.DB_SCHEMA_MISMATCH,
                'Database schema is out of date. Run the latest backend migrations and try again.',
                500
            );
            return;
        }
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        error(res, ErrorCode.TOKEN_INVALID, 'Invalid token', 401);
        return;
    }

    if (err.name === 'TokenExpiredError') {
        error(res, ErrorCode.TOKEN_EXPIRED, 'Token has expired', 401);
        return;
    }

    // Capture unknown errors in Sentry
    captureException(err, {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        userId: req.user?.userId,
    });

    // Don't leak error details in production
    const message =
        process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : err.message;

    error(res, ErrorCode.INTERNAL_ERROR, message, 500);
}

/**
 * 404 handler for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response): void {
    error(res, ErrorCode.NOT_FOUND, `Route ${req.method} ${req.path} not found`, 404);
}
