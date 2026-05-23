import { UnifiedBillRecord } from '../../types';
import { IExchangeAdapter } from '../adapters/IExchangeAdapter';
import { OkxHistoryAdapter } from '../adapters/okx/HistoryAdapter';
import { BitgetHistoryAdapter } from '../adapters/bitget/HistoryAdapter';
import { BybitHistoryAdapter } from '../adapters/bybit/HistoryAdapter';

export class BillsHistoryService {
  /**
   * Factory method to get the correct adapter for an exchange
   */
  private getAdapter(exchange: string): IExchangeAdapter {
    switch (exchange) {
      case 'okx':
        return new OkxHistoryAdapter();
      case 'bitget':
        return new BitgetHistoryAdapter();
      case 'bybit':
        return new BybitHistoryAdapter();
      default:
        throw new Error(`Unsupported exchange adapter for Bills: ${exchange}`);
    }
  }

  /**
   * Fetches bills and cache them if needed, acting as the main entry point
   * for the useBillsHistory hook.
   */
  public async fetchBills(key: any, start?: number, end?: number): Promise<UnifiedBillRecord[]> {
    try {
      const adapter = this.getAdapter(key.exchange);
      if (!adapter.fetchBills) {
        console.warn(`Adapter for ${key.exchange} does not implement fetchBills.`);
        return [];
      }
      // Depending on requirements, we can add cache logic here similar to PositionHistoryService
      // For now, we do a direct fetch since these are paginated
      return await adapter.fetchBills(key, start, end);
    } catch (err) {
      console.error(`[BillsHistoryService] Failed to fetch bills for ${key.id}:`, err);
      return [];
    }
  }
}
