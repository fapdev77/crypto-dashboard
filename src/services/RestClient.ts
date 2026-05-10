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
  static async getHistoryOkx(apiKey: string, apiSecret: string, passphrase: string, start?: number, end?: number) {
    const method = 'GET';
    const requestPath = '/api/v5/account/positions-history?limit=100';
    const targetUrl = `https://www.okx.com${requestPath}`;
    
    const headers = ExchangeAuth.getOkxHeaders(apiKey, apiSecret, passphrase, method, requestPath);
    
    const response = await proxyFetch({
      targetUrl,
      method,
      headers
    });
    
    let list = response.data || [];
    if (start && end) {
      list = list.filter((p: any) => p.cTime >= start && p.cTime <= end);
    }
    return list;
  }

  static async getHistoryBitget(apiKey: string, apiSecret: string, passphrase: string, start?: number, end?: number) {
    // Bitget V2 endpoints: https://api.bitget.com/api/v2/mix/position/history-position
    const method = 'GET';
    let query = 'productType=USDT-FUTURES';
    if (start) query += `&startTime=${start}`;
    if (end) query += `&endTime=${end}`;
    
    const requestPath = `/api/v2/mix/position/history-position?${query}`;
    const targetUrl = `https://api.bitget.com${requestPath}`;

    const headers = ExchangeAuth.getBitgetHeaders(apiKey, apiSecret, passphrase, method, requestPath);
    
    const response = await proxyFetch({
      targetUrl,
      method,
      headers
    });
    
    return response.data?.list || [];
  }

  static async getHistoryBybit(apiKey: string, apiSecret: string, start?: number, end?: number) {
    // Bybit V5 endpoint: /v5/position/closed-pnl
    const method = 'GET';
    let query = 'category=linear&limit=100'; // Required for V5 depending on account type. Using linear for USDT perps.
    if (start) query += `&startTime=${start}`;
    if (end) query += `&endTime=${end}`;
    
    const requestPath = `/v5/position/closed-pnl?${query}`;
    const targetUrl = `https://api.bybit.com${requestPath}`;

    const headers = ExchangeAuth.getBybitHeaders(apiKey, apiSecret, query);
    
    const response = await proxyFetch({
      targetUrl,
      method,
      headers
    });
    
    if (response.retCode !== 0) {
      throw new Error(`Bybit API Proxy Error (${response.retCode}): ${response.retMsg}`);
    }
    
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
        if (data.retCode !== 0) {
          throw new Error(`Bybit API Error (${data.retCode}): ${data.retMsg}`);
        }
        console.log('[REST-Bybit-Positions] Fetch direto com sucesso.');
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
      if (response.retCode !== 0) {
        throw new Error(`Bybit API Proxy Error (${response.retCode}): ${response.retMsg}`);
      }
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
        if (data.retCode !== 0) {
          throw new Error(`Bybit API Error (${data.retCode}): ${data.retMsg}`);
        }
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
      if (response.retCode !== 0) {
        throw new Error(`Bybit API Proxy Error (${response.retCode}): ${response.retMsg}`);
      }
      console.log('[REST-Bybit-Wallet] Proxy fetch finalizado com sucesso.');
      return response.result?.list?.[0] || null;
    } catch (err) {
       console.error('[REST-Bybit-Wallet] Proxy fetch falhou com erro:', err);
       throw err;
    }
  }
}
