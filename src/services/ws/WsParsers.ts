import { ApiCredentials } from '../../store/apiKeysStore';
import { BybitAdapter } from '../adapters/BybitAdapter';
import { OkxAdapter } from '../adapters/OkxAdapter';
import { BitgetAdapter } from '../adapters/BitgetAdapter';

export class WsParsers {
  static parseStream(config: ApiCredentials, data: any) {
    const { id: cid, exchange, label } = config;
    
    if (data.action === 'snapshot' || data.action === 'update' || data.data) {
      console.log(`[WS-${cid}] Stream Data (${exchange}):`, data.action || data.topic || data.arg?.channel, data);
    }
    
    if (exchange === 'okx') {
      OkxAdapter.parse(cid, exchange, label, data);
    } else if (exchange === 'bybit') {
      BybitAdapter.parse(cid, exchange, label, data);
    } else if (exchange === 'bitget') {
      BitgetAdapter.parse(cid, exchange, label, data);
    }
  }
}

