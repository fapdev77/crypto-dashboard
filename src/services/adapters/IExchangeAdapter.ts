import { UnifiedHistoryPosition, UnifiedAssetCategory } from '../../types';
import { ApiCredentials } from '../../store/apiKeysStore';

export interface IExchangeAdapter {
  /**
   * Encapsulates the entire process of authenticating, fetching raw data (including pagination),
   * and normalizing it into the unified format.
   * 
   * @param key API Key metadata object
   * @param start Optional start timestamp
   * @param end Optional end timestamp
   */
  fetchAndNormalize(key: ApiCredentials, start?: number, end?: number): Promise<UnifiedHistoryPosition[]>;

  /**
   * Fetches the history of deposits and withdrawals (bills)
   * and normalizes them into the UnifiedBillRecord format.
   * 
   * @param key API Key metadata object
   * @param start Optional start timestamp
   * @param end Optional end timestamp
   */
  fetchBills?(key: ApiCredentials, start?: number, end?: number): Promise<import('../../types').UnifiedBillRecord[]>;

  /**
   * Fetches open (pending) orders and normalizes them into UnifiedOrder.
   */
  getOpenOrders?(key: ApiCredentials): Promise<import('../../types').UnifiedOrder[]>;

  /**
   * Fetches history (closed) orders and normalizes them into UnifiedOrder.
   * @param start Optional start timestamp
   * @param end Optional end timestamp
   */
  getHistoryOrders?(key: ApiCredentials, start?: number, end?: number): Promise<import('../../types').UnifiedOrder[]>;

  /**
   * Fetches public metadata for a specific instrument to determine its category.
   * Does NOT require authentication.
   */
  fetchInstrumentMetadata?(symbol: string): Promise<UnifiedAssetCategory | 'NOT_FOUND'>;
}
