import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ExchangeName } from '../types';
import {
  encryptData,
  decryptData,
  deriveVaultKey,
  encryptWithDerivedKey,
  DEFAULT_PBKDF2_ITERATIONS,
  type EncryptedPayloadEnvelope,
} from '../utils/cryptoLib';
import { ApiEnvironment, BybitRegion } from '../utils/bybitEndpoints';
import { LogManager } from '../services/LogManager';

export type Exchange = ExchangeName;
export type AccountType = 'classic' | 'uta';
export type { ApiEnvironment, BybitRegion };

/** Credentials for a single exchange API connection. */
export interface ApiCredentials {
  id: string;
  label: string;
  exchange: Exchange;
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
  isActive: boolean;
  accountType?: AccountType;
  environment?: ApiEnvironment;
  bybitRegion?: BybitRegion;
  includeFunding?: boolean;
  isSubAccount?: boolean;
}

interface ApiKeysState {
  /** Decrypted in-memory API credentials. NEVER persisted unencrypted. */
  keys: ApiCredentials[];
  
  /** Mandatory vault encryption flag (always true in Zero-Trust mode). */
  isEncrypted: boolean;
  /** Whether the user has initialized their master passphrase for the vault. */
  isInitialized: boolean;
  /** Encrypted AES-GCM payload stored at rest. */
  encryptedData: string | null;
  /** Whether the vault is currently unlocked in memory. */
  isUnlocked: boolean;

  /** Add a new API key with a generated id and isActive=true. */
  addKey: (credentials: Omit<ApiCredentials, 'id' | 'isActive'>) => Promise<void>;
  /** Toggle the isActive flag for a key by id. */
  toggleKey: (id: string) => Promise<void>;
  /** Remove a key by id from the store. */
  removeKey: (id: string) => Promise<void>;
  /** Update an existing key */
  updateKey: (id: string, updates: Partial<Omit<ApiCredentials, 'id'>>) => Promise<void>;
  /** Import multiple keys */
  importKeys: (newKeys: ApiCredentials[]) => Promise<void>;

  /** Initialize the vault for the first time with a master passphrase. */
  initializeVault: (passphrase: string) => Promise<void>;
  /** Change the master passphrase while re-encrypting current keys. */
  changePassphrase: (oldPassphrase: string, newPassphrase: string) => Promise<boolean>;
  /** Backward-compatible alias for initializeVault. */
  enableEncryption: (passphrase: string) => Promise<void>;
  /** Unlock the vault into memory using the master passphrase. */
  unlock: (passphrase: string) => Promise<boolean>;
  /** Clear keys and passphrase from memory and lock the vault. */
  lock: () => void;
  /** Re-sync encrypted data with current in-memory keys. */
  syncEncryption: (passphrase: string) => Promise<void>;
  /** Migrate unencrypted keys found in legacy storage. */
  migrateUnencryptedKeys: (passphrase: string, legacyKeys: ApiCredentials[]) => Promise<void>;
}

let currentPassphrase = '';
let currentCryptoKey: CryptoKey | null = null;
let currentSalt: Uint8Array | null = null;

export const useApiKeysStore = create<ApiKeysState>()(
  persist(
    (set, get) => ({
      keys: [],
      isEncrypted: true,
      isInitialized: false,
      encryptedData: null,
      isUnlocked: false,

      addKey: async (credentials) => {
        const accountType = credentials.accountType || (credentials.exchange === 'bitget' ? 'classic' : undefined);
        const environment = credentials.exchange === 'bybit' ? (credentials.environment || 'mainnet') : credentials.environment;
        const bybitRegion = credentials.exchange === 'bybit' ? (credentials.bybitRegion || 'global') : undefined;
        const newKey: ApiCredentials = {
          ...credentials,
          accountType,
          environment,
          bybitRegion,
          includeFunding: credentials.includeFunding !== undefined ? credentials.includeFunding : true,
          id: crypto.randomUUID(),
          isActive: true,
        };
        const updatedKeys = [...get().keys, newKey];
        set({ keys: updatedKeys });
        const state = get();
        if (currentPassphrase) {
          await state.syncEncryption(currentPassphrase);
        }
        LogManager.system('Security.Keys', `Added API connection [${credentials.label}] (${credentials.exchange}).`);
      },

      toggleKey: async (id) => {
        const updatedKeys = get().keys.map((apiKey) => 
          apiKey.id === id ? { ...apiKey, isActive: !apiKey.isActive } : apiKey
        );
        set({ keys: updatedKeys });
        const state = get();
        if (currentPassphrase) {
          await state.syncEncryption(currentPassphrase);
        }
      },

      removeKey: async (id) => {
        const target = get().keys.find(k => k.id === id);
        const updatedKeys = get().keys.filter((apiKey) => apiKey.id !== id);
        set({ keys: updatedKeys });
        const state = get();
        if (currentPassphrase) {
          await state.syncEncryption(currentPassphrase);
        }
        LogManager.system('Security.Keys', `Removed API connection ${target ? `[${target.label}]` : id}.`);
      },

      updateKey: async (id, updates) => {
        const updatedKeys = get().keys.map((apiKey) => 
          apiKey.id === id ? { ...apiKey, ...updates } : apiKey
        );
        set({ keys: updatedKeys });
        const state = get();
        if (currentPassphrase) {
          await state.syncEncryption(currentPassphrase);
        }
      },

      importKeys: async (newKeys) => {
        const normalized = newKeys.map(k => ({
          ...k,
          accountType: k.accountType || (k.exchange === 'bitget' ? 'classic' : undefined),
          environment: k.exchange === 'bybit' ? (k.environment || 'mainnet') : k.environment,
          bybitRegion: k.exchange === 'bybit' ? (k.bybitRegion || 'global') : undefined,
        }));
        const updatedKeys = [...get().keys, ...normalized];
        set({ keys: updatedKeys });
        const state = get();
        if (currentPassphrase) {
          await state.syncEncryption(currentPassphrase);
        }
      },

      syncEncryption: async (passphrase: string) => {
        const { keys } = get();
        let encrypted: string;
        if (currentCryptoKey && currentSalt) {
          encrypted = await encryptWithDerivedKey(
            JSON.stringify(keys),
            currentCryptoKey,
            currentSalt,
            DEFAULT_PBKDF2_ITERATIONS
          );
        } else {
          encrypted = await encryptData(JSON.stringify(keys), passphrase);
        }
        set({ encryptedData: encrypted, isInitialized: true });
      },

      initializeVault: async (passphrase: string) => {
        const { keys } = get();
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const derivedKey = await deriveVaultKey(passphrase, salt, DEFAULT_PBKDF2_ITERATIONS);
        const encrypted = await encryptWithDerivedKey(
          JSON.stringify(keys),
          derivedKey,
          salt,
          DEFAULT_PBKDF2_ITERATIONS
        );
        currentPassphrase = passphrase;
        currentCryptoKey = derivedKey;
        currentSalt = salt;
        set({
          isEncrypted: true,
          isInitialized: true,
          encryptedData: encrypted,
          isUnlocked: true,
        });
        LogManager.system('Security.Keys', 'Vault initialized and encrypted successfully.');
      },

      changePassphrase: async (oldPassphrase: string, newPassphrase: string) => {
        const { encryptedData, keys } = get();
        if (encryptedData) {
          try {
            await decryptData(encryptedData, oldPassphrase);
          } catch {
            return false;
          }
        }
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const derivedKey = await deriveVaultKey(newPassphrase, salt, DEFAULT_PBKDF2_ITERATIONS);
        const encrypted = await encryptWithDerivedKey(
          JSON.stringify(keys),
          derivedKey,
          salt,
          DEFAULT_PBKDF2_ITERATIONS
        );
        currentPassphrase = newPassphrase;
        currentCryptoKey = derivedKey;
        currentSalt = salt;
        set({
          encryptedData: encrypted,
          isInitialized: true,
          isUnlocked: true,
        });
        LogManager.system('Security.Keys', 'Vault master passphrase updated successfully.');
        return true;
      },

      enableEncryption: async (passphrase: string) => {
        return get().initializeVault(passphrase);
      },

      unlock: async (passphrase: string) => {
        const { encryptedData } = get();
        if (!encryptedData) return false;
        try {
          const payload: EncryptedPayloadEnvelope = JSON.parse(atob(encryptedData));
          const iterations = typeof payload.iter === 'number' && payload.iter > 0 ? payload.iter : 100000;
          const salt = new Uint8Array(atob(payload.s).split('').map(c => c.charCodeAt(0)));
          const iv = new Uint8Array(atob(payload.i).split('').map(c => c.charCodeAt(0)));
          const cipherText = new Uint8Array(atob(payload.c).split('').map(c => c.charCodeAt(0)));

          const derivedKey = await deriveVaultKey(passphrase, salt, iterations);
          const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            derivedKey,
            cipherText
          );

          const decoder = new TextDecoder();
          const rawKeys = JSON.parse(decoder.decode(decryptedBuffer));
          const keys = Array.isArray(rawKeys)
            ? rawKeys.map((k: any) => ({
                ...k,
                accountType: k.accountType || (k.exchange === 'bitget' ? 'classic' : undefined),
                environment: k.exchange === 'bybit' ? (k.environment || 'mainnet') : k.environment,
                bybitRegion: k.exchange === 'bybit' ? (k.bybitRegion || 'global') : undefined,
              }))
            : [];

          currentPassphrase = passphrase;
          currentCryptoKey = derivedKey;
          currentSalt = salt;

          set({ keys, isUnlocked: true, isInitialized: true });
          LogManager.system('Security.Keys', `Vault unlocked successfully (${keys.length} credentials loaded).`);
          return true;
        } catch (err) {
          LogManager.warn('Security.Keys', 'Vault unlock attempt failed: invalid passphrase or corrupted payload.');
          return false;
        }
      },

      lock: () => {
        currentPassphrase = '';
        currentCryptoKey = null;
        currentSalt = null;
        set({ keys: [], isUnlocked: false });
        LogManager.system('Security.Keys', 'Vault locked.');
      },

      migrateUnencryptedKeys: async (passphrase: string, legacyKeys: ApiCredentials[]) => {
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const derivedKey = await deriveVaultKey(passphrase, salt, DEFAULT_PBKDF2_ITERATIONS);
        const encrypted = await encryptWithDerivedKey(
          JSON.stringify(legacyKeys),
          derivedKey,
          salt,
          DEFAULT_PBKDF2_ITERATIONS
        );
        currentPassphrase = passphrase;
        currentCryptoKey = derivedKey;
        currentSalt = salt;
        set({
          keys: legacyKeys,
          isEncrypted: true,
          isInitialized: true,
          encryptedData: encrypted,
          isUnlocked: true,
        });
        LogManager.system('Security.Keys', `Migrated ${legacyKeys.length} legacy keys into encrypted vault.`);
      },
    }),
    {
      name: 'crypto-dashboard-api-keys-v2',
      partialize: (state) => ({
        isEncrypted: true,
        isInitialized: state.isInitialized,
        encryptedData: state.encryptedData,
        // ZERO-TRUST RULE: keys is intentionally EXCLUDED from persistence!
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isEncrypted = true;
          state.keys = [];
          if (state.encryptedData) {
            state.isInitialized = true;
            state.isUnlocked = false;
          } else {
            state.isInitialized = false;
            state.isUnlocked = false;
          }
        }
      },
    }
  )
);
