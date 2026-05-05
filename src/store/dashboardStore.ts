import { create } from 'zustand';

export interface BalanceItem {
  id: string; // e.g., 'connId-USDT'
  connectionId: string;
  exchange: string;
  label: string;
  ccy: string;
  amount: number;
  usdValue: number;
}

export interface PositionItem {
  id: string; // e.g., 'connId-okx-BTC-USDT-long'
  connectionId: string;
  exchange: string;
  label: string;
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
  // Connection statuses tracking (keyed by connectionId)
  statuses: Record<string, ConnectionStatus>;
  setConnectionStatus: (connectionId: string, status: ConnectionStatus) => void;

  // Wallet balances
  balances: Record<string, BalanceItem>;
  updateBalances: (connectionId: string, newBalances: BalanceItem[]) => void;
  
  // Positions
  positions: Record<string, PositionItem>;
  updatePositions: (connectionId: string, newPositions: PositionItem[]) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  statuses: {},
  setConnectionStatus: (connectionId, status) => set((state) => ({
    statuses: { ...state.statuses, [connectionId]: status }
  })),

  balances: {},
  updateBalances: (connectionId, newBalances) => set((state) => {
    const nextBalances = { ...state.balances };
    newBalances.forEach(b => {
      nextBalances[b.id] = b;
    });
    // Remove zero balances
    for (const key in nextBalances) {
      if (nextBalances[key].amount <= 0) {
        delete nextBalances[key];
      }
    }
    return { balances: nextBalances };
  }),

  positions: {},
  updatePositions: (connectionId, newPositions) => set((state) => {
    const nextPositions = { ...state.positions };
    newPositions.forEach(p => {
      nextPositions[p.id] = p;
    });
    // Remove zero size positions
    for (const key in nextPositions) {
      if (Math.abs(nextPositions[key].size) <= 0) {
        delete nextPositions[key];
      }
    }
    return { positions: nextPositions };
  })
}));

