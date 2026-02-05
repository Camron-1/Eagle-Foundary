import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';

const BCRYPT_ROUNDS = 12;

// Password hashing
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

// OTP generation and hashing
export function generateOtp(): string {
    const otp = crypto.randomInt(100000, 999999).toString();
    return otp;
}

export function hashOtp(otp: string): string {
    const combined = otp + env.OTP_HASH_PEPPER;
    return crypto.createHash('sha256').update(combined).digest('hex');
}

export function verifyOtp(otp: string, hashedOtp: string): boolean {
    const otpHash = hashOtp(otp);
    return crypto.timingSafeEqual(Buffer.from(otpHash), Buffer.from(hashedOtp));
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
    // Use type assertion for expiresIn since jsonwebtoken types expect branded string
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
