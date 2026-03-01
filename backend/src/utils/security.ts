import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';

const BCRYPT_ROUNDS = 12;
const TOTP_DIGITS = 6;
const TOTP_PERIOD_SECONDS = 30;
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const BACKUP_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

// Password hashing
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

// OTP generation and hashing
export function generateOtp(): string {
    return crypto.randomInt(100000, 999999).toString();
}

export function hashOtp(otp: string): string {
    const combined = otp + env.OTP_HASH_PEPPER;
    return crypto.createHash('sha256').update(combined).digest('hex');
}

export function verifyOtp(otp: string, hashedOtp: string): boolean {
    const otpHash = hashOtp(otp);
    const otpHashBuf = Buffer.from(otpHash);
    const hashedOtpBuf = Buffer.from(hashedOtp);
    if (otpHashBuf.length !== hashedOtpBuf.length) {
        return false;
    }
    return crypto.timingSafeEqual(otpHashBuf, hashedOtpBuf);
}

// JWT tokens
export interface AccessTokenPayload {
    userId: string;
    email: string;
    role: string;
    orgId?: string;
}

export interface RefreshTokenPayload {
    userId: string;
    tokenId: string;
}

export function generateAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(
        payload as object,
        env.JWT_ACCESS_SECRET,
        { expiresIn: env.JWT_ACCESS_EXPIRES_IN } as jwt.SignOptions
    );
}

export function generateRefreshToken(payload: RefreshTokenPayload): string {
    return jwt.sign(
        payload as object,
        env.JWT_REFRESH_SECRET,
        { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions
    );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

export function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

// Generate random tokens/IDs
export function generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
}

// Decode JWT without verification (for debugging/logging)
export function decodeToken(token: string): unknown {
    return jwt.decode(token);
}

// Parse JWT expiry
export function getTokenExpiry(expiresIn: string): Date {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
        throw new Error(`Invalid expiresIn format: ${expiresIn}`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const now = new Date();
    switch (unit) {
        case 's':
            return new Date(now.getTime() + value * 1000);
        case 'm':
            return new Date(now.getTime() + value * 60 * 1000);
        case 'h':
            return new Date(now.getTime() + value * 60 * 60 * 1000);
        case 'd':
            return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
        default:
            throw new Error(`Unknown time unit: ${unit}`);
    }
}

function base32Encode(input: Buffer): string {
    let bits = '';
    for (const byte of input) {
        bits += byte.toString(2).padStart(8, '0');
    }

    let output = '';
    for (let i = 0; i < bits.length; i += 5) {
        const chunk = bits.slice(i, i + 5).padEnd(5, '0');
        output += BASE32_ALPHABET[parseInt(chunk, 2)];
    }

    return output;
}

function base32Decode(input: string): Buffer {
    const normalized = input.replace(/=+$/g, '').toUpperCase();
    let bits = '';

    for (const char of normalized) {
        const index = BASE32_ALPHABET.indexOf(char);
        if (index === -1) {
            throw new Error('Invalid base32 input');
        }
        bits += index.toString(2).padStart(5, '0');
    }

    const bytes: number[] = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.slice(i, i + 8), 2));
    }

    return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number): string {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(counter));

    const hmac = crypto.createHmac('sha1', secret).update(buffer).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);

    const otp = binary % 10 ** TOTP_DIGITS;
    return otp.toString().padStart(TOTP_DIGITS, '0');
}

export function generateTotpSecret(): string {
    const randomBytes = crypto.randomBytes(20);
    return base32Encode(randomBytes);
}

export function generateTotpCode(secret: string, timestampMs: number = Date.now()): string {
    const secretBytes = base32Decode(secret);
    const counter = Math.floor(timestampMs / 1000 / TOTP_PERIOD_SECONDS);
    return hotp(secretBytes, counter);
}

export function verifyTotpCode(secret: string, code: string, window: number = 1): boolean {
    if (!/^\d{6}$/.test(code)) {
        return false;
    }

    const nowCounter = Math.floor(Date.now() / 1000 / TOTP_PERIOD_SECONDS);
    const secretBytes = base32Decode(secret);

    for (let i = -window; i <= window; i += 1) {
        const expected = hotp(secretBytes, nowCounter + i);
        if (safeCompare(expected, code)) {
            return true;
        }
    }

    return false;
}

export function buildTotpUri(email: string, secret: string): string {
    const issuer = env.MFA_ISSUER;
    const label = `${issuer}:${email}`;
    const query = new URLSearchParams({
        secret,
        issuer,
        algorithm: 'SHA1',
        digits: String(TOTP_DIGITS),
        period: String(TOTP_PERIOD_SECONDS),
    });

    return `otpauth://totp/${encodeURIComponent(label)}?${query.toString()}`;
}

function getMfaEncryptionKey(): Buffer {
    const key = Buffer.from(env.MFA_ENCRYPTION_KEY, 'base64');
    if (key.length !== 32) {
        throw new Error('MFA_ENCRYPTION_KEY must decode to 32 bytes');
    }
    return key;
}

function safeCompare(a: string, b: string): boolean {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    const maxLen = Math.max(aBuf.length, bBuf.length);
    const paddedA = Buffer.alloc(maxLen, 0);
    const paddedB = Buffer.alloc(maxLen, 0);
    aBuf.copy(paddedA);
    bBuf.copy(paddedB);
    return crypto.timingSafeEqual(paddedA, paddedB) && aBuf.length === bBuf.length;
}

export function encryptSensitiveValue(plainText: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', getMfaEncryptionKey(), iv);

    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString('base64url')}.${authTag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptSensitiveValue(cipherText: string): string {
    const [ivPart, authTagPart, encryptedPart] = cipherText.split('.');
    if (!ivPart || !authTagPart || !encryptedPart) {
        throw new Error('Invalid encrypted value format');
    }

    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        getMfaEncryptionKey(),
        Buffer.from(ivPart, 'base64url')
    );

    decipher.setAuthTag(Buffer.from(authTagPart, 'base64url'));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedPart, 'base64url')),
        decipher.final(),
    ]);

    return decrypted.toString('utf8');
}

function generateBackupCode(): string {
    let value = '';
    for (let i = 0; i < 8; i += 1) {
        const idx = crypto.randomInt(0, BACKUP_CODE_ALPHABET.length);
        value += BACKUP_CODE_ALPHABET[idx];
    }
    return `${value.slice(0, 4)}-${value.slice(4)}`;
}

export function generateBackupCodes(count: number = env.MFA_BACKUP_CODES_COUNT): string[] {
    const codes = new Set<string>();
    while (codes.size < count) {
        codes.add(generateBackupCode());
    }
    return Array.from(codes);
}

function normalizeBackupCode(code: string): string {
    return code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

export function hashBackupCode(code: string): string {
    const normalized = normalizeBackupCode(code);
    return crypto
        .createHash('sha256')
        .update(`${normalized}${env.MFA_BACKUP_CODE_PEPPER}`)
        .digest('hex');
}

export function verifyBackupCode(code: string, hash: string): boolean {
    return safeCompare(hashBackupCode(code), hash);
}
