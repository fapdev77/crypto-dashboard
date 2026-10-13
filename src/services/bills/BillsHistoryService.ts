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
    LogManager.info(
      'History.Bills',
      `[${key.label}] Fetching deposits and withdrawals (${key.exchange})...`
    );

    try {
      const adapter = ExchangeAggregator.getAdapter(key);
      if (!adapter.fetchBills) {
        LogManager.warn('History.Bills', `[${key.label}] Adapter for ${key.exchange} does not implement fetchBills.`);
        return [];
      }
      const records = await adapter.fetchBills(key, start, end);
      LogManager.info(
        'History.Bills',
        `[${key.label}] Successfully fetched ${records.length} bill records`
      );
      return records;
    } catch (err) {
      LogManager.error('History.Bills', `[${key.label}] Failed to fetch bills:`, err);
      return [];
    }
  }
}
