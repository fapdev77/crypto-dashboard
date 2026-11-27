import { ApiCredentials, ApiKeysState } from '../store/apiKeysStore';
import { LogManager } from '../services/LogManager';

/**
 * Checks whether the Zero-Trust Security Vault has been configured with a master passphrase
 * and encrypted storage envelope.
 */
export function isVaultConfigured(state: Pick<ApiKeysState, 'isInitialized' | 'encryptedData'>): boolean {
  return Boolean(state.isInitialized && state.encryptedData);
}

/**
 * Detects whether there are unencrypted API keys residing in browser localStorage
 * from earlier versions of the application (e.g. v1 'crypto-dashboard-api-keys' or unencrypted v2).
 */
export function detectLegacyUnencryptedKeys(): ApiCredentials[] {
  try {
    // 1. Check legacy v1 store
    const v1Raw = localStorage.getItem('crypto-dashboard-api-keys');
    if (v1Raw) {
      const parsed = JSON.parse(v1Raw);
      const keys = parsed?.state?.keys || (Array.isArray(parsed) ? parsed : null);
      if (Array.isArray(keys) && keys.length > 0) {
        LogManager.warn('VaultHelpers', `Detected ${keys.length} legacy unencrypted keys in v1 storage.`);
        return keys;
      }
    }

    // 2. Check v2 store if unencrypted keys were saved without encryptedData envelope
    const v2Raw = localStorage.getItem('crypto-dashboard-api-keys-v2');
    if (v2Raw) {
      const parsed = JSON.parse(v2Raw);
      if (
        parsed?.state?.keys &&
        Array.isArray(parsed.state.keys) &&
        parsed.state.keys.length > 0 &&
        !parsed.state.encryptedData
      ) {
        LogManager.warn('VaultHelpers', `Detected ${parsed.state.keys.length} unencrypted keys in v2 storage without encrypted envelope.`);
        return parsed.state.keys;
      }
    }
  } catch (err) {
    LogManager.warn('VaultHelpers', 'Failed to inspect legacy localStorage for unencrypted keys:', err);
  }

  return [];
}

/**
 * Purges obsolete unencrypted keys from legacy localStorage keys.
 */
export function clearLegacyUnencryptedStorage(): void {
  try {
    localStorage.removeItem('crypto-dashboard-api-keys');
    LogManager.system('VaultHelpers', 'Cleaned up legacy unencrypted v1 storage.');
  } catch (err) {
    LogManager.warn('VaultHelpers', 'Failed to remove legacy unencrypted storage key:', err);
  }
}
