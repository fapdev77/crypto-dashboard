/**
 * Cross-store cleanup utility.
 *
 * Clears all data (connection status, balances, positions) for a single
 * connection across all 3 sub-stores. This replaces the deprecated
 * clearConnectionData function that was exported from dashboardStore.ts.
 */
import { useConnectionStore } from './connectionStore';
import { useBalancesStore } from './balancesStore';
import { usePositionsStore } from './positionsStore';

export function clearConnectionData(connectionId: string): void {
  useConnectionStore.getState().clearConnectionData(connectionId);
  useBalancesStore.getState().clearConnectionData(connectionId);
  usePositionsStore.getState().clearConnectionData(connectionId);
}
