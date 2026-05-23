import { UnifiedHistoryPosition } from '../../../types';
import { IExchangeAdapter } from '../IExchangeAdapter';
import { proxyFetch } from '../../../utils/proxyFetch';
import { hmacSha256 } from '../../../utils/cryptoLib';

export class OkxHistoryAdapter implements IExchangeAdapter {
  
  // Refactored from ExchangeAuth
  public static async getHeaders(
    apiKey: string,
    apiSecret: string,
    passphrase: string,
    method: string,
    requestPath: string,
    body: string = ''
  ): Promise<Record<string, string>> {
    const timestamp = new Date().toISOString();
    const prehash = timestamp + method.toUpperCase() + requestPath + body;
    const signature = await hmacSha256(prehash, apiSecret, 'base64');

    return {
      'OK-ACCESS-KEY': apiKey,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': passphrase,
    };
  }

  // WS Auth exposed for ApiTester
  static async getWsAuth(apiKey: string, apiSecret: string, passphrase: string) {
    const timestamp = (Date.now() / 1000).toString(); // OKX accepts epoch in seconds
    const prehash = timestamp + 'GET' + '/users/self/verify';
    const signature = await hmacSha256(prehash, apiSecret, 'base64');

    return {
      op: 'login',
      args: [{
        apiKey,
        passphrase,
        timestamp,
        sign: signature
      }]
    };
  }

  // Refactored from RestClient
  private static async fetchHistory(instType: string, apiKey: string, apiSecret: string, passphrase: string, start?: number, end?: number, after?: string) {
    const method = 'GET';
    let query = `instType=${instType}&limit=100`;
    if (after) query += `&after=${after}`;
    const requestPath = `/api/v5/account/positions-history?${query}`;
    const targetUrl = `https://www.okx.com${requestPath}`;
    
    const headers = await this.getHeaders(apiKey, apiSecret, passphrase, method, requestPath);
    
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

  public async fetchAndNormalize(key: any, start?: number, end?: number): Promise<UnifiedHistoryPosition[]> {
    const instTypes = ['SWAP', 'FUTURES', 'MARGIN'];
    const responses = await Promise.all(instTypes.map(type => 
       OkxHistoryAdapter.fetchHistory(type, key.apiKey, key.apiSecret, key.passphrase || '', start, end)
    ));
    const unprocessedPayload = responses.flat();
    return this.parse(unprocessedPayload, key.id, key.label);
  }

  private parse(unprocessedPayload: any[], connectionId: string, label: string): UnifiedHistoryPosition[] {
    return unprocessedPayload.map((p: any) => {
      const isLong = p.posSide === 'long' || p.direction === 'long';
      const isShort = p.posSide === 'short' || p.direction === 'short';
      
      const realizedPnl = parseFloat(p.realizedPnl || p.pnl || '0');
      const entryPrice = parseFloat(p.openAvgPx || '0');
      const closePrice = parseFloat(p.avgPx || p.closeAvgPx || '0');
      const size = parseFloat(p.closeVol || p.closeTotalPos || '0');
      const cTime = parseInt(p.uTime || p.cTime || '0', 10);
      
      let roi: number | undefined;
      if (p.pnlRatio) {
        roi = parseFloat(p.pnlRatio); // Sometimes needs * 100 depending on endpoint
      }

      return {
        id: `${connectionId}-${p.instId}-${cTime}`,
        connectionId,
        label,
        exchange: 'okx',
        symbol: p.instId,
        ccy: p.ccy || p.marginCoin || (p.instId.includes('-USDT') ? 'USDT' : p.instId.includes('-USDC') ? 'USDC' : p.instId.split('-')[0]),
        side: isLong ? 'long' : isShort ? 'short' : 'net',
        realizedPnl,
        closeTime: cTime,
        entryPrice,
        closePrice,
        size,
        roi,
        fundingFee: p.fundingFee ? parseFloat(p.fundingFee) : undefined,
        tradingFee: p.fee ? parseFloat(p.fee) : undefined,
        raw: p,
      };
    });
  }

  public async fetchBills(key: any, start?: number, end?: number): Promise<import('../../../types').UnifiedBillRecord[]> {
    const fetchRecords = async (type: 'deposit' | 'withdrawal') => {
      const method = 'GET';
      const endpoint = type === 'deposit' ? '/api/v5/asset/deposit-history' : '/api/v5/asset/withdrawal-history';
      
      let list: any[] = [];
      let after: string | undefined = undefined;
      let pages = 0;
      
      try {
        do {
          let query = `limit=100`;
          if (after) query += `&after=${after}`;
          
          const requestPath = `${endpoint}?${query}`;
          const targetUrl = `https://www.okx.com${requestPath}`;
          const headers = await OkxHistoryAdapter.getHeaders(key.apiKey, key.apiSecret, key.passphrase || '', method, requestPath);
          
          const response = await proxyFetch({ targetUrl, method, headers });
          if (response.code && response.code !== '0') {
            throw new Error(`OKX API Error (${response.code}): ${response.msg}`);
          }
          
          const data = response.data || [];
          if (data.length > 0) {
            let filteredData = data;
            if (start && end) {
               filteredData = data.filter((p: any) => parseInt(p.ts || '0') >= start && parseInt(p.ts || '0') <= end);
            }
            list = [...list, ...filteredData];
          }
          
          // OKX uses the ID of the last element as 'after' for the next page
          if (data.length === 100) {
            after = data[data.length - 1].depId || data[data.length - 1].wdId;
          } else {
            after = undefined;
          }
          
          pages++;
        } while (after && pages < 50);
      } catch (err) {
        console.warn(`Failed to fetch all OKX ${type} records:`, err);
      }
      return list.map(item => ({...item, _type: type}));
    };

    const [deposits, withdrawals] = await Promise.all([
      fetchRecords('deposit'),
      fetchRecords('withdrawal')
    ]);

    const unprocessedPayload = [...deposits, ...withdrawals];

    return unprocessedPayload.map((b: any) => {
      const cTime = parseInt(b.ts || Date.now().toString(), 10);
      return {
        id: `${key.id}-${b.depId || b.wdId || b.txId || Math.random().toString(36)}-${cTime}`,
        connectionId: key.id,
        label: key.label,
        exchange: 'okx',
        type: b._type === 'deposit' ? 'deposit' : 'withdrawal',
        amount: parseFloat(b.amt || '0'),
        ccy: b.ccy,
        timestamp: cTime,
        raw: b
      };
    });
  }
}
