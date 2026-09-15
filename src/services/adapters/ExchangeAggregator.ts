import { ApiCredentials, AccountType } from '../../store/apiKeysStore';
import { IExchangeAdapter } from './IExchangeAdapter';
import { BybitAdapter } from './BybitAdapter';
import { BitgetClassicAdapter } from './BitgetClassicAdapter';
import { BitgetUTAAdapter } from './BitgetUTAAdapter';
import { OkxAdapter } from './OkxAdapter';
import { LogManager } from '../LogManager';
import { useConnectionStore } from '../../store/connectionStore';
import { useBalancesStore } from '../../store/balancesStore';
import { usePositionsStore } from '../../store/positionsStore';

export class ExchangeAggregator {
  public static getAdapter(exchangeOrKey: string | ApiCredentials, accountType?: AccountType): IExchangeAdapter {
    if (typeof exchangeOrKey === 'object' && exchangeOrKey !== null) {
      const key = exchangeOrKey;
      if (key.exchange === 'bitget') {
        return key.accountType === 'uta' ? new BitgetUTAAdapter() : new BitgetClassicAdapter();
      }
      return this.getAdapter(key.exchange);
    }

    const exchange = exchangeOrKey;
    switch (exchange) {
      case 'bybit': return new BybitAdapter();
      case 'bitget': return accountType === 'uta' ? new BitgetUTAAdapter() : new BitgetClassicAdapter();
      case 'okx': return new OkxAdapter();
      default: throw new Error(`Unknown exchange: ${exchange}`);
    }
  }

  /**
   * Fetches initial balances and positions in parallel via REST APIs
   * and populates the dashboard store to ensure immediate UI readiness.
   */
  public static async bootloadConnection(key: ApiCredentials): Promise<void> {
    const adapter = this.getAdapter(key);
    
    useConnectionStore.getState().setConnectionStatus(key.id, 'connecting', null);

    try {
      // Parallel fetch balances and open positions
      const balancePromise = adapter.getBalance ? adapter.getBalance(key) : Promise.resolve([]);
      const positionsPromise = adapter.getOpenPositions ? adapter.getOpenPositions(key) : Promise.resolve([]);
      const [balances, positions] = await Promise.all([
        balancePromise,
        positionsPromise
      ]);

      // Set initial data in sub-stores
      useBalancesStore.getState().updateBalances(key.id, balances as any);
      usePositionsStore.getState().updatePositions(key.id, positions);
      
      // Mark connection as connected
      useConnectionStore.getState().setConnectionStatus(key.id, 'connected', null);
      LogManager.info('ExchangeAggregator', `Bootloaded connection ${key.id} (${key.exchange}${key.exchange === 'bitget' ? ` - ${key.accountType || 'classic'}` : ''}) successfully.`);
    } catch (err: any) {
      LogManager.error('ExchangeAggregator', `Bootload failed for connection ${key.id}:`, err);
      useConnectionStore.getState().setConnectionStatus(key.id, 'error', err.message || 'REST Bootload Failed');
      throw err;
    }
  }
}
