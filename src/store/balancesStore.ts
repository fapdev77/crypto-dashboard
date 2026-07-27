import { create } from 'zustand';

/** A single wallet balance entry keyed by `${connectionId}-${ccy}`. */
export interface BalanceItem {
  /** Unique key: `${connectionId}-${ccy}`. */
  id: string;
  /** Owning connection id. */
  connectionId: string;
  /** Exchange name (bybit, bitget, okx). */
  exchange: string;
  /** Human-readable account label. */
  label: string;
  /** Currency code (e.g. USDT, BTC, ETH). */
  ccy: string;
  /** Available + locked amount. */
  amount: number;
  /** Estimated USD value. */
  usdValue: number;
}

interface BalancesState {
  /** Map of balance id → BalanceItem for all connected accounts. */
  balances: Record<string, BalanceItem>;
  /**
   * Full replacement of balances for a connection.
   * Stale entries (not in newBalances) are removed;
   * entries with zero amount are skipped.
   */
  updateBalances: (connectionId: string, newBalances: BalanceItem[]) => void;
  /**
   * Partial merge of balance changes for a connection.
   * Existing entries are shallow-merged; new entries are created.
   * Entries with amount ≤ 0 are removed.
   */
  updateBalancesDelta: (connectionId: string, deltaBalances: Partial<BalanceItem>[]) => void;
  /** Remove all balances belonging to a specific connection. */
  clearConnectionData: (connectionId: string) => void;
}

export const useBalancesStore = create<BalancesState>((set) => ({
  balances: {},

  updateBalances: (connectionId, newBalances) => set((state) => {
    const nextBalances = { ...state.balances };
    const newIds = new Set(newBalances.map(b => b.id));

    for (const key in nextBalances) {
      if (nextBalances[key].connectionId === connectionId && !newIds.has(key)) {
        delete nextBalances[key];
      }
    }

    newBalances.forEach(b => {
      if (b.amount > 0) {
        nextBalances[b.id] = b;
      }
    });

    return { balances: nextBalances };
  }),

  updateBalancesDelta: (connectionId, deltaBalances) => set((state) => {
    const nextBalances = { ...state.balances };
    deltaBalances.forEach(b => {
      if (!b.id) return;
      if (nextBalances[b.id]) {
        nextBalances[b.id] = { ...nextBalances[b.id], ...b };
      } else {
        nextBalances[b.id] = b as BalanceItem;
      }
    });
    for (const key in nextBalances) {
      if (nextBalances[key].amount <= 0) {
        delete nextBalances[key];
      }
    }
    return { balances: nextBalances };
  }),

  clearConnectionData: (connectionId) => set((state) => {
    const nextBalances = { ...state.balances };
    for (const key in nextBalances) {
      if (nextBalances[key].connectionId === connectionId) {
        delete nextBalances[key];
      }
    }
    return { balances: nextBalances };
  })
}));
