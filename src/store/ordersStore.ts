import { create } from 'zustand';
import { UnifiedOrder } from '../types';

interface OrdersState {
  openOrders: Record<string, UnifiedOrder>;
  updateOpenOrders: (connectionId: string, newOrders: UnifiedOrder[]) => void;
  clearConnectionOrders: (connectionId: string) => void;
}

export const useOrdersStore = create<OrdersState>()((set) => ({
  openOrders: {},

  updateOpenOrders: (connectionId, newOrders) => set((state) => {
    const nextOrders = { ...state.openOrders };
    
    const newIds = new Set(newOrders.map(o => o.id));
    
    // Remover apenas as ordens desta conexão que não vieram mais (foram fechadas ou canceladas)
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
