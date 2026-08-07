import { ApiCredentials } from '../../store/apiKeysStore';

import { BybitAdapter } from './BybitAdapter';
import { BitgetAdapter } from './BitgetAdapter';
import { OkxAdapter } from './OkxAdapter';
import { LogManager } from '../LogManager';
import { useConnectionStore } from '../../store/connectionStore';
import { useBalancesStore } from '../../store/balancesStore';
import { usePositionsStore } from '../../store/positionsStore';

export class ExchangeAggregator {
  public static getAdapter(exchange: string) {
    switch (exchange) {
      case 'bybit': return new BybitAdapter();
      case 'bitget': return new BitgetAdapter();
      case 'okx': return new OkxAdapter();
      default: throw new Error(`Unknown exchange: ${exchange}`);
    }
  }

  /**
   * Fetches initial balances and positions in parallel via REST APIs
   * and populates the dashboard store to ensure immediate UI readiness.
   */
  public static async bootloadConnection(key: ApiCredentials): Promise<void> {
    const adapter = this.getAdapter(key.exchange);
    
    useConnectionStore.getState().setConnectionStatus(key.id, 'connecting', null);

    try {
      // Parallel fetch balances and open positions
      const [balances, positions] = await Promise.all([
        adapter.getBalance(key),
        adapter.getOpenPositions(key)
      ]);

      // Set initial data in sub-stores
      useBalancesStore.getState().updateBalances(key.id, balances as any);
      usePositionsStore.getState().updatePositions(key.id, positions);
      
      // Mark connection as connected
      useConnectionStore.getState().setConnectionStatus(key.id, 'connected', null);
      LogManager.info('ExchangeAggregator', `Bootloaded connection ${key.id} (${key.exchange}) successfully.`);
    } catch (err: any) {
      LogManager.error('ExchangeAggregator', `Bootload failed for connection ${key.id}:`, err);
      useConnectionStore.getState().setConnectionStatus(key.id, 'error', err.message || 'REST Bootload Failed');
      throw err;
    }
  }
}
