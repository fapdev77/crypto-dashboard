import { ExchangeAuth } from './ExchangeAuth';
import { useApiKeysStore, Exchange } from '../store/apiKeysStore';

interface ProxyRequest {
  targetUrl: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
}

const proxyFetch = async (req: ProxyRequest) => {
  const response = await fetch('/api/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!response.ok) {
    throw new Error(`Proxy Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
};

export class RestClient {
  static async getHistoryOkx(apiKey: string, apiSecret: string, passphrase: string) {
    const method = 'GET';
    const requestPath = '/api/v5/account/positions-history';
    const targetUrl = `https://www.okx.com${requestPath}`;
    
    const headers = ExchangeAuth.getOkxHeaders(apiKey, apiSecret, passphrase, method, requestPath);
    
    const response = await proxyFetch({
      targetUrl,
      method,
      headers
    });
    
    return response.data || [];
  }

  static async getHistoryBitget(apiKey: string, apiSecret: string, passphrase: string) {
    // Bitget V2 endpoints: https://api.bitget.com/api/v2/mix/position/history-position
    const method = 'GET';
    const requestPath = '/api/v2/mix/position/history-position?productType=USDT-FUTURES';
    const targetUrl = `https://api.bitget.com${requestPath}`;

    const headers = ExchangeAuth.getBitgetHeaders(apiKey, apiSecret, passphrase, method, requestPath);
    
    const response = await proxyFetch({
      targetUrl,
      method,
      headers
    });
    
    return response.data?.list || [];
  }

  static async getHistoryBybit(apiKey: string, apiSecret: string) {
    // Bybit V5 endpoint: /v5/position/closed-pnl
    const method = 'GET';
    const query = 'category=linear'; // Required for V5 depending on account type. Using linear for USDT perps.
    const requestPath = `/v5/position/closed-pnl?${query}`;
    const targetUrl = `https://api.bybit.com${requestPath}`;

    const headers = ExchangeAuth.getBybitHeaders(apiKey, apiSecret, query);
    
    const response = await proxyFetch({
      targetUrl,
      method,
      headers
    });
    
    return response.result?.list || [];
  }
}
