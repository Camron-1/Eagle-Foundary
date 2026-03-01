import crypto from 'crypto';
import { decryptDataKey, encryptDataKey } from '../connectors/kms.js';
import { EncryptionConstants } from '../config/constants.js';

export interface EncryptedEnvelope {
    algorithm: 'AES-256-GCM';
    ciphertext: string;
    iv: string;
    wrappedDataKey: string;
    keyVersion: number;
    contextType: string;
}

function buildAad(contextType: string, contextId?: string): Buffer {
    return Buffer.from(contextId ? `${contextType}:${contextId}` : contextType, 'utf8');
}

function createDataKey(): Buffer {
    return crypto.randomBytes(32);
}

export async function encryptTextValue(
    plainText: string,
    contextType: string,
    contextId?: string
): Promise<EncryptedEnvelope> {
    const dataKey = createDataKey();
    const iv = crypto.randomBytes(12);
    const aad = buildAad(contextType, contextId);
    const cipher = crypto.createCipheriv('aes-256-gcm', dataKey, iv);
    cipher.setAAD(aad);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const wrappedDataKey = await encryptDataKey(
        dataKey,
        contextId ? { contextType, contextId } : { contextType }
    );

    return {
        algorithm: 'AES-256-GCM',
        ciphertext: Buffer.concat([encrypted, authTag]).toString('base64'),
        iv: iv.toString('base64'),
        wrappedDataKey,
        keyVersion: EncryptionConstants.DEFAULT_KEY_VERSION,
        contextType,
    };
}

export async function decryptTextValue(
    envelope: EncryptedEnvelope,
    contextType: string,
    contextId?: string
): Promise<string> {
    if (envelope.algorithm !== 'AES-256-GCM') {
        throw new Error('Unsupported encryption algorithm');
    }

    const dataKey = await decryptDataKey(
        envelope.wrappedDataKey,
        contextId ? { contextType, contextId } : { contextType }
    );
    const payload = Buffer.from(envelope.ciphertext, 'base64');
    const iv = Buffer.from(envelope.iv, 'base64');
    const authTag = payload.subarray(payload.length - 16);
    const encrypted = payload.subarray(0, payload.length - 16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', dataKey, iv);
    decipher.setAAD(buildAad(contextType, contextId));
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
}

export async function encryptJsonValue(
    value: unknown,
    contextType: string,
    contextId?: string
): Promise<EncryptedEnvelope> {
    return encryptTextValue(JSON.stringify(value), contextType, contextId);
}

export async function decryptJsonValue<T>(
    envelope: EncryptedEnvelope,
    contextType: string,
    contextId?: string
): Promise<T> {
    const json = await decryptTextValue(envelope, contextType, contextId);
    return JSON.parse(json) as T;
}

