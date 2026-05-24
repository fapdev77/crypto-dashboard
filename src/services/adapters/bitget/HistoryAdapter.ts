import { UnifiedHistoryPosition } from '../../../types';
import { IExchangeAdapter } from '../IExchangeAdapter';
import { proxyFetch } from '../../../utils/proxyFetch';
import { hmacSha256 } from '../../../utils/cryptoLib';

const MAX_DEEP_PAGES = 50;

export class BitgetHistoryAdapter implements IExchangeAdapter {

  // Refactored from ExchangeAuth
  public static async getHeaders(
    apiKey: string,
    apiSecret: string,
    passphrase: string,
    method: string,
    requestPath: string,
    body: string = ''
  ): Promise<Record<string, string>> {
    const timestamp = Date.now().toString();
    const prehash = timestamp + method.toUpperCase() + requestPath + body;
    const signature = await hmacSha256(prehash, apiSecret, 'base64');

    return {
      'ACCESS-KEY': apiKey,
      'ACCESS-SIGN': signature,
      'ACCESS-TIMESTAMP': timestamp,
      'ACCESS-PASSPHRASE': passphrase,
    };
  }

  // WS Auth exposed for ApiTester
  static async getWsAuth(apiKey: string, apiSecret: string, passphrase: string) {
    const timestamp = Date.now().toString(); // Bitget uses milliseconds
    const prehash = timestamp + 'GET' + '/user/verify';
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
  private static async fetchHistory(productType: string, apiKey: string, apiSecret: string, passphrase: string, start?: number, end?: number, idLessThan?: string) {
    const method = 'GET';
    let query = `productType=${productType}&limit=100`;
    if (start) query += `&startTime=${start}`;
    if (end) query += `&endTime=${end}`;
    if (idLessThan) query += `&idLessThan=${idLessThan}`;
    
    const requestPath = `/api/v2/mix/position/history-position?${query}`;
    const targetUrl = `https://api.bitget.com${requestPath}`;

    const headers = await this.getHeaders(apiKey, apiSecret, passphrase, method, requestPath);
    
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
      throw error;
    }
  }

  // Refactored pagination logic from PositionHistoryService
  public async fetchAndNormalize(key: any, start?: number, end?: number): Promise<UnifiedHistoryPosition[]> {
    const productTypes = ['USDT-FUTURES', 'COIN-FUTURES', 'USDC-FUTURES'];
    
    const fetchAllForType = async (pType: string) => {
      let list: any[] = [];
      let nextId: string | undefined = undefined;
      let pages = 0;
      try {
        do {
          const res = await BitgetHistoryAdapter.fetchHistory(pType, key.apiKey, key.apiSecret, key.passphrase || '', start, end, nextId);
          if (res.list && res.list.length > 0) {
            list = [...list, ...res.list.map((item: any) => ({ ...item, productType: pType }))];
          }
          nextId = res.nextId;
          pages++;
        } while (nextId && pages < MAX_DEEP_PAGES);
      } catch (err) {
        console.warn(`Failed to fetch all Bitget history for ${pType}:`, err);
      }
      return list;
    };

    const responses = await Promise.all(productTypes.map(pType => fetchAllForType(pType)));
    const unprocessedPayload = responses.flat();
    return this.parse(unprocessedPayload, key.id, key.label);
  }

  private parse(unprocessedPayload: any[], connectionId: string, label: string): UnifiedHistoryPosition[] {
    return unprocessedPayload.map((p: any) => {
      const realizedPnl = parseFloat(p.netProfit ?? p.pnl ?? p.achievedProfits ?? '0');
      const entryPrice = parseFloat(p.openAvgPrice || p.openPriceAvg || p.openAvgPx || '0');
      const closePrice = parseFloat(p.closeAvgPrice || p.closePriceAvg || p.closeAvgPx || '0');
      const size = parseFloat(p.closeTotalPos || p.closeSize || p.closeVol || '0');
      const cTime = parseInt(p.utime || p.uTime || p.ctime || p.cTime || '0', 10);
      
      const sideRaw = p.holdSide || p.posSide || p.side;
      const isLong = sideRaw?.toLowerCase() === 'long' || sideRaw?.toLowerCase() === 'buy';
      const isShort = sideRaw?.toLowerCase() === 'short' || sideRaw?.toLowerCase() === 'sell';

      let totalTradingFee = 0;
      if (p.openFee) totalTradingFee += parseFloat(p.openFee);
      if (p.closeFee) totalTradingFee += parseFloat(p.closeFee);
      if (p.fee) totalTradingFee += parseFloat(p.fee);

      return {
        id: `${connectionId}-${p.posId || p.positionId}-${cTime}`,
        connectionId,
        label,
        exchange: 'bitget',
        symbol: p.instId || p.symbol,
        ccy: p.marginCoin || p.settleCoin || (p.symbol ? (p.symbol.endsWith('USDT') ? 'USDT' : p.symbol.endsWith('USDC') ? 'USDC' : p.symbol.replace(/USD.*/, '')) : 'USDT'),
        side: isLong ? 'long' : isShort ? 'short' : 'net',
        realizedPnl,
        closeTime: cTime,
        entryPrice,
        closePrice,
        size,
        fundingFee: p.totalFunding ? parseFloat(p.totalFunding) : (p.fundingFee ? parseFloat(p.fundingFee) : undefined),
        tradingFee: totalTradingFee || undefined,
        raw: p,
      };
    });
  }

  public async fetchBills(key: any, start?: number, end?: number): Promise<import('../../../types').UnifiedBillRecord[]> {
    const fetchRecords = async (type: 'deposit' | 'withdrawal') => {
      const method = 'GET';
      const endpoint = type === 'deposit' ? '/api/v2/spot/wallet/deposit-records' : '/api/v2/spot/wallet/withdrawal-records';
      
      let list: any[] = [];
      let nextId: string | undefined = undefined;
      let pages = 0;
      
      try {
        do {
          let query = `limit=100`;
          if (start) query += `&startTime=${start}`;
          if (end) query += `&endTime=${end}`;
          if (nextId) query += `&idLessThan=${nextId}`;
          
          const requestPath = `${endpoint}?${query}`;
          const targetUrl = `https://api.bitget.com${requestPath}`;
          const headers = await BitgetHistoryAdapter.getHeaders(key.apiKey, key.apiSecret, key.passphrase || '', method, requestPath);
          
          const response = await proxyFetch({ targetUrl, method, headers });
          if (response.code && response.code !== '00000') {
            throw new Error(`Bitget API Error (${response.code}): ${response.msg}`);
          }
          
          const data = response.data?.entList || response.data?.list || response.data || [];
          if (data.length > 0) {
            list = [...list, ...data];
          }
          nextId = response.data?.endId || response.data?.nextId;
          pages++;
        } while (nextId && pages < 50);
      } catch (err) {
        console.warn(`Failed to fetch all Bitget ${type} records:`, err);
      }
      return list.map(item => ({...item, _type: type}));
    };

    const [deposits, withdrawals] = await Promise.all([
      fetchRecords('deposit'),
      fetchRecords('withdrawal')
    ]);

    const unprocessedPayload = [...deposits, ...withdrawals];

    return unprocessedPayload.map((b: any) => {
      const cTime = parseInt(b.cTime || b.uTime || Date.now().toString(), 10);
      const amountStr = b.size || b.amount || b.volume || '0';
      return {
        id: `${key.id}-${b.orderId || b.id || Math.random().toString(36)}-${cTime}`,
        connectionId: key.id,
        label: key.label,
        exchange: 'bitget',
        type: b._type === 'deposit' ? 'deposit' : 'withdrawal',
        amount: parseFloat(amountStr),
        ccy: b.coin,
        timestamp: cTime,
        raw: b
      };
    });
  }
}
