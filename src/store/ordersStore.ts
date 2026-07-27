import { create } from 'zustand';
import { UnifiedOrder } from '../types';

interface OrdersState {
  /** Map of order id → UnifiedOrder for all currently open orders. */
  openOrders: Record<string, UnifiedOrder>;
  /**
   * Full replacement of open orders for a connection.
   * Removes stale orders (no longer in newOrders), adds/updates the rest.
   */
  updateOpenOrders: (connectionId: string, newOrders: UnifiedOrder[]) => void;
  /** Remove all open orders belonging to a specific connection. */
  clearConnectionOrders: (connectionId: string) => void;
}

export const useOrdersStore = create<OrdersState>()((set) => ({
  openOrders: {},

  updateOpenOrders: (connectionId, newOrders) => set((state) => {
    const nextOrders = { ...state.openOrders };
    
    const newIds = new Set(newOrders.map(o => o.id));
    
    // Remove only orders from this connection that are no longer present (were closed or cancelled)
    for (const key in nextOrders) {
      if (nextOrders[key].connectionId === connectionId && !newIds.has(key)) {
        delete nextOrders[key];
      }
    }
    
    // Adicionar/Atualizar
    newOrders.forEach(o => {
      nextOrders[o.id] = o;
    });

    return { openOrders: nextOrders };
  }),

  clearConnectionOrders: (connectionId) => set((state) => {
    const nextOrders = { ...state.openOrders };
    for (const key in nextOrders) {
      if (nextOrders[key].connectionId === connectionId) {
        delete nextOrders[key];
      }
    }
    return { openOrders: nextOrders };
  })
}));
