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
        let allRaw: any[] = [];
        const instTypes = ['SWAP', 'FUTURES', 'MARGIN'];
        for (const type of instTypes) {
           const raw = await RestClient.getHistoryOkx(type, key.apiKey, key.apiSecret, key.passphrase || '', start, end);
           allRaw = [...allRaw, ...raw];
        }
        console.log(`[PositionHistoryService] OKX raw records: ${allRaw.length}`);
        return this.okxMapper.mapHistory(allRaw, key.id, key.label);
      } else if (key.exchange === 'bitget') {
        const raw = await this.fetchBitgetPaginated(key, start, end);
        console.log(`[PositionHistoryService] Bitget raw records: ${raw.length}`);
        return this.bitgetMapper.mapHistory(raw, key.id, key.label);
      } else if (key.exchange === 'bybit') {
        await ExchangeAuth.syncBybitTime();
        const raw = await RestClient.getHistoryBybit(key.apiKey, key.apiSecret, start, end);
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
    let allRaw: any[] = [];
    for (const pType of productTypes) {
       // Paginação simplificada para o teste
       const raw = await RestClient.getHistoryBitget(pType, key.apiKey, key.apiSecret, key.passphrase || '', start, end, '');
       allRaw = [...allRaw, ...raw];
    }
    return allRaw;
  }
}
