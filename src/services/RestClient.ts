import { ExchangeAuth } from './ExchangeAuth';

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

/**
 * Hybrid Fetch Workaround:
 * O servidor proxy no AI Studio / Cloud Run normalmente está em região US-East.
 * A Bybit bloqueia ativamente requisições para seus endpoints originadas de IP dos EUA (Geo-Block HTTP 403).
 * Este helper tenta realizar um 'direct fetch' via navegador do próprio usuário (que normalmente estará fora dos EUA e Bybit permite CORS para GET v5)
 * Se falhar (ex: erro de rede/CORS estrito em outro ambiente), recorre ao proxyFetch convencional na nuvem.
 * NÃO REMOVA: Sem este fallback, a renderização da Bybit no dashboard falhará em ambientes hospedados em solo americano.
 */
const hybridFetch = async (targetUrl: string, method: string, headers: Record<string, string>) => {
  try {
    // Browser-Direct Attempt (escapes WAF/GeoBlock Bybit on US Cloud Run instances)
    const res = await fetch(targetUrl, { method, headers });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`[HybridFetch] Fetch direto falhou, acionando Proxy...`, targetUrl);
  }
  
  // Proxy Fallback
  return await proxyFetch({ targetUrl, method, headers });
};

export class RestClient {
  static async getHistoryOkx(instType: string, apiKey: string, apiSecret: string, passphrase: string, start?: number, end?: number, after?: string) {
    const method = 'GET';
    let query = `instType=${instType}&limit=100`;
    if (after) query += `&after=${after}`;
    const requestPath = `/api/v5/account/positions-history?${query}`;
    const targetUrl = `https://www.okx.com${requestPath}`;
    
    const headers = await ExchangeAuth.getOkxHeaders(apiKey, apiSecret, passphrase, method, requestPath);
    
    try {
      const response = await proxyFetch({ targetUrl, method, headers });
      if (response.code && response.code !== '0') {
        throw new Error(`OKX API Error (${response.code}): ${response.msg}`);
      }
      let list = response.data || [];
      if (start && end) {
        list = list.filter((p: any) => parseInt(p.uTime || p.cTime || '0') >= start && parseInt(p.uTime || p.cTime || '0') <= end);
      }
      return list;
    } catch (error) {
      console.error(`[REST-Okx-History] fetch error:`, error);
      throw error; // Fail-fast
    }
  }

  static async getHistoryBitget(productType: string, apiKey: string, apiSecret: string, passphrase: string, start?: number, end?: number, idLessThan?: string) {
    const method = 'GET';
    let query = `productType=${productType}&limit=100`;
    if (start) query += `&startTime=${start}`;
    if (end) query += `&endTime=${end}`;
    if (idLessThan) query += `&idLessThan=${idLessThan}`;
    
    const requestPath = `/api/v2/mix/position/history-position?${query}`;
    const targetUrl = `https://api.bitget.com${requestPath}`;

    const headers = await ExchangeAuth.getBitgetHeaders(apiKey, apiSecret, passphrase, method, requestPath);
    
    try {
      const response = await proxyFetch({ targetUrl, method, headers });
      if (response.code && response.code !== '00000') {
         throw new Error(`Bitget API Error (${response.code}): ${response.msg}`);
      }
      const list = response.data?.entList || response.data?.list || [];
      const nextId = response.data?.endId;
      return { list, nextId };
    } catch (error) {
      console.error(`[REST-Bitget-History] fetch error:`, error);
      throw error; // Fail-fast
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

    const headers = await ExchangeAuth.getBybitHeaders(apiKey, apiSecret, query);
    
    try {
      const response = await hybridFetch(targetUrl, method, headers as Record<string, string>);
      if (response.retCode !== 0) {
        if (response.retCode === 10001) return { list: [], nextCursor: undefined }; // Unsupported account type
        throw new Error(`Bybit API Error (${response.retCode}): ${response.retMsg}`);
      }
      const list = response.result?.list || [];
      const nextCursor = response.result?.nextPageCursor;
      return { list, nextCursor };
    } catch (error) {
      console.error(`[REST-Bybit-History-${category}] fetch error:`, error);
      throw error; // Fail-fast
    }
  }

  static async getPositionsBybit(apiKey: string, apiSecret: string) {
    const method = 'GET';
    const query = 'category=linear&settleCoin=USDT';
    const requestPath = `/v5/position/list?${query}`;
    const targetUrl = `https://api.bybit.com${requestPath}`;

    const headers = await ExchangeAuth.getBybitHeaders(apiKey, apiSecret, query);
    
    try {
      const response = await hybridFetch(targetUrl, method, headers as Record<string, string>);
      if (response.retCode !== 0) {
        throw new Error(`Bybit API Proxy Error (${response.retCode}): ${response.retMsg}`);
      }
      return response.result?.list || [];
    } catch (err) {
      console.error('[REST-Bybit-Positions] Fetch falhou com erro:', err);
      throw err;
    }
  }

  static async getWalletBybit(apiKey: string, apiSecret: string) {
    const method = 'GET';
    const query = 'accountType=UNIFIED';
    const requestPath = `/v5/account/wallet-balance?${query}`;
    const targetUrl = `https://api.bybit.com${requestPath}`;

    const headers = await ExchangeAuth.getBybitHeaders(apiKey, apiSecret, query);
    
    try {
      const response = await hybridFetch(targetUrl, method, headers as Record<string, string>);
      if (response.retCode !== 0) {
        throw new Error(`Bybit API Proxy Error (${response.retCode}): ${response.retMsg}`);
      }
      return response.result?.list?.[0] || null;
    } catch (err) {
       console.error('[REST-Bybit-Wallet] Fetch falhou com erro:', err);
       throw err;
    }
  }
}
