/**
 * @deprecated This store is being split into focused sub-stores.
 * Import directly from:
 *   - connectionStore.ts  → useConnectionStore, ConnectionStatus, ConnectionTelemetry
 *   - balancesStore.ts    → useBalancesStore, BalanceItem
 *   - positionsStore.ts   → usePositionsStore
 *
 * This file re-exports everything for backward compatibility.
 */

import { useConnectionStore, type ConnectionStatus, type ConnectionTelemetry } from './connectionStore';
import { useBalancesStore, type BalanceItem } from './balancesStore';
import { usePositionsStore } from './positionsStore';

// Re-export types
export type { ConnectionStatus, ConnectionTelemetry, BalanceItem };

/**
 * Cross-domain action: clears all data (statuses, balances, positions)
 * for a single connection across all 3 sub-stores.
 */
export function clearConnectionData(connectionId: string) {
  useConnectionStore.getState().clearConnectionData(connectionId);
  useBalancesStore.getState().clearConnectionData(connectionId);
  usePositionsStore.getState().clearConnectionData(connectionId);
}

/**
 * Combined hook for backward compatibility.
 * @deprecated Use the specific sub-store hooks instead.
 */
export function useDashboardStore<T = unknown>(selector?: (state: any) => T): T {
  const connState = useConnectionStore();
  const balState = useBalancesStore();
  const posState = usePositionsStore();

  const combined = {
    // Connection
    ...connState,
    // Balances
    ...balState,
    // Positions
    ...posState,
    // Cross-domain clear (overrides individual clearConnectionData with the combined version)
    clearConnectionData,
  };

  if (selector) {
    return selector(combined);
  }
  return combined as unknown as T;
}
