/**
 * Helper assíncrono genérico usando Web Crypto API
 * Usado pelas classes de Adapters para gerar assinaturas de requisições API
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

export async function encryptData(data: string, passphrase: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  );

  const encryptedArray = Array.from(new Uint8Array(encryptedBuffer));
  const saltArray = Array.from(salt);
  const ivArray = Array.from(iv);

  const payload = {
    s: btoa(String.fromCharCode(...saltArray)),
    i: btoa(String.fromCharCode(...ivArray)),
    c: btoa(String.fromCharCode(...encryptedArray))
  };

  return btoa(JSON.stringify(payload));
}

export async function decryptData(encryptedPayload: string, passphrase: string): Promise<string> {
  try {
    const payload = JSON.parse(atob(encryptedPayload));
    
    const salt = new Uint8Array(atob(payload.s).split('').map(c => c.charCodeAt(0)));
    const iv = new Uint8Array(atob(payload.i).split('').map(c => c.charCodeAt(0)));
    const cipherText = new Uint8Array(atob(payload.c).split('').map(c => c.charCodeAt(0)));

    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

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

