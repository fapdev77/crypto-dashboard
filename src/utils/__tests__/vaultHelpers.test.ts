import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isVaultConfigured, detectLegacyUnencryptedKeys, clearLegacyUnencryptedStorage } from '../vaultHelpers';

describe('vaultHelpers', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('isVaultConfigured', () => {
    it('returns false when neither isInitialized nor encryptedData is set', () => {
      expect(isVaultConfigured({ isInitialized: false, encryptedData: null })).toBe(false);
    });

    it('returns false when isInitialized is true but encryptedData is null', () => {
      expect(isVaultConfigured({ isInitialized: true, encryptedData: null })).toBe(false);
    });

    it('returns false when encryptedData is present but isInitialized is false', () => {
      expect(isVaultConfigured({ isInitialized: false, encryptedData: 'some-encrypted-envelope' })).toBe(false);
    });

    it('returns true when both isInitialized is true and encryptedData is present', () => {
      expect(isVaultConfigured({ isInitialized: true, encryptedData: 'some-encrypted-envelope' })).toBe(true);
    });
  });

  describe('detectLegacyUnencryptedKeys', () => {
    it('returns empty array when localStorage is empty', () => {
      expect(detectLegacyUnencryptedKeys()).toEqual([]);
    });

    it('detects legacy unencrypted keys from v1 storage key', () => {
      const mockLegacyKeys = [
        { id: 'key-1', exchange: 'bybit', label: 'Bybit Account', apiKey: 'bybit-api-key', apiSecret: 'secret' },
        { id: 'key-2', exchange: 'bitget', label: 'Bitget Account', apiKey: 'bitget-api-key', apiSecret: 'secret' }
      ];
      localStorage.setItem('crypto-dashboard-api-keys', JSON.stringify({ state: { keys: mockLegacyKeys } }));

      const detected = detectLegacyUnencryptedKeys();
      expect(detected).toHaveLength(2);
      expect(detected[0].label).toBe('Bybit Account');
      expect(detected[1].label).toBe('Bitget Account');
    });

    it('detects legacy unencrypted keys if stored directly as array in v1 key', () => {
      const mockLegacyKeys = [
        { id: 'key-1', exchange: 'okx', label: 'OKX Key', apiKey: 'okx-api-key', apiSecret: 'secret' }
      ];
      localStorage.setItem('crypto-dashboard-api-keys', JSON.stringify(mockLegacyKeys));

      const detected = detectLegacyUnencryptedKeys();
      expect(detected).toHaveLength(1);
      expect(detected[0].exchange).toBe('okx');
    });

    it('detects unencrypted keys in v2 storage if encryptedData is missing', () => {
      const mockKeys = [
        { id: 'key-v2', exchange: 'bybit', label: 'Unencrypted V2 Key', apiKey: 'bybit-k', apiSecret: 's' }
      ];
      localStorage.setItem('crypto-dashboard-api-keys-v2', JSON.stringify({
        state: {
          keys: mockKeys,
          encryptedData: null,
          isInitialized: false,
        }
      }));

      const detected = detectLegacyUnencryptedKeys();
      expect(detected).toHaveLength(1);
      expect(detected[0].label).toBe('Unencrypted V2 Key');
    });

    it('handles corrupted JSON without throwing errors', () => {
      localStorage.setItem('crypto-dashboard-api-keys', '{invalid json');
      expect(detectLegacyUnencryptedKeys()).toEqual([]);
    });
  });

  describe('clearLegacyUnencryptedStorage', () => {
    it('removes v1 storage key cleanly', () => {
      localStorage.setItem('crypto-dashboard-api-keys', 'dummy');
      clearLegacyUnencryptedStorage();
      expect(localStorage.getItem('crypto-dashboard-api-keys')).toBeNull();
    });
  });
});
