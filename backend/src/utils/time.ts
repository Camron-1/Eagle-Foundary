import { env } from '../config/env.js';

/**
 * Get current timestamp
 */
export function now(): Date {
    return new Date();
}

/**
 * Get OTP expiry time from now
 */
export function getOtpExpiryTime(): Date {
    return new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000);
}

/**
 * Check if a date is expired
 */
export function isExpired(date: Date): boolean {
    return date.getTime() < Date.now();
}

/**
 * Get the next allowed OTP resend time
 */
export function getNextResendTime(lastSentAt: Date): Date {
    return new Date(lastSentAt.getTime() + env.OTP_RESEND_COOLDOWN_SECONDS * 1000);
}

/**
 * Check if OTP resend is allowed (cooldown passed)
 */
export function canResendOtp(lastSentAt: Date): boolean {
    const nextResendTime = getNextResendTime(lastSentAt);
    return nextResendTime.getTime() <= Date.now();
}

/**
 * Get seconds remaining until OTP can be resent
 */
export function getResendCooldownRemaining(lastSentAt: Date): number {
    const nextResendTime = getNextResendTime(lastSentAt);
    const remaining = Math.ceil((nextResendTime.getTime() - Date.now()) / 1000);
    return Math.max(0, remaining);
}

/**
 * Check if we're within the OTP rate limit window (1 hour)
 */
export function isWithinRateLimitWindow(windowStart: Date): boolean {
    const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000);
    return windowEnd.getTime() > Date.now();
}

/**
 * Check if OTP send limit is exceeded
 */
export function isOtpSendLimitExceeded(
    sendCountInWindow: number,
    windowStart: Date
): boolean {
    if (!isWithinRateLimitWindow(windowStart)) {
        return false; // Window expired, limit resets
    }
    return sendCountInWindow >= env.OTP_SEND_LIMIT_PER_HOUR;
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
    return date.toISOString();
}

/**
 * Calculate time difference in minutes
 */
export function diffInMinutes(from: Date, to: Date): number {
    return Math.floor((to.getTime() - from.getTime()) / (60 * 1000));
}

/**
 * Calculate time difference in seconds
 */
export function diffInSeconds(from: Date, to: Date): number {
    return Math.floor((to.getTime() - from.getTime()) / 1000);
}

/**
 * Add minutes to a date
 */
export function addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000);
}

/**
 * Add hours to a date
 */
export function addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}
