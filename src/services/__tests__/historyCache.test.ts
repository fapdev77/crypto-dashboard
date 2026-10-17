import { describe, it, expect, vi } from 'vitest';
import { DB_VERSION, DB_NAME, handleIndexedDBError } from '../historyCache';
import { useSettingsStore } from '../../store/settingsStore';

describe('historyCache DB_VERSION and configuration', () => {
  it('has DB_VERSION set to 12 matching published release schema and docs', () => {
    expect(DB_VERSION).toBe(12);
  });

  it('targets the correct cache database name', () => {
    expect(DB_NAME).toBe('crypto-dashboard-cache');
  });

  it('sets error status in settingsStore when handleIndexedDBError is invoked', () => {
    useSettingsStore.getState().clearIndexedDBError();
    expect(useSettingsStore.getState().indexedDBStatus).toBe('healthy');

    const fakeError = new Error('VersionError: The requested version is less than existing version');
    fakeError.name = 'VersionError';

    handleIndexedDBError(fakeError, 'TestContext');

    expect(useSettingsStore.getState().indexedDBStatus).toBe('error');
    expect(useSettingsStore.getState().indexedDBError).toContain('schema conflict');
  });

  it('specifically classifies QuotaExceededError in handleIndexedDBError', () => {
    useSettingsStore.getState().clearIndexedDBError();
    const quotaErr = new Error('The quota has been exceeded');
    quotaErr.name = 'QuotaExceededError';

    handleIndexedDBError(quotaErr, 'saveBybitTxLogCache');

    expect(useSettingsStore.getState().indexedDBStatus).toBe('error');
    expect(useSettingsStore.getState().indexedDBError).toContain('Browser storage quota is full');
  });

  it('specifically classifies SecurityError (Private Browsing) in handleIndexedDBError', () => {
    useSettingsStore.getState().clearIndexedDBError();
    const securityErr = new Error('The operation is insecure or blocked in private window');
    securityErr.name = 'SecurityError';

    handleIndexedDBError(securityErr, 'saveCachedHistory');

    expect(useSettingsStore.getState().indexedDBStatus).toBe('error');
    expect(useSettingsStore.getState().indexedDBError).toContain('Private browsing or strict security rules');
  });
});


