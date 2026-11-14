import { describe, it, expect } from 'vitest';
import { encryptData, decryptData, hmacSha256 } from '../cryptoLib';

describe('cryptoLib', () => {
  describe('hmacSha256', () => {
    it('generates consistent HMAC-SHA256 hex signatures', async () => {
      const sig1 = await hmacSha256('test-message', 'secret-key', 'hex');
      const sig2 = await hmacSha256('test-message', 'secret-key', 'hex');
      expect(sig1).toBe(sig2);
      expect(sig1).toMatch(/^[0-9a-f]{64}$/);
    });

    it('generates consistent HMAC-SHA256 base64 signatures', async () => {
      const sig = await hmacSha256('test-message', 'secret-key', 'base64');
      expect(sig).toBeDefined();
      expect(typeof sig).toBe('string');
      expect(sig.length).toBeGreaterThan(10);
    });
  });

  describe('encryptData and decryptData (v2 with PBKDF2 600,000 iterations)', () => {
    const testSecret = 'SuperSecretPassphrase123!';
    const testPayload = JSON.stringify({
      apiKey: 'test-api-key-xyz',
      apiSecret: 'test-api-secret-123456',
      subAccounts: ['acc1', 'acc2'],
    });

    it('encrypts and successfully decrypts data with correct passphrase', async () => {
      const encrypted = await encryptData(testPayload, testSecret);
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');

      // Envelope check: should be base64 JSON containing v: 2 and iter: 600000
      const parsedEnvelope = JSON.parse(atob(encrypted));
      expect(parsedEnvelope.v).toBe(2);
      expect(parsedEnvelope.iter).toBe(600000);
      expect(parsedEnvelope.s).toBeDefined();
      expect(parsedEnvelope.i).toBeDefined();
      expect(parsedEnvelope.c).toBeDefined();

      const decrypted = await decryptData(encrypted, testSecret);
      expect(decrypted).toBe(testPayload);
    });

    it('fails decryption when provided with an incorrect passphrase', async () => {
      const encrypted = await encryptData(testPayload, testSecret);
      await expect(decryptData(encrypted, 'WrongPassphrase!')).rejects.toThrow(
        /Invalid passphrase or corrupted data/i
      );
    });

    it('fails decryption if encrypted payload is tampered with', async () => {
      const encrypted = await encryptData(testPayload, testSecret);
      const envelope = JSON.parse(atob(encrypted));
      
      // Corrupt the ciphertext
      const tamperedBytes = atob(envelope.c);
      const corruptedBytes = tamperedBytes.substring(0, tamperedBytes.length - 2) + 'AA';
      envelope.c = btoa(corruptedBytes);
      const tamperedPayload = btoa(JSON.stringify(envelope));

      await expect(decryptData(tamperedPayload, testSecret)).rejects.toThrow(
        /Invalid passphrase or corrupted data/i
      );
    });

    it('maintains backwards compatibility with legacy v1 payloads (100,000 iterations without version header)', async () => {
      // Craft a legacy v1 payload manually using 100,000 iterations and no "v" or "iter"
      const encoder = new TextEncoder();
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(testSecret),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      const key = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      const encryptedBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(testPayload)
      );

      const legacyEnvelope = {
        s: btoa(String.fromCharCode(...Array.from(salt))),
        i: btoa(String.fromCharCode(...Array.from(iv))),
        c: btoa(String.fromCharCode(...Array.from(new Uint8Array(encryptedBuffer)))),
      };
      const legacyEncodedPayload = btoa(JSON.stringify(legacyEnvelope));

      // Must be able to decrypt legacy payload seamlessly
      const decrypted = await decryptData(legacyEncodedPayload, testSecret);
      expect(decrypted).toBe(testPayload);
    });
  });
});
