import { ApiCredentials } from '../../store/apiKeysStore';
import { BybitWsAdapter } from '../adapters/bybit/WsAdapter';
import { OkxWsAdapter } from '../adapters/okx/WsAdapter';
import { BitgetWsAdapter } from '../adapters/bitget/WsAdapter';

export class WsParsers {
  static parseStream(config: ApiCredentials, data: any) {
    const { id: cid, exchange, label } = config;
    
    if (data.action === 'snapshot' || data.action === 'update' || data.data) {
      console.log(`[WS-${cid}] Stream Data (${exchange}):`, data.action || data.topic || data.arg?.channel, data);
    }
    
    if (exchange === 'okx') {
      OkxWsAdapter.parse(cid, exchange, label, data);
    } else if (exchange === 'bybit') {
      BybitWsAdapter.parse(cid, exchange, label, data);
    } else if (exchange === 'bitget') {
      BitgetWsAdapter.parse(cid, exchange, label, data);
    }
  }
}

