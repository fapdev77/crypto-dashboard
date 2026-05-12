import { UnifiedPosition } from '../../types/positions';
import { OkxPositionMapper } from './OkxPositionMapper';
import { BitgetPositionMapper } from './BitgetPositionMapper';
import { BybitPositionMapper } from './BybitPositionMapper';
import { RestClient } from '../RestClient';
import { Exchange } from '../../store/apiKeysStore';

export class PositionHistoryService {
  private okxMapper = new OkxPositionMapper();
  private bitgetMapper = new BitgetPositionMapper();
  private bybitMapper = new BybitPositionMapper();

  public async fetchExchangeHistory(key: any, start?: number, end?: number): Promise<UnifiedPosition[]> {
    try {
      if (key.exchange === 'okx') {
        const raw = await RestClient.getHistoryOkx(key.apiKey, key.apiSecret, key.passphrase || '', start, end);
        return this.okxMapper.mapHistory(raw, key.id, key.label);
      } else if (key.exchange === 'bitget') {
        const raw = await this.fetchBitgetPaginated(key, start, end);
        return this.bitgetMapper.mapHistory(raw, key.id, key.label);
      } else if (key.exchange === 'bybit') {
        const raw = await RestClient.getHistoryBybit(key.apiKey, key.apiSecret, start, end);
        return this.bybitMapper.mapHistory(raw, key.id, key.label);
      }
    } catch (error) {
      console.error(`Error fetching history for ${key.exchange} (${key.label}):`, error);
    }
    return [];
  }

  private async fetchBitgetPaginated(key: any, start?: number, end?: number): Promise<any[]> {
    // Paginação: Utilizar obrigatoriamente idLessThan (cursor-based)
    // Here we wrap RestClient assuming RestClient supports idLessThan
    // For now we use the basic getHistoryBitget but we should upgrade it if we implement true pagination here
    return await RestClient.getHistoryBitget(key.apiKey, key.apiSecret, key.passphrase || '', start, end, '');
  }
}
