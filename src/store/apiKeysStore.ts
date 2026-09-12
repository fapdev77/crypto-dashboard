import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ExchangeName } from '../types';
import { encryptData, decryptData } from '../utils/cryptoLib';
import { ApiEnvironment, BybitRegion } from '../utils/bybitEndpoints';

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
}

interface ApiKeysState {
  /** All registered API credentials (persisted to localStorage). */
  keys: ApiCredentials[];
  
  isEncrypted: boolean;
  encryptedData: string | null;
  isUnlocked: boolean;

  /** Add a new API key with a generated id and isActive=true. */
  addKey: (credentials: Omit<ApiCredentials, 'id' | 'isActive'>) => void;
  /** Toggle the isActive flag for a key by id. */
  toggleKey: (id: string) => void;
  /** Remove a key by id from the store. */
  removeKey: (id: string) => void;
  /** Update an existing key */
  updateKey: (id: string, updates: Partial<Omit<ApiCredentials, 'id'>>) => void;
  /** Import multiple keys */
  importKeys: (newKeys: ApiCredentials[]) => void;

  enableEncryption: (passphrase: string) => Promise<void>;
  disableEncryption: (passphrase: string) => Promise<void>;
  unlock: (passphrase: string) => Promise<boolean>;
  lock: () => void;
  syncEncryption: (passphrase: string) => Promise<void>;
}

let currentPassphrase = '';

export const useApiKeysStore = create<ApiKeysState>()(
  persist(
    (set, get) => ({
      keys: [],
      isEncrypted: false,
      encryptedData: null,
      isUnlocked: true,

      addKey: (credentials) => {
        const accountType = credentials.accountType || (credentials.exchange === 'bitget' ? 'classic' : undefined);
        const environment = credentials.exchange === 'bybit' ? (credentials.environment || 'mainnet') : credentials.environment;
        const bybitRegion = credentials.exchange === 'bybit' ? (credentials.bybitRegion || 'global') : undefined;
        set((state) => ({
          keys: [
            ...state.keys,
            {
              ...credentials,
              accountType,
              environment,
              bybitRegion,
              id: crypto.randomUUID(),
              isActive: true,
            },
          ],
        }));
        const state = get();
        if (state.isEncrypted && currentPassphrase) {
          state.syncEncryption(currentPassphrase);
        }
      },
      toggleKey: (id) => {
        set((state) => ({
          keys: state.keys.map((apiKey) => 
            apiKey.id === id ? { ...apiKey, isActive: !apiKey.isActive } : apiKey
          ),
        }));
        const state = get();
        if (state.isEncrypted && currentPassphrase) {
          state.syncEncryption(currentPassphrase);
        }
      },
      removeKey: (id) => {
        set((state) => ({
          keys: state.keys.filter((apiKey) => apiKey.id !== id),
        }));
        const state = get();
        if (state.isEncrypted && currentPassphrase) {
          state.syncEncryption(currentPassphrase);
        }
      },
      updateKey: (id, updates) => {
        set((state) => ({
          keys: state.keys.map((apiKey) => 
            apiKey.id === id ? { ...apiKey, ...updates } : apiKey
          ),
        }));
        const state = get();
        if (state.isEncrypted && currentPassphrase) {
          state.syncEncryption(currentPassphrase);
        }
      },
      importKeys: (newKeys) => {
        const normalized = newKeys.map(k => ({
          ...k,
          accountType: k.accountType || (k.exchange === 'bitget' ? 'classic' : undefined),
          environment: k.exchange === 'bybit' ? (k.environment || 'mainnet') : k.environment,
          bybitRegion: k.exchange === 'bybit' ? (k.bybitRegion || 'global') : undefined,
        }));
        set((state) => ({
          keys: [...state.keys, ...normalized],
        }));
        const state = get();
        if (state.isEncrypted && currentPassphrase) {
          state.syncEncryption(currentPassphrase);
        }
      },

      syncEncryption: async (passphrase: string) => {
        const { keys } = get();
        const encrypted = await encryptData(JSON.stringify(keys), passphrase);
        set({ encryptedData: encrypted });
      },

      enableEncryption: async (passphrase: string) => {
        const { keys } = get();
        const encrypted = await encryptData(JSON.stringify(keys), passphrase);
        currentPassphrase = passphrase;
        set({ isEncrypted: true, encryptedData: encrypted, isUnlocked: true });
      },

      disableEncryption: async (passphrase: string) => {
        const { encryptedData } = get();
        if (encryptedData) {
          await decryptData(encryptedData, passphrase);
        }
        currentPassphrase = '';
        set({ isEncrypted: false, encryptedData: null, isUnlocked: true });
      },

      unlock: async (passphrase: string) => {
        const { encryptedData } = get();
        if (!encryptedData) return false;
        try {
          const decrypted = await decryptData(encryptedData, passphrase);
          const rawKeys = JSON.parse(decrypted);
          const keys = Array.isArray(rawKeys)
            ? rawKeys.map((k: any) => ({
                ...k,
                accountType: k.accountType || (k.exchange === 'bitget' ? 'classic' : undefined),
                environment: k.exchange === 'bybit' ? (k.environment || 'mainnet') : k.environment,
                bybitRegion: k.exchange === 'bybit' ? (k.bybitRegion || 'global') : undefined,
              }))
            : [];
          currentPassphrase = passphrase;
          set({ keys, isUnlocked: true });
          return true;
        } catch (err) {
          return false;
        }
      },

      lock: () => {
        currentPassphrase = '';
        set({ keys: [], isUnlocked: false });
      }
    }),
    {
      name: 'crypto-dashboard-api-keys-v2', // v2 to avoid conflicts with previous schema
      partialize: (state) => ({
        isEncrypted: state.isEncrypted,
        encryptedData: state.isEncrypted ? state.encryptedData : null,
        keys: state.isEncrypted ? [] : state.keys,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (state.isEncrypted) {
            state.isUnlocked = false;
            state.keys = [];
          } else if (state.keys) {
            state.keys = state.keys.map((k) => ({
              ...k,
              accountType: k.accountType || (k.exchange === 'bitget' ? 'classic' : undefined),
              environment: k.exchange === 'bybit' ? (k.environment || 'mainnet') : k.environment,
              bybitRegion: k.exchange === 'bybit' ? (k.bybitRegion || 'global') : undefined,
            }));
          }
        }
      }
    }
  )
);

