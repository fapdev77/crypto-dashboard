/**
 * Helper assíncrono genérico usando Web Crypto API
 * Usado pelas classes de Adapters para gerar assinaturas de requisições API
 * e pelo cofre local para criptografia AES-GCM-256 + PBKDF2 (600.000 iterações).
 */
export async function hmacSha256(prehash: string, secret: string, format: 'hex' | 'base64'): Promise<string> {
  const encoder = new TextEncoder();
  const key = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await window.crypto.subtle.sign('HMAC', key, encoder.encode(prehash));
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  
  if (format === 'hex') {
    return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    return btoa(String.fromCharCode(...signatureArray));
  }
}

export const DEFAULT_PBKDF2_ITERATIONS = 600000;

export interface EncryptedPayloadEnvelope {
  v?: number;
  iter?: number;
  s: string;
  i: string;
  c: string;
}

/**
 * Derives an AES-GCM 256-bit CryptoKey from passphrase + salt using PBKDF2-SHA-256.
 */
export async function deriveVaultKey(
  passphrase: string,
  salt: Uint8Array,
  iterations = DEFAULT_PBKDF2_ITERATIONS
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts data using an already derived CryptoKey and salt (sub-millisecond execution).
 */
export async function encryptWithDerivedKey(
  data: string,
  key: CryptoKey,
  salt: Uint8Array,
  iterations = DEFAULT_PBKDF2_ITERATIONS
): Promise<string> {
  const encoder = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  );

  const payload: EncryptedPayloadEnvelope = {
    v: 2,
    iter: iterations,
    s: btoa(String.fromCharCode(...Array.from(salt))),
    i: btoa(String.fromCharCode(...Array.from(iv))),
    c: btoa(String.fromCharCode(...Array.from(new Uint8Array(encryptedBuffer))))
  };

  return btoa(JSON.stringify(payload));
}

export async function encryptData(
  data: string,
  passphrase: string,
  iterations = DEFAULT_PBKDF2_ITERATIONS
): Promise<string> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveVaultKey(passphrase, salt, iterations);
  return encryptWithDerivedKey(data, key, salt, iterations);
}

export async function decryptData(encryptedPayload: string, passphrase: string): Promise<string> {
  try {
    const payload: EncryptedPayloadEnvelope = JSON.parse(atob(encryptedPayload));
    const iterations = typeof payload.iter === 'number' && payload.iter > 0 ? payload.iter : 100000;
    
    const salt = new Uint8Array(atob(payload.s).split('').map(c => c.charCodeAt(0)));
    const iv = new Uint8Array(atob(payload.i).split('').map(c => c.charCodeAt(0)));
    const cipherText = new Uint8Array(atob(payload.c).split('').map(c => c.charCodeAt(0)));

    const key = await deriveVaultKey(passphrase, salt, iterations);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipherText
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    throw new Error('Invalid passphrase or corrupted data');
  }
}
