import {
    AuthChallengeType,
    OrgJoinRequestStatus,
    OrgStatus,
    OrgVerificationStatus,
    OtpPurpose,
    Prisma,
    UserRole,
    UserStatus,
} from '@prisma/client';
import crypto from 'crypto';
import { db } from '../../connectors/db.js';
import { env } from '../../config/env.js';
import {
    buildTotpUri,
    decryptSensitiveValue,
    encryptSensitiveValue,
    generateAccessToken,
    generateBackupCodes,
    generateRefreshToken,
    generateSecureToken,
    generateTotpSecret,
    getTokenExpiry,
    hashPassword,
    hashBackupCode,
    hashToken,
    verifyBackupCode,
    verifyPassword,
    verifyRefreshToken,
    verifyTotpCode,
} from '../../utils/security.js';
import {
    getEmailDomain,
    isStudentEmail,
    isValidCompanyEmail,
    normalizeEmail,
} from '../../utils/emailRules.js';
import * as otpService from '../otp/otp.service.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { ErrorCode } from '../../utils/response.js';
import { logger } from '../../connectors/logger.js';
import {
    CompanySignupInput,
    LoginInput,
    ResetPasswordInput,
    StudentSignupInput,
} from './auth.validators.js';
import { FileContextType, NotificationType } from '../../config/constants.js';
import { generatePresignedUploadUrl, generateS3Key } from '../../connectors/s3.js';
import { createNotification } from '../notifications/notifications.service.js';
import { sendEmail } from '../../connectors/ses.js';
import { hashForBlindIndex } from '../../connectors/kms.js';
import { encryptTextValue } from '../../utils/fieldEncryption.js';

interface RequestMeta {
    userAgent?: string | null;
    ip?: string | null;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
}

export interface LoginChallengeResult {
    nextStep: 'MFA_VERIFY' | 'MFA_SETUP';
    challengeToken: string;
}

export interface AuthUser {
    id: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    orgId: string | null;
    mfaEnabled: boolean;
    studentProfile?: {
        id: string;
        firstName: string;
        lastName: string;
    } | null;
    org?: {
        id: string;
        name: string;
        status: OrgStatus;
        verificationStatus: OrgVerificationStatus;
        verificationReviewNotes: string | null;
    } | null;
    pendingContext?: {
        type: 'ORG_VERIFICATION_PENDING' | 'ORG_APPROVAL_PENDING' | 'ORG_APPROVAL_REJECTED';
        orgName?: string;
        reviewNotes?: string | null;
        joinRequestStatus?: OrgJoinRequestStatus;
        joinRequestNote?: string | null;
    } | null;
}

interface RegisterCompanyResult {
    userId: string;
    orgId: string;
    nextStage: 'ORG_VERIFICATION' | 'ORG_JOIN_APPROVAL';
}

function getChallengeExpiry(): Date {
    return new Date(Date.now() + env.MFA_CHALLENGE_TTL_MINUTES * 60 * 1000);
}

function getLockoutExpiry(): Date {
    return new Date(Date.now() + env.LOGIN_LOCKOUT_MINUTES * 60 * 1000);
}

function parseVerificationDocumentFilename(key: string): string {
    const segments = key.split('/');
    return segments.length > 0 ? segments[segments.length - 1] : 'verification-document.pdf';
}

function isValidVerificationDocumentKey(key: string): boolean {
    return /^org_verification_document\/[0-9a-f-]{36}\/[0-9]+-[^/]+\.pdf$/i.test(key);
}

function normalizeVerificationDocumentKeys(keys: string[]): string[] {
    const normalized = keys.map((key) => key.trim()).filter(Boolean);

    if (normalized.length === 0) {
        throw new AppError(
            ErrorCode.VALIDATION_ERROR,
            'At least one verification document is required',
            400
        );
    }

    if (normalized.length > 5) {
        throw new AppError(
            ErrorCode.VALIDATION_ERROR,
            'A maximum of 5 verification documents is allowed',
            400
        );
    }

    for (const key of normalized) {
        if (!isValidVerificationDocumentKey(key)) {
            throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid verification document key', 400);
        }
    }

    return Array.from(new Set(normalized));
}

async function markChallengeAttempt(challenge: { id: string; attempts: number }): Promise<void> {
    const nextAttempts = challenge.attempts + 1;
    const shouldConsume = nextAttempts >= env.MFA_MAX_ATTEMPTS;

    await db.authChallenge.update({
        where: { id: challenge.id },
        data: {
            attempts: { increment: 1 },
            ...(shouldConsume ? { consumedAt: new Date() } : {}),
        },
    });
}

async function getActiveChallenge(
    challengeToken: string,
    expectedType?: AuthChallengeType
) {
    const challengeHash = hashToken(challengeToken);
    const challenge = await db.authChallenge.findUnique({
        where: { challengeHash },
        include: {
            user: {
                include: {
                    org: true,
                },
            },
        },
    });

    if (!challenge || challenge.consumedAt) {
        throw new AppError(ErrorCode.MFA_INVALID, 'Invalid or expired authentication challenge', 401);
    }

    if (challenge.expiresAt < new Date()) {
        await db.authChallenge.update({
            where: { id: challenge.id },
            data: { consumedAt: new Date() },
        });
        throw new AppError(ErrorCode.MFA_INVALID, 'Authentication challenge has expired', 401);
    }

    if (expectedType && challenge.type !== expectedType) {
        throw new AppError(ErrorCode.MFA_INVALID, 'Invalid authentication challenge type', 401);
    }

    return challenge;
}

async function createAuthChallenge(
    userId: string,
    type: AuthChallengeType,
    tempSecretEncrypted?: string
): Promise<string> {
    const challengeToken = generateSecureToken(24);

    await db.authChallenge.create({
        data: {
            userId,
            challengeHash: hashToken(challengeToken),
            type,
            tempSecretEncrypted,
            expiresAt: getChallengeExpiry(),
        },
    });

    return challengeToken;
}

async function consumeChallenge(challengeId: string): Promise<void> {
    await db.authChallenge.update({
        where: { id: challengeId },
        data: { consumedAt: new Date() },
    });
}

async function clearPendingChallenges(userId: string): Promise<void> {
    await db.authChallenge.updateMany({
        where: {
            userId,
            consumedAt: null,
        },
        data: {
            consumedAt: new Date(),
        },
    });
}

function getPendingContext(user: {
    status: UserStatus;
    org: {
        name: string;
        verificationReviewNotes: string | null;
    } | null;
    orgJoinRequest: {
        status: OrgJoinRequestStatus;
        adminNote: string | null;
    } | null;
}): AuthUser['pendingContext'] {
    if (user.status === UserStatus.PENDING_ORG_VERIFICATION) {
        return {
            type: 'ORG_VERIFICATION_PENDING',
            orgName: user.org?.name,
            reviewNotes: user.org?.verificationReviewNotes,
        };
    }

    if (user.status === UserStatus.PENDING_ORG_APPROVAL) {
        if (user.orgJoinRequest?.status === OrgJoinRequestStatus.REJECTED) {
            return {
                type: 'ORG_APPROVAL_REJECTED',
                orgName: user.org?.name,
                joinRequestStatus: user.orgJoinRequest.status,
                joinRequestNote: user.orgJoinRequest.adminNote,
            };
        }

        return {
            type: 'ORG_APPROVAL_PENDING',
            orgName: user.org?.name,
            joinRequestStatus: user.orgJoinRequest?.status,
            joinRequestNote: user.orgJoinRequest?.adminNote,
        };
    }

    return null;
}

async function notifyInApp(userId: string, type: string, title: string, message: string) {
    try {
        await createNotification(userId, type, title, message);
    } catch (error) {
        logger.warn({ userId, type, error }, 'Failed to create in-app security notification');
    }
}

async function notifyNewLogin(userId: string, email: string, meta: RequestMeta): Promise<void> {
    const title = 'New sign-in to your account';
    const message = `We detected a new sign-in from ${meta.userAgent || 'an unknown device'}.`;
    await notifyInApp(userId, NotificationType.SECURITY_NEW_LOGIN, title, message);

    try {
        await sendEmail({
            to: email,
            subject: 'New Eagle-Foundry Sign-In',
            htmlBody: `<p>${message}</p>`,
            textBody: message,
        });
    } catch (error) {
        logger.warn({ userId, error }, 'Failed to send new login email');
    }
}

/**
 * Register a new student
 */
export async function registerStudent(input: StudentSignupInput): Promise<{ userId: string }> {
    const email = normalizeEmail(input.email);

    if (!isStudentEmail(email)) {
        throw new AppError(
            ErrorCode.INVALID_EMAIL_DOMAIN,
            `Email must end with @${env.STUDENT_EMAIL_DOMAIN}`,
            400
        );
    }

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
        throw new AppError(ErrorCode.ALREADY_EXISTS, 'Email already registered', 409);
    }

    const passwordHash = await hashPassword(input.password);

    const user = await db.user.create({
        data: {
            email,
            passwordHash,
            role: UserRole.STUDENT,
            status: UserStatus.PENDING_OTP,
            studentProfile: {
                create: {
                    firstName: input.firstName,
                    lastName: input.lastName,
                },
            },
        },
    });

    await otpService.createAndSendOtp(email, OtpPurpose.SIGNUP_VERIFY);

    logger.info({ userId: user.id, email }, 'Student registered');

    return { userId: user.id };
}

/**
 * Generate presigned upload URL for company verification docs
 */
export async function getCompanyDocumentUploadUrl(input: {
    filename: string;
    mimeType: 'application/pdf';
    sizeBytes: number;
}): Promise<{ uploadUrl: string; key: string; expiresAt: Date }> {
    const key = generateS3Key(
        FileContextType.ORG_VERIFICATION_DOCUMENT,
        crypto.randomUUID(),
        input.filename
    );

    const result = await generatePresignedUploadUrl(key, input.mimeType, input.sizeBytes);

    return {
        uploadUrl: result.uploadUrl,
        key: result.key,
        expiresAt: result.expiresAt,
    };
}

/**
 * Register a company account.
 * If domain exists, create a pending org join request for member approval.
 */
export async function registerCompany(input: CompanySignupInput): Promise<RegisterCompanyResult> {
    const email = normalizeEmail(input.email);
    const domain = getEmailDomain(email);

    if (!domain) {
        throw new AppError(ErrorCode.INVALID_EMAIL_DOMAIN, 'Invalid email domain', 400);
    }

    if (!isValidCompanyEmail(email)) {
        throw new AppError(
            ErrorCode.BLOCKED_EMAIL_DOMAIN,
            'Please use a company email address. Public email providers are not allowed.',
            400
        );
    }

    const verificationDocumentKeys = normalizeVerificationDocumentKeys(input.verificationDocumentKeys);

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
        throw new AppError(ErrorCode.ALREADY_EXISTS, 'Email already registered', 409);
    }

    const passwordHash = await hashPassword(input.password);

    const existingOrg = await db.org.findFirst({
        where: {
            verifiedDomains: { has: domain },
        },
        orderBy: { createdAt: 'desc' },
    });

    const result = await db.$transaction(async (tx) => {
        if (existingOrg) {
            const user = await tx.user.create({
                data: {
                    email,
                    passwordHash,
                    role: UserRole.COMPANY_MEMBER,
                    status: UserStatus.PENDING_OTP,
                    orgId: existingOrg.id,
                },
            });

            await tx.orgJoinRequest.create({
                data: {
                    orgId: existingOrg.id,
                    userId: user.id,
                    status: OrgJoinRequestStatus.PENDING,
                },
            });

            await tx.file.createMany({
                data: await Promise.all(
                    verificationDocumentKeys.map(async (key) => {
                        const encrypted = await encryptTextValue(key, 'file_s3_key', key);
                        return {
                            s3Key: key,
                            s3KeyEncrypted: encrypted as unknown as object,
                            s3KeyHash: hashForBlindIndex(key),
                            encryptionKeyVersion: encrypted.keyVersion,
                            filename: parseVerificationDocumentFilename(key),
                            mimeType: 'application/pdf',
                            sizeBytes: 0,
                            context: FileContextType.ORG_VERIFICATION_DOCUMENT,
                            contextId: existingOrg.id,
                            uploadedBy: user.id,
                        };
                    })
                ),
                skipDuplicates: true,
            });

            return {
                userId: user.id,
                orgId: existingOrg.id,
                nextStage: 'ORG_JOIN_APPROVAL' as const,
            };
        }

        const org = await tx.org.create({
            data: {
                name: input.companyName,
                status: OrgStatus.PENDING_OTP,
                verificationStatus: OrgVerificationStatus.PENDING_REVIEW,
                verificationSubmittedAt: new Date(),
                verifiedDomains: [domain],
            },
        });

        const user = await tx.user.create({
            data: {
                email,
                passwordHash,
                role: UserRole.COMPANY_ADMIN,
                status: UserStatus.PENDING_OTP,
                orgId: org.id,
            },
        });

        await tx.file.createMany({
            data: await Promise.all(
                verificationDocumentKeys.map(async (key) => {
                    const encrypted = await encryptTextValue(key, 'file_s3_key', key);
                    return {
                        s3Key: key,
                        s3KeyEncrypted: encrypted as unknown as object,
                        s3KeyHash: hashForBlindIndex(key),
                        encryptionKeyVersion: encrypted.keyVersion,
                        filename: parseVerificationDocumentFilename(key),
                        mimeType: 'application/pdf',
                        sizeBytes: 0,
                        context: FileContextType.ORG_VERIFICATION_DOCUMENT,
                        contextId: org.id,
                        uploadedBy: user.id,
                    };
                })
            ),
            skipDuplicates: true,
        });

        return { userId: user.id, orgId: org.id, nextStage: 'ORG_VERIFICATION' as const };
    });

    await otpService.createAndSendOtp(email, OtpPurpose.SIGNUP_VERIFY);

    logger.info({ userId: result.userId, orgId: result.orgId, email }, 'Company registered');

    return result;
}

/**
 * Verify OTP and move account to next state.
 */
export async function verifySignupOtp(email: string, code: string): Promise<{ success: boolean }> {
    const normalizedEmail = normalizeEmail(email);
    const result = await otpService.verifyOtp(normalizedEmail, OtpPurpose.SIGNUP_VERIFY, code);

    if (!result.valid) {
        const messages: Record<string, string> = {
            expired: 'OTP has expired. Please request a new one.',
            invalid: 'Invalid OTP code.',
            max_attempts: 'Maximum attempts exceeded. Please request a new OTP.',
            not_found: 'No OTP found for this email.',
        };
        throw new AppError(
            `OTP_${result.error?.toUpperCase() || 'ERROR'}`,
            messages[result.error || 'invalid'],
            400
        );
    }

    const user = await db.user.findUnique({
        where: { email: normalizedEmail },
        include: {
            org: true,
            orgJoinRequest: true,
        },
    });

    if (!user) {
        throw new AppError(ErrorCode.NOT_FOUND, 'User not found', 404);
    }

    let nextStatus: UserStatus = UserStatus.ACTIVE;

    if (user.role === UserRole.STUDENT) {
        nextStatus = UserStatus.ACTIVE;
    } else if (user.org) {
        if (user.role === UserRole.COMPANY_ADMIN && user.org.verificationStatus !== OrgVerificationStatus.APPROVED) {
            nextStatus = UserStatus.PENDING_ORG_VERIFICATION;
        } else if (user.orgJoinRequest && user.orgJoinRequest.status !== OrgJoinRequestStatus.APPROVED) {
            nextStatus = UserStatus.PENDING_ORG_APPROVAL;
        } else if (user.org.status === OrgStatus.SUSPENDED) {
            nextStatus = UserStatus.SUSPENDED;
        } else {
            nextStatus = UserStatus.ACTIVE;
        }
    }

    await db.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: user.id },
            data: {
                status: nextStatus,
                emailVerifiedAt: new Date(),
            },
        });

        if (
            user.org &&
            user.org.status === OrgStatus.PENDING_OTP &&
            user.org.verificationStatus === OrgVerificationStatus.APPROVED
        ) {
            await tx.org.update({
                where: { id: user.org.id },
                data: { status: OrgStatus.ACTIVE },
            });
        }
    });

    logger.info({ userId: user.id, email: normalizedEmail, status: nextStatus }, 'User verified');

    return { success: true };
}

/**
 * Login user and return MFA challenge
 */
export async function login(input: LoginInput): Promise<LoginChallengeResult> {
    const email = normalizeEmail(input.email);

    const user = await db.user.findUnique({
        where: { email },
        include: {
            org: true,
        },
    });

    if (!user) {
        throw new AppError(ErrorCode.INVALID_CREDENTIALS, 'Invalid email or password', 401);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw new AppError(ErrorCode.ACCOUNT_LOCKED, 'Too many failed login attempts. Try again later.', 423, {
            lockedUntil: user.lockedUntil,
        });
    }

    const passwordValid = await verifyPassword(input.password, user.passwordHash);
    if (!passwordValid) {
        const shouldLock = user.failedLoginCount + 1 >= env.LOGIN_MAX_FAILED_ATTEMPTS;
        await db.user.update({
            where: { id: user.id },
            data: {
                failedLoginCount: { increment: 1 },
                lastFailedLoginAt: new Date(),
                ...(shouldLock ? { lockedUntil: getLockoutExpiry() } : {}),
            },
        });

        throw new AppError(ErrorCode.INVALID_CREDENTIALS, 'Invalid email or password', 401);
    }

    await db.user.update({
        where: { id: user.id },
        data: {
            failedLoginCount: 0,
            lastFailedLoginAt: null,
            lockedUntil: null,
        },
    });

    if (user.status === UserStatus.PENDING_OTP) {
        throw new AppError(ErrorCode.ACCOUNT_PENDING, 'Please verify your email before logging in', 403);
    }

    if (user.status === UserStatus.SUSPENDED) {
        throw new AppError(ErrorCode.ACCOUNT_SUSPENDED, 'Your account has been suspended', 403);
    }

    if (user.org && user.org.status === OrgStatus.SUSPENDED) {
        throw new AppError(ErrorCode.ORG_SUSPENDED, 'Your organization has been suspended', 403);
    }

    await clearPendingChallenges(user.id);

    if (user.mfaEnabled) {
        const challengeToken = await createAuthChallenge(user.id, AuthChallengeType.MFA_VERIFY);
        return {
            nextStep: 'MFA_VERIFY',
            challengeToken,
        };
    }

    const challengeToken = await createAuthChallenge(user.id, AuthChallengeType.MFA_SETUP);
    return {
        nextStep: 'MFA_SETUP',
        challengeToken,
    };
}

/**
 * Start MFA setup by generating TOTP secret and otpauth URI
 */
export async function startMfaSetup(challengeToken: string): Promise<{ secret: string; otpauthUrl: string }> {
    const challenge = await getActiveChallenge(challengeToken, AuthChallengeType.MFA_SETUP);

    let encryptedSecret = challenge.tempSecretEncrypted;
    if (!encryptedSecret) {
        const secret = generateTotpSecret();
        encryptedSecret = encryptSensitiveValue(secret);

        await db.authChallenge.update({
            where: { id: challenge.id },
            data: { tempSecretEncrypted: encryptedSecret },
        });
    }

    const secret = decryptSensitiveValue(encryptedSecret);
    const otpauthUrl = buildTotpUri(challenge.user.email, secret);

    return { secret, otpauthUrl };
}

/**
 * Complete MFA setup and issue tokens
 */
export async function completeMfaSetup(
    challengeToken: string,
    code: string,
    meta: RequestMeta
): Promise<{ tokens: AuthTokens; backupCodes: string[] }> {
    const challenge = await getActiveChallenge(challengeToken, AuthChallengeType.MFA_SETUP);

    if (!challenge.tempSecretEncrypted) {
        throw new AppError(ErrorCode.MFA_INVALID, 'MFA setup is not initialized', 400);
    }

    const secret = decryptSensitiveValue(challenge.tempSecretEncrypted);
    if (!verifyTotpCode(secret, code)) {
        await markChallengeAttempt(challenge);
        throw new AppError(ErrorCode.MFA_INVALID, 'Invalid authentication code', 401);
    }

    const backupCodes = generateBackupCodes();

    await db.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: challenge.userId },
            data: {
                mfaEnabled: true,
                mfaSecretEncrypted: challenge.tempSecretEncrypted,
                mfaEnabledAt: new Date(),
            },
        });

        await tx.userBackupCode.deleteMany({ where: { userId: challenge.userId } });
        await tx.userBackupCode.createMany({
            data: backupCodes.map((codeValue) => ({
                userId: challenge.userId,
                codeHash: hashBackupCode(codeValue),
            })),
        });

        await tx.authChallenge.update({
            where: { id: challenge.id },
            data: { consumedAt: new Date() },
        });
    });

    await notifyInApp(
        challenge.userId,
        NotificationType.SECURITY_MFA_ENABLED,
        'Two-factor authentication enabled',
        'Your account is now protected with authenticator-based verification.'
    );

    const tokens = await generateTokens(challenge.user, meta);
    await notifyNewLogin(challenge.userId, challenge.user.email, meta);

    return { tokens, backupCodes };
}

async function matchBackupCode(userId: string, backupCode: string): Promise<{ id: string; usedAt: Date | null } | null> {
    const codes = await db.userBackupCode.findMany({
        where: { userId },
        select: {
            id: true,
            codeHash: true,
            usedAt: true,
        },
    });

    for (const item of codes) {
        if (verifyBackupCode(backupCode, item.codeHash)) {
            return { id: item.id, usedAt: item.usedAt };
        }
    }

    return null;
}

/**
 * Verify MFA challenge and issue tokens
 */
export async function verifyMfaChallenge(
    challengeToken: string,
    input: { code?: string; backupCode?: string },
    meta: RequestMeta
): Promise<{ tokens: AuthTokens; usedBackupCode?: boolean }> {
    const challenge = await getActiveChallenge(challengeToken, AuthChallengeType.MFA_VERIFY);

    if (!challenge.user.mfaEnabled || !challenge.user.mfaSecretEncrypted) {
        throw new AppError(ErrorCode.MFA_SETUP_REQUIRED, 'MFA setup is required for this account', 403);
    }

    let valid = false;
    let usedBackupCode = false;

    if (input.code) {
        const secret = decryptSensitiveValue(challenge.user.mfaSecretEncrypted);
        valid = verifyTotpCode(secret, input.code);
    } else if (input.backupCode) {
        const matched = await matchBackupCode(challenge.userId, input.backupCode);

        if (matched?.usedAt) {
            throw new AppError(ErrorCode.MFA_BACKUP_CODE_USED, 'This backup code has already been used', 409);
        }

        if (matched) {
            valid = true;
            usedBackupCode = true;
            await db.userBackupCode.update({
                where: { id: matched.id },
                data: { usedAt: new Date() },
            });
        }
    }

    if (!valid) {
        await markChallengeAttempt(challenge);
        throw new AppError(ErrorCode.MFA_INVALID, 'Invalid authentication code', 401);
    }

    await consumeChallenge(challenge.id);

    const tokens = await generateTokens(challenge.user, meta);
    await notifyNewLogin(challenge.userId, challenge.user.email, meta);

    return { tokens, usedBackupCode: usedBackupCode || undefined };
}

export async function getMfaStatus(userId: string): Promise<{ mfaEnabled: boolean; backupCodesRemaining: number }> {
    const user = await db.user.findUnique({
        where: { id: userId },
        select: { mfaEnabled: true },
    });

    if (!user) {
        throw new AppError(ErrorCode.NOT_FOUND, 'User not found', 404);
    }

    const backupCodesRemaining = await db.userBackupCode.count({
        where: {
            userId,
            usedAt: null,
        },
    });

    return {
        mfaEnabled: user.mfaEnabled,
        backupCodesRemaining,
    };
}

export async function regenerateBackupCodes(userId: string, code: string): Promise<{ backupCodes: string[] }> {
    const user = await db.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            mfaEnabled: true,
            mfaSecretEncrypted: true,
        },
    });

    if (!user) {
        throw new AppError(ErrorCode.NOT_FOUND, 'User not found', 404);
    }

    if (!user.mfaEnabled || !user.mfaSecretEncrypted) {
        throw new AppError(ErrorCode.MFA_SETUP_REQUIRED, 'MFA is not enabled for this account', 400);
    }

    const secret = decryptSensitiveValue(user.mfaSecretEncrypted);
    if (!verifyTotpCode(secret, code)) {
        throw new AppError(ErrorCode.MFA_INVALID, 'Invalid authentication code', 401);
    }

    const backupCodes = generateBackupCodes();

    await db.$transaction(async (tx) => {
        await tx.userBackupCode.deleteMany({ where: { userId } });
        await tx.userBackupCode.createMany({
            data: backupCodes.map((codeValue) => ({
                userId,
                codeHash: hashBackupCode(codeValue),
            })),
        });
    });

    return { backupCodes };
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(refreshToken: string, meta: RequestMeta): Promise<AuthTokens> {
    try {
        verifyRefreshToken(refreshToken);
    } catch {
        throw new AppError(ErrorCode.TOKEN_INVALID, 'Invalid refresh token', 401);
    }

    const tokenHash = hashToken(refreshToken);
    const storedToken = await db.refreshToken.findUnique({
        where: { tokenHash },
        include: {
            user: {
                include: {
                    org: true,
                },
            },
        },
    });

    if (!storedToken || storedToken.revokedAt) {
        throw new AppError(ErrorCode.TOKEN_INVALID, 'Refresh token not found', 401);
    }

    if (storedToken.expiresAt < new Date()) {
        await db.refreshToken.updateMany({
            where: { id: storedToken.id, revokedAt: null },
            data: { revokedAt: new Date() },
        });
        throw new AppError(ErrorCode.TOKEN_EXPIRED, 'Refresh token has expired', 401);
    }

    const user = storedToken.user;
    if (user.status === UserStatus.SUSPENDED) {
        throw new AppError(ErrorCode.ACCOUNT_SUSPENDED, 'Account is suspended', 403);
    }

    if (user.org && user.org.status === OrgStatus.SUSPENDED) {
        throw new AppError(ErrorCode.ORG_SUSPENDED, 'Organization is suspended', 403);
    }

    const revoked = await db.refreshToken.updateMany({
        where: {
            id: storedToken.id,
            revokedAt: null,
        },
        data: {
            revokedAt: new Date(),
            lastUsedAt: new Date(),
        },
    });

    if (revoked.count === 0) {
        throw new AppError(ErrorCode.TOKEN_INVALID, 'Refresh token already used', 401);
    }

    return generateTokens(user, meta);
}

/**
 * Logout - revoke refresh token
 */
export async function logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);

    await db.refreshToken.updateMany({
        where: {
            tokenHash,
            revokedAt: null,
        },
        data: {
            revokedAt: new Date(),
            lastUsedAt: new Date(),
        },
    });
}

export async function listSessions(userId: string, currentRefreshToken: string | null) {
    const currentHash = currentRefreshToken ? hashToken(currentRefreshToken) : null;

    const sessions = await db.refreshToken.findMany({
        where: {
            userId,
            revokedAt: null,
            expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            userAgent: true,
            createdAt: true,
            lastUsedAt: true,
            expiresAt: true,
            tokenHash: true,
        },
    });

    return sessions.map((session) => ({
        id: session.id,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt,
        expiresAt: session.expiresAt,
        isCurrent: currentHash ? session.tokenHash === currentHash : false,
    }));
}

export async function revokeSession(userId: string, sessionId: string): Promise<void> {
    const revoked = await db.refreshToken.updateMany({
        where: {
            id: sessionId,
            userId,
            revokedAt: null,
        },
        data: {
            revokedAt: new Date(),
            lastUsedAt: new Date(),
        },
    });

    if (revoked.count === 0) {
        throw new AppError(ErrorCode.NOT_FOUND, 'Session not found', 404);
    }
}

export async function revokeOtherSessions(userId: string, currentRefreshToken: string | null): Promise<{ revokedCount: number }> {
    const currentHash = currentRefreshToken ? hashToken(currentRefreshToken) : null;

    const revoked = await db.refreshToken.updateMany({
        where: {
            userId,
            revokedAt: null,
            ...(currentHash ? { tokenHash: { not: currentHash } } : {}),
        },
        data: {
            revokedAt: new Date(),
            lastUsedAt: new Date(),
        },
    });

    return { revokedCount: revoked.count };
}

/**
 * Request password reset OTP
 */
export async function requestPasswordReset(email: string): Promise<{ success: boolean }> {
    const normalizedEmail = normalizeEmail(email);

    const user = await db.user.findUnique({ where: { email: normalizedEmail } });

    if (!user || user.status === UserStatus.SUSPENDED) {
        logger.info({ email: normalizedEmail }, 'Password reset requested for invalid account');
        return { success: true };
    }

    await otpService.createAndSendOtp(normalizedEmail, OtpPurpose.PASSWORD_RESET);

    logger.info({ userId: user.id, email: normalizedEmail }, 'Password reset OTP sent');

    return { success: true };
}

/**
 * Reset password with OTP
 */
export async function resetPassword(input: ResetPasswordInput): Promise<{ success: boolean }> {
    const email = normalizeEmail(input.email);

    const result = await otpService.verifyOtp(email, OtpPurpose.PASSWORD_RESET, input.code);

    if (!result.valid) {
        const messages: Record<string, string> = {
            expired: 'OTP has expired. Please request a new one.',
            invalid: 'Invalid OTP code.',
            max_attempts: 'Maximum attempts exceeded. Please request a new OTP.',
            not_found: 'No password reset request found.',
        };
        throw new AppError(
            `OTP_${result.error?.toUpperCase() || 'ERROR'}`,
            messages[result.error || 'invalid'],
            400
        );
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
        throw new AppError(ErrorCode.NOT_FOUND, 'User not found', 404);
    }

    const passwordHash = await hashPassword(input.newPassword);

    await db.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                failedLoginCount: 0,
                lastFailedLoginAt: null,
                lockedUntil: null,
            },
        });

        await tx.refreshToken.updateMany({
            where: {
                userId: user.id,
                revokedAt: null,
            },
            data: {
                revokedAt: new Date(),
            },
        });
    });

    await notifyInApp(
        user.id,
        NotificationType.SECURITY_NEW_LOGIN,
        'Password was reset',
        'Your password was changed successfully. If this was not you, contact support immediately.'
    );

    logger.info({ userId: user.id, email }, 'Password reset successfully');

    return { success: true };
}

/**
 * Get current user info
 */
export async function getCurrentUser(userId: string): Promise<AuthUser> {
    const user = await db.user.findUnique({
        where: { id: userId },
        include: {
            studentProfile: {
                select: { id: true, firstName: true, lastName: true },
            },
            org: {
                select: {
                    id: true,
                    name: true,
                    status: true,
                    verificationStatus: true,
                    verificationReviewNotes: true,
                },
            },
            orgJoinRequest: {
                select: {
                    status: true,
                    adminNote: true,
                },
            },
        },
    });

    if (!user) {
        throw new AppError(ErrorCode.NOT_FOUND, 'User not found', 404);
    }

    return {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        orgId: user.orgId,
        mfaEnabled: user.mfaEnabled,
        studentProfile: user.studentProfile,
        org: user.org,
        pendingContext: getPendingContext(user),
    };
}

/**
 * Resend OTP for signup verification
 */
export async function resendSignupOtp(email: string): Promise<{ success: boolean; cooldownRemaining?: number }> {
    const normalizedEmail = normalizeEmail(email);

    const user = await db.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
        throw new AppError(ErrorCode.NOT_FOUND, 'No pending verification found for this email', 404);
    }

    if (user.status !== UserStatus.PENDING_OTP) {
        throw new AppError(ErrorCode.CONFLICT, 'Account is already verified', 409);
    }

    const result = await otpService.resendOtp(normalizedEmail, OtpPurpose.SIGNUP_VERIFY);

    if (!result.success) {
        if (result.error === 'cooldown') {
            throw new AppError(
                ErrorCode.OTP_COOLDOWN,
                `Please wait ${result.cooldownRemaining} seconds before requesting another OTP`,
                429
            );
        }
        if (result.error === 'rate_limit') {
            throw new AppError(
                ErrorCode.OTP_RATE_LIMIT,
                'Too many OTP requests. Please try again later.',
                429
            );
        }
    }

    return { success: true };
}

export async function adminResetUserMfa(adminUserId: string, userId: string): Promise<void> {
    const user = await db.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
        },
    });

    if (!user) {
        throw new AppError(ErrorCode.NOT_FOUND, 'User not found', 404);
    }

    await db.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: user.id },
            data: {
                mfaEnabled: false,
                mfaSecretEncrypted: null,
                mfaEnabledAt: null,
            },
        });

        await tx.userBackupCode.deleteMany({ where: { userId: user.id } });
        await tx.authChallenge.deleteMany({ where: { userId: user.id } });
        await tx.refreshToken.updateMany({
            where: {
                userId: user.id,
                revokedAt: null,
            },
            data: {
                revokedAt: new Date(),
            },
        });

        await tx.auditLog.create({
            data: {
                userId: adminUserId,
                action: 'USER_MFA_RESET',
                targetType: 'USER',
                targetId: user.id,
                details: { reason: 'Admin reset' } as Prisma.JsonObject,
            },
        });
    });

    await notifyInApp(
        user.id,
        NotificationType.SECURITY_MFA_RESET,
        'Two-factor authentication reset',
        'Your MFA settings were reset by an administrator. You must set up MFA again on next login.'
    );

    try {
        await sendEmail({
            to: user.email,
            subject: 'Eagle-Foundry MFA Reset Notice',
            htmlBody: '<p>Your MFA configuration was reset by an administrator. Please sign in and set up MFA again.</p>',
            textBody: 'Your MFA configuration was reset by an administrator. Please sign in and set up MFA again.',
        });
    } catch (error) {
        logger.warn({ userId: user.id, error }, 'Failed to send MFA reset email');
    }
}

async function generateTokens(
    user: {
        id: string;
        email: string;
        role: UserRole;
        orgId: string | null;
    },
    meta: RequestMeta
): Promise<AuthTokens> {
    const accessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        orgId: user.orgId || undefined,
    });

    const refreshToken = generateRefreshToken({
        userId: user.id,
        tokenId: crypto.randomUUID(),
    });

    const tokenHash = hashToken(refreshToken);
    const expiresAt = getTokenExpiry(env.JWT_REFRESH_EXPIRES_IN);

    await db.refreshToken.create({
        data: {
            tokenHash,
            userId: user.id,
            expiresAt,
            userAgent: meta.userAgent || null,
            ipHash: meta.ip ? hashToken(meta.ip) : null,
            lastUsedAt: new Date(),
        },
    });

    return {
        accessToken,
        refreshToken,
        expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    };
}
