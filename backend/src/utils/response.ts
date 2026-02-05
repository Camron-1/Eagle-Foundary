import { Response } from 'express';

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: unknown;
    };
    meta?: {
        pagination?: PaginationMeta;
        [key: string]: unknown;
    };
}

export interface PaginationMeta {
    cursor?: string;
    nextCursor?: string | null;
    hasMore: boolean;
    total?: number;
}

/**
 * Send a success response
 */
export function success<T>(
    res: Response,
    data: T,
    statusCode: number = 200,
    meta?: Record<string, unknown>
): Response {
    const response: ApiResponse<T> = {
        success: true,
        data,
        ...(meta && { meta }),
    };
    return res.status(statusCode).json(response);
}

/**
 * Send a paginated success response
 */
export function paginated<T>(
    res: Response,
    data: T[],
    pagination: PaginationMeta,
    statusCode: number = 200
): Response {
    const response: ApiResponse<T[]> = {
        success: true,
        data,
        meta: { pagination },
    };
    return res.status(statusCode).json(response);
}

/**
 * Send an error response
 */
export function error(
    res: Response,
    code: string,
    message: string,
    statusCode: number = 400,
    details?: unknown
): Response {
    const response: ApiResponse = {
        success: false,
        error: {
            code,
            message,
            ...(details !== undefined && typeof details === 'object' && details !== null ? { details } : {}),
        },
    };
    return res.status(statusCode).json(response);
}

/**
 * Send a created response (201)
 */
export function created<T>(res: Response, data: T): Response {
    return success(res, data, 201);
}

/**
 * Send a no content response (204)
 */
export function noContent(res: Response): Response {
    return res.status(204).send();
}

// Common error codes
export const ErrorCode = {
    // Auth
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    TOKEN_INVALID: 'TOKEN_INVALID',

    // OTP
    OTP_EXPIRED: 'OTP_EXPIRED',
    OTP_INVALID: 'OTP_INVALID',
    OTP_MAX_ATTEMPTS: 'OTP_MAX_ATTEMPTS',
    OTP_COOLDOWN: 'OTP_COOLDOWN',
    OTP_RATE_LIMIT: 'OTP_RATE_LIMIT',

    // Validation
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_EMAIL_DOMAIN: 'INVALID_EMAIL_DOMAIN',
    BLOCKED_EMAIL_DOMAIN: 'BLOCKED_EMAIL_DOMAIN',

    // Resources
    NOT_FOUND: 'NOT_FOUND',
    ALREADY_EXISTS: 'ALREADY_EXISTS',
    CONFLICT: 'CONFLICT',

    // Status
    ACCOUNT_PENDING: 'ACCOUNT_PENDING',
    ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
    ORG_SUSPENDED: 'ORG_SUSPENDED',

    // Rate limiting
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

    // Server
    INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];
