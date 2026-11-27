import { describe, it, expect } from 'vitest';
import { validateSafeUpstreamUrl } from '../ssrfValidator';

describe('ssrfValidator', () => {
  describe('Ollama Upstream Validation (with LAN support enabled)', () => {
    const ollamaOptions = {
      allowLanIps: true,
      allowedProtocols: ['http:', 'https:'],
    };

    it('allows standard localhost and loopback Ollama instances', () => {
      const res1 = validateSafeUpstreamUrl('http://localhost:11434', ollamaOptions);
      expect(res1.isValid).toBe(true);

      const res2 = validateSafeUpstreamUrl('http://127.0.0.1:11434/api/tags', ollamaOptions);
      expect(res2.isValid).toBe(true);

      const res3 = validateSafeUpstreamUrl('http://[::1]:11434', ollamaOptions);
      expect(res3.isValid).toBe(true);
    });

    it('allows Ollama on local network IPs (e.g. 192.168.10.3, 10.0.0.5, 172.16.1.10)', () => {
      // 192.168.x.x
      const res1 = validateSafeUpstreamUrl('http://192.168.10.3:11434', ollamaOptions);
      expect(res1.isValid).toBe(true);

      // 10.x.x.x
      const res2 = validateSafeUpstreamUrl('http://10.0.0.25:11434/api/chat', ollamaOptions);
      expect(res2.isValid).toBe(true);

      // 172.16-31.x.x
      const res3 = validateSafeUpstreamUrl('http://172.16.0.10:11434', ollamaOptions);
      expect(res3.isValid).toBe(true);

      // mDNS or private local hostnames
      const res4 = validateSafeUpstreamUrl('http://ollama-server.local:11434', ollamaOptions);
      expect(res4.isValid).toBe(true);
    });

    it('strictly blocks cloud metadata endpoints (169.254.169.254, metadata.google.internal)', () => {
      const res1 = validateSafeUpstreamUrl('http://169.254.169.254/latest/meta-data/', ollamaOptions);
      expect(res1.isValid).toBe(false);
      expect(res1.reason).toMatch(/metadata/i);

      const res2 = validateSafeUpstreamUrl('http://metadata.google.internal/computeMetadata/v1/', ollamaOptions);
      expect(res2.isValid).toBe(false);
      expect(res2.reason).toMatch(/metadata/i);

      const res3 = validateSafeUpstreamUrl('http://169.254.170.2/v2/metadata', ollamaOptions);
      expect(res3.isValid).toBe(false);
    });

    it('rejects forbidden protocols like file:, gopher:, ftp:', () => {
      expect(validateSafeUpstreamUrl('file:///etc/passwd', ollamaOptions).isValid).toBe(false);
      expect(validateSafeUpstreamUrl('gopher://127.0.0.1:11434', ollamaOptions).isValid).toBe(false);
      expect(validateSafeUpstreamUrl('ftp://192.168.10.3:11434', ollamaOptions).isValid).toBe(false);
    });

    it('rejects URLs with embedded user credentials (user:pass@host)', () => {
      const res = validateSafeUpstreamUrl('http://admin:secret@192.168.10.3:11434', ollamaOptions);
      expect(res.isValid).toBe(false);
      expect(res.reason).toMatch(/userinfo/i);
    });

    it('rejects dangerous infrastructure ports (SSH 22, SMB 445, Redis 6379, MongoDB 27017)', () => {
      expect(validateSafeUpstreamUrl('http://192.168.10.3:22', ollamaOptions).isValid).toBe(false);
      expect(validateSafeUpstreamUrl('http://192.168.10.3:445', ollamaOptions).isValid).toBe(false);
      expect(validateSafeUpstreamUrl('http://192.168.10.3:6379', ollamaOptions).isValid).toBe(false);
      expect(validateSafeUpstreamUrl('http://192.168.10.3:27017', ollamaOptions).isValid).toBe(false);
    });
  });

  describe('Exchange & Cloud AI Provider Validation (Strict Allowlist)', () => {
    const exchangeOptions = {
      allowedProtocols: ['https:'],
      allowedDomains: [
        'api.bybit.com',
        'api.bitget.com',
        'www.okx.com',
        'api.okx.com',
        'api.openai.com',
        'openrouter.ai',
      ],
    };

    it('allows valid HTTPS requests to allowed domains', () => {
      expect(validateSafeUpstreamUrl('https://api.bybit.com/v5/market/time', exchangeOptions).isValid).toBe(true);
      expect(validateSafeUpstreamUrl('https://openrouter.ai/api/v1/models', exchangeOptions).isValid).toBe(true);
      expect(validateSafeUpstreamUrl('https://api.openai.com/v1/chat/completions', exchangeOptions).isValid).toBe(true);
    });

    it('rejects HTTP when HTTPS is strictly required', () => {
      const res = validateSafeUpstreamUrl('http://api.bybit.com/v5/market/time', exchangeOptions);
      expect(res.isValid).toBe(false);
      expect(res.reason).toMatch(/protocol/i);
    });

    it('rejects subdomain bypasses and unlisted domains', () => {
      expect(validateSafeUpstreamUrl('https://api.bybit.com.evil.com', exchangeOptions).isValid).toBe(false);
      expect(validateSafeUpstreamUrl('https://attacker.com/api', exchangeOptions).isValid).toBe(false);
      expect(validateSafeUpstreamUrl('https://169.254.169.254', exchangeOptions).isValid).toBe(false);
    });
  });
});
