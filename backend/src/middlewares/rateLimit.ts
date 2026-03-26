import rateLimit from 'express-rate-limit';
import { error, ErrorCode } from '../utils/response.js';

/**
 * Create a rate limiter with custom options
 */
export function createRateLimiter(options: {
    windowMs: number;
    max: number;
    message?: string;
}) {
    return rateLimit({
        windowMs: options.windowMs,
        max: options.max,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (_req, res) => {
            error(
                res,
                ErrorCode.RATE_LIMIT_EXCEEDED,
                options.message || 'Too many requests, please try again later',
                429
            );
        },
        keyGenerator: (req) => {
            // Use IP + user ID if authenticated
            const ip = req.ip || req.socket.remoteAddress || 'unknown';
            const userId = req.user?.userId || 'anonymous';
            return `${ip}:${userId}`;
        },
    });
}

/**
 * Rate limiter for auth endpoints (stricter)
 * 10 requests per 15 minutes
 */
export const authRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: 'Too many authentication attempts, please try again after 15 minutes',
});

/**
 * Rate limiter for MFA verify endpoint
 * 10 requests per 5 minutes
 */
export const mfaVerifyRateLimiter = createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10,
    message: 'Too many MFA verification attempts, please try again after 5 minutes',
});

/**
 * Rate limiter for OTP endpoints (very strict)
 * 5 requests per 15 minutes
 */
export const otpRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: 'Too many OTP requests, please try again after 15 minutes',
});

/**
 * Rate limiter for login endpoint
 * 5 requests per 5 minutes
 */
export const loginRateLimiter = createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5,
    message: 'Too many login attempts, please try again after 5 minutes',
});

/**
 * Rate limiter for password reset
 * 3 requests per hour
 */
export const passwordResetRateLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: 'Too many password reset attempts, please try again after 1 hour',
});

/**
 * General API rate limiter (lenient)
 * 100 requests per minute
 */
export const generalRateLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    message: 'Too many requests, please slow down',
});

/**
 * Rate limiter for file uploads
 * 20 uploads per hour
 */
export const uploadRateLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    message: 'Too many uploads, please try again later',
});
