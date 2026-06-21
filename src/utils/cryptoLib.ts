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
