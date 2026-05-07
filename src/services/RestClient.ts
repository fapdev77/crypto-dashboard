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

  static async getPositionsBybit(apiKey: string, apiSecret: string) {
    const method = 'GET';
    const query = 'category=linear&settleCoin=USDT';
    const requestPath = `/v5/position/list?${query}`;
    const targetUrl = `https://api.bybit.com${requestPath}`;

    const headers = ExchangeAuth.getBybitHeaders(apiKey, apiSecret, query);
    
    console.log('[REST-Bybit-Positions] Tentando fetch direto:', targetUrl);
    try {
      const directResponse = await fetch(targetUrl, { method, headers });
      if (directResponse.ok) {
        const data = await directResponse.json();
        console.log('[REST-Bybit-Positions] Fetch direto com sucesso. Result:', typeof data);
        return data.result?.list || [];
      } else {
        console.warn(`[REST-Bybit-Positions] Fetch direto falhou com status: ${directResponse.status}`);
      }
    } catch (err) {
      console.warn('[REST-Bybit-Positions] Direct fetch falhou com erro:', err);
    }

    console.log('[REST-Bybit-Positions] Usando proxy...');
    try {
      const response = await proxyFetch({
        targetUrl,
        method,
        headers
      });
      console.log('[REST-Bybit-Positions] Proxy fetch finalizado com sucesso.');
      return response.result?.list || [];
    } catch (err) {
      console.error('[REST-Bybit-Positions] Proxy fetch falhou com erro:', err);
      throw err;
    }
  }

  static async getWalletBybit(apiKey: string, apiSecret: string) {
    const method = 'GET';
    const query = 'accountType=UNIFIED';
    const requestPath = `/v5/account/wallet-balance?${query}`;
    const targetUrl = `https://api.bybit.com${requestPath}`;

    const headers = ExchangeAuth.getBybitHeaders(apiKey, apiSecret, query);
    
    console.log('[REST-Bybit-Wallet] Tentando fetch direto:', targetUrl);
    try {
      const directResponse = await fetch(targetUrl, { method, headers });
      if (directResponse.ok) {
        const data = await directResponse.json();
        console.log('[REST-Bybit-Wallet] Fetch direto com sucesso.');
        return data.result?.list?.[0] || null;
      } else {
        console.warn(`[REST-Bybit-Wallet] Fetch direto falhou com status: ${directResponse.status}`);
      }
    } catch (err) {
      console.warn('[REST-Bybit-Wallet] Direct fetch falhou com erro:', err);
    }

    console.log('[REST-Bybit-Wallet] Usando proxy...');
    try {
      const response = await proxyFetch({
        targetUrl,
        method,
        headers
      });
      console.log('[REST-Bybit-Wallet] Proxy fetch finalizado com sucesso.');
      return response.result?.list?.[0] || null;
    } catch (err) {
       console.error('[REST-Bybit-Wallet] Proxy fetch falhou com erro:', err);
       throw err;
    }
  }
}
