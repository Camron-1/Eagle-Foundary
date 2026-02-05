import { env } from '../config/env.js';

/**
 * Check if an email belongs to a student (ends with the university domain)
 */
export function isStudentEmail(email: string): boolean {
    const domain = email.split('@')[1]?.toLowerCase();
    return domain === env.STUDENT_EMAIL_DOMAIN.toLowerCase();
}

/**
 * Check if an email domain is blocked (public email providers)
 */
export function isBlockedEmailDomain(email: string): boolean {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return true;

    return env.BLOCKED_EMAIL_DOMAINS.some(
        (blocked) => blocked.toLowerCase() === domain
    );
}

/**
 * Check if an email is valid for company signup
 * Must not be a blocked domain and must not be a student email
 */
export function isValidCompanyEmail(email: string): boolean {
    if (isBlockedEmailDomain(email)) {
        return false;
    }

    // Companies should not use student emails
    if (isStudentEmail(email)) {
        return false;
    }

    return true;
}

/**
 * Extract domain from email
 */
export function getEmailDomain(email: string): string | null {
    const parts = email.split('@');
    return parts.length === 2 ? parts[1].toLowerCase() : null;
}

/**
 * Normalize email for comparison (lowercase, trim)
 */
export function normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
}

/**
 * Validate email format
 */
export function isValidEmailFormat(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Get the list of blocked email domains
 */
export function getBlockedDomains(): string[] {
    return env.BLOCKED_EMAIL_DOMAINS;
}

/**
 * Get the student email domain
 */
export function getStudentDomain(): string {
    return env.STUDENT_EMAIL_DOMAIN;
}
