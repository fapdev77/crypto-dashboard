import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Exchange = 'bitget' | 'okx' | 'bybit';

export interface ApiCredentials {
  id: string;
  label: string;
  exchange: Exchange;
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
  isActive: boolean;
}

interface ApiKeysState {
  keys: ApiCredentials[];
  addKey: (credentials: Omit<ApiCredentials, 'id' | 'isActive'>) => void;
  toggleKey: (id: string) => void;
  removeKey: (id: string) => void;
}

export const useApiKeysStore = create<ApiKeysState>()(
  persist(
    (set) => ({
      keys: [],
      addKey: (credentials) =>
        set((state) => ({
          keys: [
            ...state.keys,
            { ...credentials, id: crypto.randomUUID(), isActive: true },
          ],
        })),
      toggleKey: (id) =>
        set((state) => ({
          keys: state.keys.map((apiKey) => 
            apiKey.id === id ? { ...apiKey, isActive: !apiKey.isActive } : apiKey
          ),
        })),
      removeKey: (id) =>
        set((state) => ({
          keys: state.keys.filter((apiKey) => apiKey.id !== id),
        })),
    }),
    {
      name: 'crypto-dashboard-api-keys-v2', // v2 to avoid conflicts with previous schema
    }
  )
);

