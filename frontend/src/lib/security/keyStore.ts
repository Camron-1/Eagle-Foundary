const STORAGE_KEY = 'ef_message_device_key_v1';

export interface DeviceKeyMaterial {
  algorithm: 'RSA-OAEP-SHA256';
  publicKeyPem: string;
  privateKeyJwk: JsonWebKey;
  publicKeyJwk: JsonWebKey;
  fingerprint: string;
  createdAt: string;
}

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

function toPem(label: 'PUBLIC KEY', der: ArrayBuffer): string {
  const base64 = arrayBufferToBase64(der);
  const lines = base64.match(/.{1,64}/g)?.join('\n') ?? base64;
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----`;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function parsePemToBuffer(pem: string): ArrayBuffer {
  const base64 = pem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s+/g, '');
  return base64ToArrayBuffer(base64);
}

function loadStored(): DeviceKeyMaterial | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DeviceKeyMaterial;
    if (!parsed?.publicKeyPem || !parsed?.privateKeyJwk || !parsed?.fingerprint) return null;
    return parsed;
  } catch {
    return null;
  }
}

function store(material: DeviceKeyMaterial): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(material));
}

export async function ensureDeviceKeyMaterial(): Promise<DeviceKeyMaterial> {
  const existing = loadStored();
  if (existing) return existing;

  const pair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );

  const [publicDer, privateJwk, publicJwk] = await Promise.all([
    crypto.subtle.exportKey('spki', pair.publicKey),
    crypto.subtle.exportKey('jwk', pair.privateKey),
    crypto.subtle.exportKey('jwk', pair.publicKey),
  ]);

  const publicKeyPem = toPem('PUBLIC KEY', publicDer);
  const fingerprint = await sha256Hex(publicKeyPem);
  const material: DeviceKeyMaterial = {
    algorithm: 'RSA-OAEP-SHA256',
    publicKeyPem,
    privateKeyJwk: privateJwk,
    publicKeyJwk: publicJwk,
    fingerprint,
    createdAt: new Date().toISOString(),
  };
  store(material);
  return material;
}

export async function importDevicePrivateKey(privateKeyJwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    privateKeyJwk,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['decrypt', 'unwrapKey']
  );
}

export async function importPublicKeyFromPem(publicKeyPem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'spki',
    parsePemToBuffer(publicKeyPem),
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'wrapKey']
  );
}

