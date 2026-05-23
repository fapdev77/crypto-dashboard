import { UnifiedHistoryPosition } from '../../../types';
import { IExchangeAdapter } from '../IExchangeAdapter';
import { proxyFetch, hybridFetch } from '../../../utils/proxyFetch';
import { hmacSha256 } from '../../../utils/cryptoLib';

const MAX_DEEP_PAGES = 50;

export class BybitHistoryAdapter implements IExchangeAdapter {
  
  static bybitTimeOffset = 0;
  static lastSyncTime = 0;

  static async syncBybitTime() {
    // Evitar consultar repetidamente (cache de 5 minutos)
    if (Date.now() - this.lastSyncTime < 300000) return;
    try {
      const targetUrl = 'https://api.bybit.com/v5/market/time';
      let data;

      try {
        const res = await fetch(targetUrl, { method: 'GET', headers: {} });
        if (res.ok) {
          data = await res.json();
        } else {
          throw new Error('Direct fetch HTTP Status não-OK');
        }
      } catch (err) {
        console.warn("[Time-Sync] Fetch direto falhou, usando Proxy...");
        const response = await proxyFetch({ targetUrl, method: 'GET', headers: {} });
        data = response;
      }

      if (data && data.retCode === 0 && data.result?.timeSecond) {
        const serverTime = parseInt(data.result.timeSecond, 10) * 1000;
        this.bybitTimeOffset = serverTime - Date.now();
        this.lastSyncTime = Date.now();
        console.log(`[Time-Sync] Bybit sincronizada via V5. Offset: ${this.bybitTimeOffset}ms`);
      } else if (data && data.time) {
        const serverTime = parseInt(data.time, 10);
        this.bybitTimeOffset = serverTime - Date.now();
        this.lastSyncTime = Date.now();
        console.log(`[Time-Sync] Bybit sincronizada. Offset: ${this.bybitTimeOffset}ms`);
      }
    } catch (e) {
      console.error("[Time-Sync] Erro ao sincronizar com Bybit, usando offset 0.", e);
    }
  }

  // Used internally and exposed for ApiTester
  public static async getHeaders(
    apiKey: string,
    apiSecret: string,
    bodyOrQuery: string = ''
  ): Promise<Record<string, string>> {
    await this.syncBybitTime();
    const timestamp = (Date.now() + this.bybitTimeOffset).toString();
    const recvWindow = '20000';
    const prehash = timestamp + apiKey + recvWindow + bodyOrQuery;
    const signature = await hmacSha256(prehash, apiSecret, 'hex');

    return {
      'X-BAPI-API-KEY': apiKey,
      'X-BAPI-SIGN': signature,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': recvWindow,
    };
  }
  
  // WS Auth exposed for ApiTester
  static async getWsAuth(apiKey: string, apiSecret: string) {
    await this.syncBybitTime();
    const expires = Date.now() + this.bybitTimeOffset + 10000;
    const prehash = 'GET/realtime' + expires;
    const signature = await hmacSha256(prehash, apiSecret, 'hex');

    return {
      op: 'auth',
      args: [apiKey, expires, signature]
    };
  }

  // Refactored from RestClient
  private static async fetchHistory(category: string, apiKey: string, apiSecret: string, start?: number, end?: number, cursor?: string) {
    const method = 'GET';
    let query = `category=${category}&limit=100`;
    if (start) query += `&startTime=${start}`;
    if (end) query += `&endTime=${end}`;
    if (cursor) query += `&cursor=${cursor}`;
    
    const requestPath = `/v5/position/closed-pnl?${query}`;
    const targetUrl = `https://api.bybit.com${requestPath}`;

    const headers = await this.getHeaders(apiKey, apiSecret, query);
    
    try {
      const response = await hybridFetch(targetUrl, method, headers);
      if (response.retCode !== 0) {
        throw new Error(`Bybit API Error (${response.retCode}): ${response.retMsg}`);
      }
      const list = response.result?.list || [];
      const nextCursor = response.result?.nextPageCursor;
      return { list, nextCursor };
    } catch (error) {
       console.error(`[REST-Bybit-History] fetch error:`, error);
       throw error;
    }
  }

  // Refactored pagination logic from PositionHistoryService
  public async fetchAndNormalize(key: any, start?: number, end?: number): Promise<UnifiedHistoryPosition[]> {
    await BybitHistoryAdapter.syncBybitTime();
    
    const categories = ['linear', 'inverse'];

    const fetchAllForCategory = async (category: string) => {
      let list: any[] = [];
      let nextCursor: string | undefined = undefined;
      let pages = 0;
      try {
        do {
          const res = await BybitHistoryAdapter.fetchHistory(category, key.apiKey, key.apiSecret, start, end, nextCursor);
          if (res.list && res.list.length > 0) {
            list = [...list, ...res.list];
          }
          nextCursor = res.nextCursor;
          pages++;
        } while (nextCursor && nextCursor !== "" && pages < MAX_DEEP_PAGES);
      } catch (err) {
        console.warn(`Failed to fetch all Bybit history for ${category}:`, err);
      }
      return list;
    };

    const responses = await Promise.all(categories.map(cat => fetchAllForCategory(cat)));
    const unprocessedPayload = responses.flat();
    return this.parse(unprocessedPayload, key.id, key.label);
  }

  private parse(unprocessedPayload: any[], connectionId: string, label: string): UnifiedHistoryPosition[] {
    return unprocessedPayload.map((p: any) => {
      let realizedPnl = parseFloat(p.closedPnl || '0');
      
      const entryPrice = parseFloat(p.avgEntryPrice || '0');
      const closePrice = parseFloat(p.avgExitPrice || '0');
      const size = parseFloat(p.closedSize || '0');
      const cTime = parseInt(p.updatedTime || p.createdTime || '0', 10);
      
      const isLong = p.side === 'Buy';
      const isShort = p.side === 'Sell';
      
      return {
        id: `${connectionId}-${p.orderId || p.closedPnlId || Math.random().toString(36)}-${cTime}`,
        connectionId,
        label,
        exchange: 'bybit',
        symbol: p.symbol,
        ccy: p.settleCoin || p.coin || (p.symbol.endsWith('USDT') ? 'USDT' : p.symbol.endsWith('USDC') ? 'USDC' : p.symbol.replace(/USD.*/, '')),
        side: isLong ? 'long' : isShort ? 'short' : 'net',
        realizedPnl: realizedPnl,
        closeTime: cTime,
        entryPrice,
        closePrice,
        size,
        fundingFee: p.fundingFee ? parseFloat(p.fundingFee) : undefined,
        tradingFee: p.execFee ? parseFloat(p.execFee) : undefined,
        raw: p,
      };
    });
  }

  public async fetchBills(key: any, start?: number, end?: number): Promise<import('../../../types').UnifiedBillRecord[]> {
    await BybitHistoryAdapter.syncBybitTime();

    const fetchRecords = async (type: 'deposit' | 'withdraw') => {
      const method = 'GET';
      const endpoint = type === 'deposit' ? '/v5/asset/deposit/query-record' : '/v5/asset/withdraw/query-record';
      
      let list: any[] = [];
      let nextCursor: string | undefined = undefined;
      let pages = 0;
      
      try {
        do {
          let query = `limit=50`;
          if (start) query += `&startTime=${start}`;
          if (end) query += `&endTime=${end}`;
          if (nextCursor) query += `&cursor=${nextCursor}`;
          
          const requestPath = `${endpoint}?${query}`;
          const targetUrl = `https://api.bybit.com${requestPath}`;
          const headers = await BybitHistoryAdapter.getHeaders(key.apiKey, key.apiSecret, query);
          
          const response = await hybridFetch(targetUrl, method, headers);
          if (response.retCode !== 0) {
            throw new Error(`Bybit API Error (${response.retCode}): ${response.retMsg}`);
          }
          
          const rows = response.result?.rows || [];
          if (rows.length > 0) {
            list = [...list, ...rows];
          }
          nextCursor = response.result?.nextCursor;
          pages++;
        } while (nextCursor && nextCursor !== "" && pages < MAX_DEEP_PAGES);
      } catch (err) {
        console.warn(`Failed to fetch all Bybit ${type} records:`, err);
      }
      return list.map(item => ({...item, _type: type}));
    };

    const [deposits, withdrawals] = await Promise.all([
      fetchRecords('deposit'),
      fetchRecords('withdraw')
    ]);

    const unprocessedPayload = [...deposits, ...withdrawals];

    return unprocessedPayload.map((b: any) => {
      const cTime = parseInt(b.successAt || b.updateTime || Date.now().toString(), 10);
      return {
        id: `${key.id}-${b.txID || b.withdrawId || Math.random().toString(36)}-${cTime}`,
        connectionId: key.id,
        label: key.label,
        exchange: 'bybit',
        type: b._type === 'deposit' ? 'deposit' : 'withdrawal',
        amount: parseFloat(b.amount || '0'),
        ccy: b.coin,
        timestamp: cTime,
        raw: b
      };
    });
  }
}
