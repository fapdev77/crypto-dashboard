import { BybitAdapter } from './BybitAdapter';
import { BitgetAdapter } from './BitgetAdapter';
import { OkxAdapter } from './OkxAdapter';
import { useDashboardStore } from '../../store/dashboardStore';

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
  public static async bootloadConnection(key: any): Promise<void> {
    const store = useDashboardStore.getState();
    const adapter = this.getAdapter(key.exchange);
    
    store.setConnectionStatus(key.id, 'connecting', null);

    try {
      // Parallel fetch balances and open positions
      const [balances, positions] = await Promise.all([
        adapter.getBalance(key),
        adapter.getOpenPositions(key)
      ]);

      // Set initial data in dashboard store
      store.updateBalances(key.id, balances as any);
      store.updatePositions(key.id, positions);
      
      // Mark connection as connected
      store.setConnectionStatus(key.id, 'connected', null);
      console.log(`[ExchangeAggregator] Bootloaded connection ${key.id} (${key.exchange}) successfully.`);
    } catch (err: any) {
      console.error(`[ExchangeAggregator] Bootload failed for connection ${key.id}:`, err);
      store.setConnectionStatus(key.id, 'error', err.message || 'REST Bootload Failed');
      throw err;
    }
  }
}
