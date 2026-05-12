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
  static async getHistoryOkx(apiKey: string, apiSecret: string, passphrase: string, start?: number, end?: number, after?: string) {
    const method = 'GET';
    let query = 'limit=100';
    if (after) query += `&after=${after}`;
    const requestPath = `/api/v5/account/positions-history?${query}`;
    const targetUrl = `https://www.okx.com${requestPath}`;
    
    const headers = ExchangeAuth.getOkxHeaders(apiKey, apiSecret, passphrase, method, requestPath);
    
    console.log(`[REST-Okx-History] req params: start=${start}, end=${end}, after=${after}`);
    console.log(`[REST-Okx-History] targetUrl:`, targetUrl);

    try {
      const response = await proxyFetch({
        targetUrl,
        method,
        headers
      });
      console.log(`[REST-Okx-History] response code:`, response.code, `msg:`, response.msg);

      let list = response.data || [];
      if (start && end) {
        list = list.filter((p: any) => parseInt(p.uTime || p.cTime || '0') >= start && parseInt(p.uTime || p.cTime || '0') <= end);
      }
      console.log(`[REST-Okx-History] found ${list.length} items (after filter)`);
      return list;
    } catch (error) {
      console.error(`[REST-Okx-History] fetch error:`, error);
      return [];
    }
  }

  static async getHistoryBitget(apiKey: string, apiSecret: string, passphrase: string, start?: number, end?: number, idLessThan?: string) {
    // Bitget V2 endpoints: https://api.bitget.com/api/v2/mix/position/history-position
    const method = 'GET';
    let query = 'productType=USDT-FUTURES';
    if (start) query += `&startTime=${start}`;
    if (end) query += `&endTime=${end}`;
    if (idLessThan) query += `&idLessThan=${idLessThan}`;
    
    const requestPath = `/api/v2/mix/position/history-position?${query}`;
    const targetUrl = `https://api.bitget.com${requestPath}`;

    const headers = ExchangeAuth.getBitgetHeaders(apiKey, apiSecret, passphrase, method, requestPath);
    
    console.log(`[REST-Bitget-History] req params: start=${start}, end=${end}, idLessThan=${idLessThan}`);
    console.log(`[REST-Bitget-History] targetUrl:`, targetUrl);

    try {
      const response = await proxyFetch({
        targetUrl,
        method,
        headers
      });
      console.log(`[REST-Bitget-History] response code:`, response.code, `msg:`, response.msg);
      // Bitget response.data might be a list or object containing list
      const list = response.data?.entList || response.data?.list || [];
      console.log(`[REST-Bitget-History] found ${list.length} items`);
      return list;
    } catch (error) {
      console.error(`[REST-Bitget-History] fetch error:`, error);
      return [];
    }
  }

  static async fetchBybitCategory(category: string, apiKey: string, apiSecret: string, start?: number, end?: number, cursor?: string) {
    const method = 'GET';
    let query = `category=${category}&limit=100`;
    if (start) query += `&startTime=${start}`;
    if (end) query += `&endTime=${end}`;
    if (cursor) query += `&cursor=${cursor}`;
    
    const requestPath = `/v5/position/closed-pnl?${query}`;
    const targetUrl = `https://api.bybit.com${requestPath}`;

    const headers = ExchangeAuth.getBybitHeaders(apiKey, apiSecret, query);
    
    console.log(`[REST-Bybit-History-${category}] req params: start=${start}, end=${end}`);
    console.log(`[REST-Bybit-History-${category}] targetUrl:`, targetUrl);

    try {
      const response = await proxyFetch({
        targetUrl,
        method,
        headers
      });
      
      console.log(`[REST-Bybit-History-${category}] response retCode:`, response.retCode, `retMsg:`, response.retMsg);

      if (response.retCode !== 0) {
        if (response.retCode === 10001) return []; // Empty or unsupported for this account type
        console.warn(`Bybit API Proxy Warning (${response.retCode}): ${response.retMsg}`);
        return [];
      }
      
      const list = response.result?.list || [];
      console.log(`[REST-Bybit-History-${category}] found ${list.length} items`);
      return list;
    } catch (error) {
      console.error(`[REST-Bybit-History-${category}] fetch error:`, error);
      return [];
    }
  }

  static async getHistoryBybit(apiKey: string, apiSecret: string, start?: number, end?: number, cursor?: string) {
    try {
      const linear = await this.fetchBybitCategory('linear', apiKey, apiSecret, start, end, cursor);
      const inverse = await this.fetchBybitCategory('inverse', apiKey, apiSecret, start, end, cursor);
      return [...linear, ...inverse];
    } catch (error) {
      console.error(error);
      return [];
    }
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
