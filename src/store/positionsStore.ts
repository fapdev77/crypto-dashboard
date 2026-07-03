import { create } from 'zustand';
import { UnifiedPosition } from '../types';

interface PositionsState {
  /** Map of position id → UnifiedPosition for all open positions. */
  positions: Record<string, UnifiedPosition>;
  /**
   * Full replacement of open positions for a connection.
   * Stale positions (not in newPositions) are removed;
   * positions with zero/negative size are skipped.
   */
  updatePositions: (connectionId: string, newPositions: UnifiedPosition[]) => void;
  /**
   * Partial merge of position changes for a connection.
   * Existing entries are shallow-merged; new entries are created.
   * Positions with size ≤ 0 are removed.
   */
  updatePositionsDelta: (connectionId: string, deltaPositions: Partial<UnifiedPosition>[]) => void;
  /** Remove all positions belonging to a specific connection. */
  clearConnectionData: (connectionId: string) => void;
}

export const usePositionsStore = create<PositionsState>((set) => ({
  positions: {},

  updatePositions: (connectionId, newPositions) => set((state) => {
    const nextPositions = { ...state.positions };
    const newIds = new Set(newPositions.map(p => p.id));

    for (const key in nextPositions) {
      if (nextPositions[key].connectionId === connectionId && !newIds.has(key)) {
        delete nextPositions[key];
      }
    }

    newPositions.forEach(pos => {
      if (Math.abs(pos.size) > 0) {
        nextPositions[pos.id] = pos;
      }
    });

    return { positions: nextPositions };
  }),

  updatePositionsDelta: (connectionId, deltaPositions) => set((state) => {
    const nextPositions = { ...state.positions };
    deltaPositions.forEach(pos => {
      if (!pos.id) return;
      if (nextPositions[pos.id]) {
        nextPositions[pos.id] = { ...nextPositions[pos.id], ...pos };
      } else {
        nextPositions[pos.id] = pos as UnifiedPosition;
      }
    });
    for (const key in nextPositions) {
      if (Math.abs(nextPositions[key].size) <= 0) {
        delete nextPositions[key];
      }
    }
    return { positions: nextPositions };
  }),

  clearConnectionData: (connectionId) => set((state) => {
    const nextPositions = { ...state.positions };
    for (const key in nextPositions) {
      if (nextPositions[key].connectionId === connectionId) {
        delete nextPositions[key];
      }
    }
    return { positions: nextPositions };
  })
}));
