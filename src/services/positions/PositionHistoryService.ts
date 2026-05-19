import { UnifiedPosition } from '../../types/positions';
import { OkxPositionMapper } from './OkxPositionMapper';
import { BitgetPositionMapper } from './BitgetPositionMapper';
import { BybitPositionMapper } from './BybitPositionMapper';
import { RestClient } from '../RestClient';
import { ExchangeAuth } from '../ExchangeAuth';

export class PositionHistoryService {
  private okxMapper = new OkxPositionMapper();
  private bitgetMapper = new BitgetPositionMapper();
  private bybitMapper = new BybitPositionMapper();

  public async fetchExchangeHistory(key: any, start?: number, end?: number): Promise<UnifiedPosition[]> {
    try {
      console.log(`[PositionHistoryService] Fetching history for ${key.exchange} (${key.label})`);
      if (key.exchange === 'okx') {
        const instTypes = ['SWAP', 'FUTURES', 'MARGIN'];
        const results = await Promise.all(instTypes.map(type => 
           RestClient.getHistoryOkx(type, key.apiKey, key.apiSecret, key.passphrase || '', start, end)
        ));
        const allRaw = results.flat();
        console.log(`[PositionHistoryService] OKX raw records: ${allRaw.length}`);
        return this.okxMapper.mapHistory(allRaw, key.id, key.label);

      } else if (key.exchange === 'bitget') {
        const raw = await this.fetchBitgetPaginated(key, start, end);
        console.log(`[PositionHistoryService] Bitget raw records: ${raw.length}`);
        return this.bitgetMapper.mapHistory(raw, key.id, key.label);

      } else if (key.exchange === 'bybit') {
        await ExchangeAuth.syncBybitTime();
        const raw = await this.fetchBybitPaginated(key, start, end);
        console.log(`[PositionHistoryService] Bybit raw records: ${raw.length}`);
        return this.bybitMapper.mapHistory(raw, key.id, key.label);
      }
    } catch (error) {
      console.error(`Error fetching history for ${key.exchange} (${key.label}):`, error);
    }
    return [];
  }

  private async fetchBitgetPaginated(key: any, start?: number, end?: number): Promise<any[]> {
    const productTypes = ['USDT-FUTURES', 'COIN-FUTURES', 'USDC-FUTURES'];
    
    const fetchAllForType = async (pType: string) => {
      let list: any[] = [];
      let nextId: string | undefined = undefined;
      let pages = 0;
      try {
        do {
          const res = await RestClient.getHistoryBitget(pType, key.apiKey, key.apiSecret, key.passphrase || '', start, end, nextId);
          if (res.list && res.list.length > 0) {
            list = [...list, ...res.list];
          }
          nextId = res.nextId;
          pages++;
        } while (nextId && pages < 10);
      } catch (err) {
        console.warn(`Failed to fetch all Bitget history for ${pType}:`, err);
      }
      return list;
    };

    const results = await Promise.all(productTypes.map(pType => fetchAllForType(pType)));
    return results.flat();
  }

  private async fetchBybitPaginated(key: any, start?: number, end?: number): Promise<any[]> {
    const categories = ['linear', 'inverse'];

    const fetchAllForCategory = async (category: string) => {
      let list: any[] = [];
      let nextCursor: string | undefined = undefined;
      let pages = 0;
      try {
        do {
          const res = await RestClient.fetchBybitCategory(category, key.apiKey, key.apiSecret, start, end, nextCursor);
          if (res.list && res.list.length > 0) {
            list = [...list, ...res.list];
          }
          nextCursor = res.nextCursor;
          pages++;
        } while (nextCursor && nextCursor !== "" && pages < 10);
      } catch (err) {
        console.warn(`Failed to fetch all Bybit history for ${category}:`, err);
      }
      return list;
    };

    const results = await Promise.all(categories.map(cat => fetchAllForCategory(cat)));
    return results.flat();
  }
}
