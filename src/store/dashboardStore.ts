import { create } from 'zustand';

export interface BalanceItem {
  id: string; // e.g., 'bitget-USDT'
  exchange: string;
  ccy: string;
  amount: number;
  usdValue: number;
}

export interface PositionItem {
  id: string; // e.g., 'okx-BTC-USDT-long'
  exchange: string;
  symbol: string;
  side: 'long' | 'short' | 'net';
  size: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  leverage: number;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface DashboardState {
  // Connection statuses tracking
  statuses: Record<string, ConnectionStatus>;
  setConnectionStatus: (exchange: string, status: ConnectionStatus) => void;

  // Wallet balances
  balances: Record<string, BalanceItem>;
  updateBalances: (exchange: string, newBalances: BalanceItem[]) => void;
  
  // Positions
  positions: Record<string, PositionItem>;
  updatePositions: (exchange: string, newPositions: PositionItem[]) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  statuses: {
    bitget: 'disconnected',
    okx: 'disconnected',
    bybit: 'disconnected',
  },
  setConnectionStatus: (exchange, status) => set((state) => ({
    statuses: { ...state.statuses, [exchange]: status }
  })),

  balances: {},
  updateBalances: (exchange, newBalances) => set((state) => {
    // Remove old balances from this exchange
    const filtered = Object.fromEntries(
      Object.entries(state.balances).filter(([_, b]) => b.exchange !== exchange)
    );
    // Add new ones
    newBalances.forEach(b => filtered[b.id] = b);
    return { balances: filtered };
  }),

  positions: {},
  updatePositions: (exchange, newPositions) => set((state) => {
    // Remove old positions from this exchange
    const filtered = Object.fromEntries(
      Object.entries(state.positions).filter(([_, p]) => p.exchange !== exchange)
    );
    // Add new ones
    newPositions.forEach(p => filtered[p.id] = p);
    return { positions: filtered };
  })
}));
