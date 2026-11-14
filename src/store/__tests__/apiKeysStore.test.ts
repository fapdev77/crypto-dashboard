import { describe, it, expect, beforeEach } from 'vitest';
import { useApiKeysStore } from '../apiKeysStore';

describe('apiKeysStore (Mandatory Encrypted Vault & Memory Hygiene)', () => {
  const masterPassphrase = 'VaultPassword2026!#';

  beforeEach(() => {
    // Reset store state
    useApiKeysStore.setState({
      keys: [],
      isEncrypted: true,
      isInitialized: false,
      encryptedData: null,
      isUnlocked: false,
    });
    useApiKeysStore.getState().lock();
  });

  it('starts with isEncrypted set to true and locked', () => {
    const state = useApiKeysStore.getState();
    expect(state.isEncrypted).toBe(true);
    expect(state.keys).toEqual([]);
    expect(state.isUnlocked).toBe(false);
  });

  it('initializes vault and enables secure key management', async () => {
    await useApiKeysStore.getState().initializeVault(masterPassphrase);
    let state = useApiKeysStore.getState();
    expect(state.isInitialized).toBe(true);
    expect(state.isUnlocked).toBe(true);
    expect(state.encryptedData).toBeDefined();

    // Add a credential
    await state.addKey({
      label: 'Bybit Main',
      exchange: 'bybit',
      apiKey: 'test-api-key',
      apiSecret: 'test-api-secret',
    });

    state = useApiKeysStore.getState();
    expect(state.keys.length).toBe(1);
    expect(state.keys[0].apiKey).toBe('test-api-key');

    // Lock the vault
    state.lock();
    state = useApiKeysStore.getState();
    expect(state.isUnlocked).toBe(false);
    expect(state.keys).toEqual([]); // Memory cleared

    // Unlock with correct passphrase
    const unlockSuccess = await state.unlock(masterPassphrase);
    expect(unlockSuccess).toBe(true);
    state = useApiKeysStore.getState();
    expect(state.isUnlocked).toBe(true);
    expect(state.keys.length).toBe(1);
    expect(state.keys[0].apiKey).toBe('test-api-key');
  });

  it('rejects unlocking with wrong passphrase and keeps keys in memory empty', async () => {
    await useApiKeysStore.getState().initializeVault(masterPassphrase);
    await useApiKeysStore.getState().addKey({
      label: 'OKX Trade',
      exchange: 'okx',
      apiKey: 'okx-key',
      apiSecret: 'okx-secret',
      passphrase: 'okx-passphrase',
    });

    useApiKeysStore.getState().lock();
    expect(useApiKeysStore.getState().keys).toEqual([]);

    const failed = await useApiKeysStore.getState().unlock('WrongPassphrase!');
    expect(failed).toBe(false);
    expect(useApiKeysStore.getState().isUnlocked).toBe(false);
    expect(useApiKeysStore.getState().keys).toEqual([]);
  });

  it('allows changing the master passphrase while preserving registered keys', async () => {
    await useApiKeysStore.getState().initializeVault(masterPassphrase);
    await useApiKeysStore.getState().addKey({
      label: 'Bitget UTA',
      exchange: 'bitget',
      apiKey: 'bitget-key',
      apiSecret: 'bitget-secret',
    });

    const newPassphrase = 'NewMasterSecretPassphrase2026!';
    await useApiKeysStore.getState().changePassphrase(masterPassphrase, newPassphrase);

    useApiKeysStore.getState().lock();
    expect(useApiKeysStore.getState().isUnlocked).toBe(false);

    // Old passphrase fails
    expect(await useApiKeysStore.getState().unlock(masterPassphrase)).toBe(false);

    // New passphrase succeeds
    expect(await useApiKeysStore.getState().unlock(newPassphrase)).toBe(true);
    expect(useApiKeysStore.getState().keys.length).toBe(1);
    expect(useApiKeysStore.getState().keys[0].label).toBe('Bitget UTA');
  });
});
