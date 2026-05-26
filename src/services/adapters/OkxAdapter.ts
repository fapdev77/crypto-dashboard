import { UnifiedPosition, UnifiedHistoryPosition, UnifiedBillRecord, UnifiedBalance } from '../../types';
import { IExchangeAdapter } from './IExchangeAdapter';
import { proxyFetch } from '../../utils/proxyFetch';
import { hmacSha256 } from '../../utils/cryptoLib';
import { useDashboardStore } from '../../store/dashboardStore';
import { calculateRoe } from '../../utils/math-crypto';

const MAX_DEEP_PAGES = 30;

export class OkxAdapter implements IExchangeAdapter {
  static timeOffset = 0;
  static lastSyncTime = 0;

  static async syncTime() {
    if (Date.now() - this.lastSyncTime < 300000) return;
    try {
      const targetUrl = 'https://www.okx.com/api/v5/public/time';
      let data;
      try {
        const res = await fetch(targetUrl, { method: 'GET' });
        if (res.ok) data = await res.json();
        else throw new Error();
      } catch {
        data = await proxyFetch({ targetUrl, method: 'GET', headers: {} });
      }

      if (data && data.code === '0' && data.data?.[0]?.ts) {
        this.timeOffset = parseInt(data.data[0].ts, 10) - Date.now();
        this.lastSyncTime = Date.now();
        console.log(`[Time-Sync] OKX synced. Offset: ${this.timeOffset}ms`);
      }
    } catch (e) {
      console.error('[Time-Sync] OKX time sync error:', e);
    }
  }

  public static async getHeaders(
    apiKey: string,
    apiSecret: string,
    passphrase: string,
    method: string,
    requestPath: string,
    body: string = ''
  ): Promise<Record<string, string>> {
    await this.syncTime();
    const timestamp = new Date(Date.now() + this.timeOffset).toISOString();
    const prehash = timestamp + method.toUpperCase() + requestPath + body;
    const signature = await hmacSha256(prehash, apiSecret, 'base64');

    return {
      'OK-ACCESS-KEY': apiKey,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': passphrase,
    };
  }

  public static async getWsAuth(apiKey: string, apiSecret: string, passphrase: string) {
    await this.syncTime();
    const timestamp = Math.floor((Date.now() + this.timeOffset) / 1000).toString();
    const prehash = timestamp + 'GET' + '/users/self/verify';
    const signature = await hmacSha256(prehash, apiSecret, 'base64');
    return {
      op: 'login',
      args: [{ apiKey, passphrase, timestamp, sign: signature }]
    };
  }

  // REST Balances
  public async getBalance(key: any): Promise<UnifiedBalance[]> {
    const path = '/api/v5/account/balance';
    const headers = await OkxAdapter.getHeaders(key.apiKey, key.apiSecret, key.passphrase || '', 'GET', path);
    const response = await proxyFetch({
      targetUrl: `https://www.okx.com${path}`,
      method: 'GET',
      headers
    });

    if (response.code && response.code !== '0') {
      throw new Error(`OKX balance API Error (${response.code}): ${response.msg}`);
    }

    const data = response.data?.[0];
    if (!data || !data.details) return [];

    const totalEquity = parseFloat(data.totalEq || '0');
    const walletBalance = parseFloat(data.adjEq || '0');
    const availableMargin = parseFloat(data.availEq || '0');
    const unrealizedPnl = parseFloat(data.upl || '0');

    return data.details.map((item: any) => ({
      id: `${key.id}-${item.ccy}`,
      connectionId: key.id,
      exchange: 'okx',
      label: key.label,
      ccy: item.ccy.toUpperCase(),
      amount: parseFloat(item.cashBal || '0'),
      usdValue: parseFloat(item.eqUsd || '0'),
      totalEquity,
      walletBalance,
      availableMargin,
      unrealizedPnl,
      raw: item
    }));
  }

  // REST Positions
  public async getOpenPositions(key: any): Promise<UnifiedPosition[]> {
    const path = '/api/v5/account/positions';
    const headers = await OkxAdapter.getHeaders(key.apiKey, key.apiSecret, key.passphrase || '', 'GET', path);
    const response = await proxyFetch({
      targetUrl: `https://www.okx.com${path}`,
      method: 'GET',
      headers
    });

    if (response.code && response.code !== '0') {
      throw new Error(`OKX positions API Error (${response.code}): ${response.msg}`);
    }

    return (response.data || []).map((pos: any) => {
      const margin = parseFloat(pos.margin || '0');
      const unrealizedPnl = parseFloat(pos.upl || '0');
      
      const notionalUsd = pos.notionalUsd ? parseFloat(pos.notionalUsd) : 0;
      const markPx = pos.markPx ? parseFloat(pos.markPx) : 0;
      let size = parseFloat(pos.pos || '0');
      if (notionalUsd > 0 && markPx > 0) {
        size = notionalUsd / markPx;
      }

      return {
        id: `${key.id}-${pos.posId}`,
        connectionId: key.id,
        exchange: 'okx',
        label: key.label,
        symbol: pos.instId,
        ccy: pos.ccy || pos.marginCoin || 'USDT',
        side: pos.posSide || 'net',
        size,
        entryPrice: parseFloat(pos.avgPx || '0'),
        markPrice: markPx,
        unrealizedPnl,
        realizedPnl: parseFloat(pos.realizedPnl || '0'),
        leverage: parseFloat(pos.lever || '0'),
        marginMode: pos.mgnMode === 'isolated' ? 'isolated' : 'cross',
        margin,
        notionalUsd,
        liquidationPrice: parseFloat(pos.liqPx || '0'),
        breakEvenPrice: parseFloat(pos.bePx || '0'),
        roe: pos.uplRatio ? parseFloat(pos.uplRatio) * 100 : (margin > 0 ? (unrealizedPnl / margin) * 100 : undefined),
        instrumentType: pos.instType || 'SWAP',
        raw: pos
      };
    });
  }

  // REST Closed PnL History
  public async fetchAndNormalize(key: any, start?: number, end?: number): Promise<UnifiedHistoryPosition[]> {
    const instTypes = ['SWAP', 'FUTURES', 'MARGIN'];
    
    const fetchType = async (type: string) => {
      let list: any[] = [];
      let after = '';
      let pages = 0;
      try {
        do {
          let query = `instType=${type}&limit=100`;
          if (after) query += `&after=${after}`;

          const path = `/api/v5/account/positions-history?${query}`;
          const headers = await OkxAdapter.getHeaders(key.apiKey, key.apiSecret, key.passphrase || '', 'GET', path);
          const res = await proxyFetch({
            targetUrl: `https://www.okx.com${path}`,
            method: 'GET',
            headers
          });

          if (res.code && res.code !== '0') throw new Error(res.msg);
          const rows = res.data || [];
          
          let filtered = rows;
          if (start && end) {
            filtered = rows.filter((p: any) => {
              const t = parseInt(p.uTime || p.cTime || '0', 10);
              return t >= start && t <= end;
            });
          }
          list = [...list, ...filtered];
          
          if (rows.length === 100) {
            after = rows[rows.length - 1].depId || rows[rows.length - 1].wdId || rows[rows.length - 1].ts || '';
          } else {
            after = '';
          }
          pages++;
        } while (after && pages < MAX_DEEP_PAGES);
      } catch (err) {
        console.warn(`[OKX-History] error for ${type}:`, err);
      }
      return list;
    };

    const results = await Promise.all(instTypes.map(type => fetchType(type)));

    return results.flat().map((p: any) => {
      const closeUpdateTime = parseInt(p.uTime || p.cTime || '0', 10);
      return {
        id: `${key.id}-${p.instId}-${closeUpdateTime}`,
        connectionId: key.id,
        label: key.label,
        exchange: 'okx',
        symbol: p.instId,
        ccy: p.ccy || 'USDT',
        side: p.posSide === 'long' || p.direction === 'long' ? 'long' : 'short',
        realizedPnl: parseFloat(p.realizedPnl || p.pnl || '0'),
        closeUpdateTime: closeUpdateTime,
        entryPrice: parseFloat(p.openAvgPx || '0'),
        closePrice: parseFloat(p.avgPx || p.closeAvgPx || '0'),
        size: parseFloat(p.closeVol || p.closeTotalPos || '0'),
        fundingFee: p.fundingFee ? parseFloat(p.fundingFee) : undefined,
        tradingFee: p.fee ? parseFloat(p.fee) : undefined,
        raw: p,
      };
    });
  }

  // REST Deposits / Withdrawals (Bills)
  public async fetchBills(key: any, start?: number, end?: number): Promise<UnifiedBillRecord[]> {
    const fetchRecords = async (type: 'deposit' | 'withdrawal') => {
      const endpoint = type === 'deposit' ? '/api/v5/asset/deposit-history' : '/api/v5/asset/withdrawal-history';
      let list: any[] = [];
      let after = '';
      let pages = 0;

      try {
        do {
          let query = `limit=100`;
          if (after) query += `&after=${after}`;

          const path = `${endpoint}?${query}`;
          const headers = await OkxAdapter.getHeaders(key.apiKey, key.apiSecret, key.passphrase || '', 'GET', path);
          const response = await proxyFetch({
            targetUrl: `https://www.okx.com${path}`,
            method: 'GET',
            headers
          });

          if (response.code && response.code !== '0') throw new Error(response.msg);
          const rows = response.data || [];
          
          let filtered = rows;
          if (start && end) {
            filtered = rows.filter((p: any) => {
              const t = parseInt(p.ts || '0', 10);
              return t >= start && t <= end;
            });
          }
          list = [...list, ...filtered];
          
          if (rows.length === 100) {
            after = rows[rows.length - 1].depId || rows[rows.length - 1].wdId || '';
          } else {
            after = '';
          }
          pages++;
        } while (after && pages < MAX_DEEP_PAGES);
      } catch (err) {
        console.warn(`[OKX-Bills] error for ${type}:`, err);
      }
      return list.map(item => ({ ...item, _type: type }));
    };

    const [deposits, withdrawals] = await Promise.all([
      fetchRecords('deposit'),
      fetchRecords('withdrawal')
    ]);

    return [...deposits, ...withdrawals].map((b: any) => {
      const cTime = parseInt(b.ts || Date.now().toString(), 10);
      return {
        id: `${key.id}-${b.depId || b.wdId || b.txId || Math.random().toString(36)}-${cTime}`,
        connectionId: key.id,
        exchange: 'okx',
        label: key.label,
        type: b._type === 'deposit' ? 'deposit' : 'withdrawal',
        amount: parseFloat(b.amt || '0'),
        ccy: b.ccy,
        timestamp: cTime,
        raw: b
      };
    });
  }

  // WSS private channel parser
  public static parse(cid: string, exchange: string, label: string, data: any) {
    if (!data.arg || !data.data) return;
    const store = useDashboardStore.getState();

    if (data.arg.channel === 'account') {
      const acc = data.data[0];
      const totalEquity = parseFloat(acc.totalEq || '0');
      const walletBalance = parseFloat(acc.adjEq || '0');
      const availableMargin = parseFloat(acc.availEq || '0');
      const unrealizedPnl = parseFloat(acc.upl || '0');

      const balances: Partial<UnifiedBalance>[] = acc.details.map((item: any) => ({
        id: `${cid}-${item.ccy}`,
        connectionId: cid,
        exchange: 'okx',
        label,
        ccy: item.ccy.toUpperCase(),
        amount: parseFloat(item.cashBal || '0'),
        usdValue: parseFloat(item.eqUsd || '0'),
        totalEquity,
        walletBalance,
        availableMargin,
        unrealizedPnl
      }));
      if (balances.length > 0) store.updateBalancesDelta(cid, balances as any);
    }

    if (data.arg.channel === 'positions') {
      const positions: Partial<UnifiedPosition>[] = data.data.map((pos: any) => {
        const margin = parseFloat(pos.margin || '0');
        const unrealizedPnl = parseFloat(pos.upl || '0');
        const markPx = pos.markPx ? parseFloat(pos.markPx) : 0;
        const notionalUsd = pos.notionalUsd ? parseFloat(pos.notionalUsd) : 0;
        let size = parseFloat(pos.pos || '0');
        if (notionalUsd > 0 && markPx > 0) {
          size = notionalUsd / markPx;
        }

        return {
          id: `${cid}-${pos.posId}`,
          connectionId: cid,
          exchange: 'okx',
          label,
          symbol: pos.instId,
          ccy: pos.ccy || pos.marginCoin || 'USDT',
          side: pos.posSide || 'net',
          size,
          entryPrice: parseFloat(pos.avgPx || '0'),
          markPrice: markPx,
          unrealizedPnl,
          realizedPnl: parseFloat(pos.realizedPnl || '0'),
          leverage: parseFloat(pos.lever || '0'),
          marginMode: pos.mgnMode === 'isolated' ? 'isolated' : 'cross',
          margin,
          notionalUsd,
          liquidationPrice: parseFloat(pos.liqPx || '0'),
          breakEvenPrice: parseFloat(pos.bePx || '0'),
          roe: pos.uplRatio ? parseFloat(pos.uplRatio) * 100 : (margin > 0 ? (unrealizedPnl / margin) * 100 : undefined),
          instrumentType: pos.instType || 'SWAP',
          raw: pos
        };
      });
      if (positions.length > 0) store.updatePositionsDelta(cid, positions as any);
    }
  }
}
