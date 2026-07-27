import { UnifiedBillRecord } from '../../types';
import { ApiCredentials } from '../../store/apiKeysStore';
import { LogManager } from '../LogManager';
import { ExchangeAggregator } from '../adapters/ExchangeAggregator';

export class BillsHistoryService {
  /**
   * Fetches bills and cache them if needed, acting as the main entry point
   * for the useBillsHistory hook.
   */
  public async fetchBills(key: ApiCredentials, start?: number, end?: number): Promise<UnifiedBillRecord[]> {
    try {
      const adapter = ExchangeAggregator.getAdapter(key.exchange);
      if (!adapter.fetchBills) {
        LogManager.warn('BillsHistoryService', `Adapter for ${key.exchange} does not implement fetchBills.`);
        return [];
      }
      // Depending on requirements, we can add cache logic here similar to PositionHistoryService
      // For now, we do a direct fetch since these are paginated
      return await adapter.fetchBills(key, start, end);
    } catch (err) {
      LogManager.error('BillsHistoryService', `Failed to fetch bills for ${key.id}:`, err);
      return [];
    }
  }
}
