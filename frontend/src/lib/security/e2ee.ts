import type { Message, MessageKeyEnvelope, ThreadCryptoContext } from '@/lib/api/types';
import { ensureDeviceKeyMaterial, importDevicePrivateKey, importPublicKeyFromPem } from './keyStore';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToArrayBuffer(value: string): ArrayBuffer {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function getThreadKeyForEncrypt(
  context: ThreadCryptoContext,
  myUserId: string
): Promise<{ key: CryptoKey; keyVersion: number; envelopes: MessageKeyEnvelope[] }> {
  const material = await ensureDeviceKeyMaterial();
  const privateKey = await importDevicePrivateKey(material.privateKeyJwk);
  const myEnvelope = context.keyEnvelopes.find(
    (item) => item.userId === myUserId && item.keyVersion === context.currentKeyVersion
  );

  if (myEnvelope) {
    const keyData = await crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      base64ToArrayBuffer(myEnvelope.wrappedThreadKey)
    );
    const aesKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      true,
      ['encrypt', 'decrypt']
    );
    return {
      key: aesKey,
      keyVersion: context.currentKeyVersion,
      envelopes: [],
    };
  }

  const keyVersion = context.currentKeyVersion + 1;
  const aesKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const rawAesKey = await crypto.subtle.exportKey('raw', aesKey);
  const envelopes: MessageKeyEnvelope[] = [];

  for (const key of context.keys) {
    const recipientKey = await importPublicKeyFromPem(key.publicKeyPem);
    const wrapped = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, recipientKey, rawAesKey);
    envelopes.push({
      userId: key.userId,
      keyVersion,
      wrappedThreadKey: arrayBufferToBase64(wrapped),
      recipientKeyFingerprint: key.fingerprint,
    });
  }

  return {
    key: aesKey,
    keyVersion,
    envelopes,
  };
}

export async function encryptThreadMessage(
  plainText: string,
  context: ThreadCryptoContext,
  myUserId: string,
  senderFingerprint: string
): Promise<{
  ciphertext: string;
  iv: string;
  keyVersion: number;
  encryptionVersion: number;
  senderKeyFingerprint: string;
  keyEnvelopes: MessageKeyEnvelope[];
}> {
  const { key, keyVersion, envelopes } = await getThreadKeyForEncrypt(context, myUserId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plainText)
  );

  return {
    ciphertext: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer),
    keyVersion,
    encryptionVersion: 1,
    senderKeyFingerprint: senderFingerprint,
    keyEnvelopes: envelopes,
  };
}

export async function decryptThreadMessage(
  message: Message,
  context: ThreadCryptoContext,
  myUserId: string
): Promise<string> {
  if (!message.isEncrypted) {
    return message.content ?? '';
  }

  if (!message.ciphertext || !message.iv || !message.keyVersion) {
    return '[Encrypted message unavailable]';
  }

  const material = await ensureDeviceKeyMaterial();
  const privateKey = await importDevicePrivateKey(material.privateKeyJwk);
  const myEnvelope = context.keyEnvelopes.find(
    (item) => item.userId === myUserId && item.keyVersion === message.keyVersion
  );

  if (!myEnvelope) {
    return '[Encrypted message unavailable on this device]';
  }

  try {
    const rawThreadKey = await crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      base64ToArrayBuffer(myEnvelope.wrappedThreadKey)
    );

    const aesKey = await crypto.subtle.importKey(
      'raw',
      rawThreadKey,
      { name: 'AES-GCM' },
      true,
      ['decrypt']
    );

    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(base64ToArrayBuffer(message.iv)) },
      aesKey,
      base64ToArrayBuffer(message.ciphertext)
    );
    return new TextDecoder().decode(plainBuffer);
  } catch {
    return '[Encrypted message unavailable on this device]';
  }
}

