import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Exchange = 'bitget' | 'okx' | 'bybit';

export interface ApiCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase?: string; // Optional because Bybit doesn't always need it depending on the key generation, but Bitget/OKX do
  isActive: boolean;
}

interface ApiKeysState {
  keys: Record<Exchange, ApiCredentials | null>;
  setKey: (exchange: Exchange, credentials: Omit<ApiCredentials, 'isActive'>) => void;
  toggleKey: (exchange: Exchange) => void;
  removeKey: (exchange: Exchange) => void;
}

export const useApiKeysStore = create<ApiKeysState>()(
  persist(
    (set) => ({
      keys: {
        bitget: null,
        okx: null,
        bybit: null,
      },
      setKey: (exchange, credentials) =>
        set((state) => ({
          keys: {
            ...state.keys,
            [exchange]: { ...credentials, isActive: true },
          },
        })),
      toggleKey: (exchange) =>
        set((state) => {
          const current = state.keys[exchange];
          if (!current) return state;
          return {
            keys: {
              ...state.keys,
              [exchange]: { ...current, isActive: !current.isActive },
            },
          };
        }),
      removeKey: (exchange) =>
        set((state) => ({
          keys: {
            ...state.keys,
            [exchange]: null,
          },
        })),
    }),
    {
      name: 'crypto-dashboard-api-keys', // unique name in localStorage
    }
  )
);
