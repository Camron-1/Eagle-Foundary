import crypto from 'crypto';
import { DecryptCommand, EncryptCommand, KMSClient } from '@aws-sdk/client-kms';
import { env } from '../config/env.js';

const kmsClient = new KMSClient({
    region: env.AWS_REGION,
    ...(env.AWS_ACCESS_KEY_ID &&
        env.AWS_SECRET_ACCESS_KEY && {
        credentials: {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        },
    }),
});

function getLocalWrappingKey(): Buffer {
    const key = Buffer.from(env.MFA_ENCRYPTION_KEY, 'base64');
    if (key.length !== 32) {
        throw new Error('MFA_ENCRYPTION_KEY must decode to 32 bytes');
    }
    return key;
}

function localWrapDataKey(dataKey: Buffer): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', getLocalWrappingKey(), iv);
    const encrypted = Buffer.concat([cipher.update(dataKey), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `local:${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

function localUnwrapDataKey(payload: string): Buffer {
    const encoded = payload.slice('local:'.length);
    const [ivPart, tagPart, cipherPart] = encoded.split('.');
    if (!ivPart || !tagPart || !cipherPart) {
        throw new Error('Invalid local wrapped key payload');
    }

    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        getLocalWrappingKey(),
        Buffer.from(ivPart, 'base64url')
    );
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
    return Buffer.concat([
        decipher.update(Buffer.from(cipherPart, 'base64url')),
        decipher.final(),
    ]);
}

function normalizeContext(context?: Record<string, string>): Record<string, string> | undefined {
    if (!context) {
        return undefined;
    }
    const pairs = Object.entries(context).filter(([, value]) => typeof value === 'string' && value.length > 0);
    if (pairs.length === 0) {
        return undefined;
    }
    return Object.fromEntries(pairs);
}

export async function encryptDataKey(
    dataKey: Buffer,
    context?: Record<string, string>
): Promise<string> {
    if (!env.AWS_KMS_KEY_ID) {
        return localWrapDataKey(dataKey);
    }

    const response = await kmsClient.send(
        new EncryptCommand({
            KeyId: env.AWS_KMS_KEY_ID,
            Plaintext: dataKey,
            EncryptionContext: normalizeContext(context),
        })
    );

    if (!response.CiphertextBlob) {
        throw new Error('KMS encrypt response missing CiphertextBlob');
    }

    return `kms:${Buffer.from(response.CiphertextBlob).toString('base64')}`;
}

export async function decryptDataKey(
    wrappedDataKey: string,
    context?: Record<string, string>
): Promise<Buffer> {
    if (wrappedDataKey.startsWith('local:')) {
        return localUnwrapDataKey(wrappedDataKey);
    }

    if (!wrappedDataKey.startsWith('kms:')) {
        throw new Error('Unsupported wrapped key format');
    }

    const blob = Buffer.from(wrappedDataKey.slice('kms:'.length), 'base64');
    const response = await kmsClient.send(
        new DecryptCommand({
            CiphertextBlob: blob,
            KeyId: env.AWS_KMS_KEY_ID,
            EncryptionContext: normalizeContext(context),
        })
    );

    if (!response.Plaintext) {
        throw new Error('KMS decrypt response missing Plaintext');
    }

    return Buffer.from(response.Plaintext as Uint8Array);
}

export function hashForBlindIndex(value: string): string {
    return crypto
        .createHash('sha256')
        .update(`${value}${env.FIELD_ENCRYPTION_HASH_PEPPER}`)
        .digest('hex');
}

