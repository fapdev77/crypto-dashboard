import Big from 'big.js';
import { UnifiedPosition, UnifiedHistoryPosition, UnifiedBillRecord, UnifiedBalance } from '../../types';
import { IExchangeAdapter } from './IExchangeAdapter';
import { proxyFetch } from '../../utils/proxyFetch';
import { hmacSha256 } from '../../utils/cryptoLib';
import { useDashboardStore } from '../../store/dashboardStore';
import { calculateRoe } from '../../utils/math-crypto';
import { mapInstrumentType } from '../../utils/instrumentTypeMapper';
import { mapPositionSide, mapMarginMode, extractBaseCoin, extractQuoteCoin, extractCcy } from '../../utils/unifiers';

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
      const marginMode = mapMarginMode('okx', pos.mgnMode);
      const margin = marginMode === 'cross' ? parseFloat(pos.imr || '0') : parseFloat(pos.margin || '0');
      const unrealizedPnl = parseFloat(pos.upl || '0');

      const notionalUsd = pos.notionalUsd ? parseFloat(pos.notionalUsd) : 0;
      const markPx = pos.markPx ? parseFloat(pos.markPx) : 0;
      let size = parseFloat(pos.pos || '0');
      if (notionalUsd > 0 && markPx > 0) {
        size = notionalUsd / markPx;
      }

      const side = mapPositionSide('okx', pos.posSide);

      const realizedPnl = parseFloat(pos.realizedPnl || '0');
      const accumulatedFunding = pos.fundingFee ? new Big(pos.fundingFee || 0).toString() : "0";
      const accumulatedTradingFee = pos.fee ? new Big(pos.fee || 0).toString() : "0";
      const closedPnl = parseFloat(pos.pnl || '0');

      return {
        id: `${key.id}-okx-${pos.instId}-${side}`,
        connectionId: key.id,
        exchange: 'okx',
        label: key.label,
        symbol: pos.instId,
        baseCoin: extractBaseCoin('okx', pos.instId),
        quoteCoin: extractQuoteCoin('okx', pos.instId),
        ccy: extractCcy('okx', pos.ccy, undefined, pos.marginCoin, pos.instId),
        side,
        size,
        entryPrice: parseFloat(pos.avgPx || '0'),
        markPrice: markPx,
        unrealizedPnl,
        realizedPnl,
        closedPnl,
        accumulatedFunding,
        accumulatedTradingFee,
        leverage: parseFloat(pos.lever || '0'),
        marginMode,
        margin,
        maintenanceMargin: parseFloat(pos.mmr || '0'),
        marginRatio: pos.mgnRatio ? parseFloat(pos.mgnRatio) * 100 : undefined,
        notionalUsd,
        liquidationPrice: parseFloat(pos.liqPx || '0'),
        breakEvenPrice: parseFloat(pos.bePx || '0'),
        roe: pos.uplRatio ? parseFloat(pos.uplRatio) * 100 : (margin > 0 ? (unrealizedPnl / margin) * 100 : undefined),
        instrumentType: mapInstrumentType('okx', pos.instType || 'SWAP', pos.ccy || pos.marginCoin || 'USDT'),
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
            filtered = rows.filter((pos: any) => {
              const t = parseInt(pos.uTime || pos.cTime || '0', 10);
              return t >= start && t <= end;
            });
          }
          list = [...list, ...filtered];

          // OKX positions-history pages backward via 'after=<uTime>' of the last record
          if (rows.length === 100) {
            after = rows[rows.length - 1].uTime || rows[rows.length - 1].cTime || '';
          } else {
            after = '';
          }
          pages++;
        } while (after && pages < MAX_DEEP_PAGES);
      } catch (err) {
        console.warn(`[OKX-History] error for ${type}:`, err);
      }
      return list.map(item => ({ ...item, _instType: type }));
    };

    const results = await Promise.all(instTypes.map(type => fetchType(type)));

    return results.flat().map((pos: any) => {
      const closeUpdateTime = parseInt(pos.uTime || pos.cTime || '0', 10);
      const createdTime = parseInt(pos.cTime || pos.uTime || '0', 10);
      return {
        id: `${key.id}-${pos.instId}-${closeUpdateTime}`,
        connectionId: key.id,
        label: key.label,
        exchange: 'okx',
        symbol: pos.instId,
        baseCoin: extractBaseCoin('okx', pos.instId),
        quoteCoin: extractQuoteCoin('okx', pos.instId),
        ccy: extractCcy('okx', pos.ccy, undefined, undefined, pos.instId),
        side: mapPositionSide('okx', pos.posSide, pos.direction),
        realizedPnl: parseFloat(pos.realizedPnl || pos.pnl || '0'),
        closedPnl: parseFloat(pos.realizedPnl || pos.pnl || '0') - (pos.fundingFee ? parseFloat(pos.fundingFee) : 0) - (pos.fee ? parseFloat(pos.fee) : 0),
        closeUpdateTime: closeUpdateTime,
        createdTime: createdTime,
        entryPrice: parseFloat(pos.openAvgPx || '0'),
        closePrice: parseFloat(pos.avgPx || pos.closeAvgPx || '0'),
        size: parseFloat(pos.closeVol || pos.closeTotalPos || '0'),
        fundingFee: pos.fundingFee ? parseFloat(pos.fundingFee) : undefined,
        tradingFee: pos.fee ? parseFloat(pos.fee) : undefined,
        instrumentType: mapInstrumentType('okx', pos.instType || pos._instType || 'SWAP', pos.ccy || 'USDT'),
        raw: pos,
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
            filtered = rows.filter((pos: any) => {
              const t = parseInt(pos.ts || '0', 10);
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

  // Orders
  public async getOpenOrders(key: any): Promise<import('../../types').UnifiedOrder[]> {
    const instTypes = ['SWAP', 'FUTURES', 'SPOT', 'MARGIN'];
    let allOrders: any[] = [];

    for (const instType of instTypes) {
      const query = `instType=${instType}`;
      const path = `/api/v5/trade/orders-pending?${query}`;
      const headers = await OkxAdapter.getHeaders(key.apiKey, key.apiSecret, key.passphrase || '', 'GET', path);

      try {
        const res = await proxyFetch({ targetUrl: `https://www.okx.com${path}`, method: 'GET', headers });
        if (res.code === '0' && res.data) {
          allOrders = allOrders.concat(res.data);
        }
      } catch (err) {
        console.warn(`[Okx-OpenOrders] Error fetching ${instType}:`, err);
      }
    }
    await OkxAdapter.ensureInstrumentsLoaded();
    return this.normalizeOrders(allOrders, key);
  }

  public async getHistoryOrders(key: any, start?: number, end?: number): Promise<import('../../types').UnifiedOrder[]> {
    const instTypes = ['SWAP', 'FUTURES', 'SPOT', 'MARGIN'];
    let allOrders: any[] = [];

    // Query both "/api/v5/trade/orders-history" (active last 7 days) and 
    // "/api/v5/trade/orders-history-archive" (older than 7 days) to ensure
    // newly closed/canceled orders are immediately fetched, and older history is preserved.
    for (const instType of instTypes) {
      const endpoints = ['/api/v5/trade/orders-history', '/api/v5/trade/orders-history-archive'];

      for (const endpoint of endpoints) {
        let queryUrl = `instType=${instType}&limit=100`;
        if (endpoint === '/api/v5/trade/orders-history-archive') {
          if (start) queryUrl += `&begin=${start}`;
          if (end) queryUrl += `&end=${end}`;
        }

        const path = `${endpoint}?${queryUrl}`;

        try {
          const headers = await OkxAdapter.getHeaders(key.apiKey, key.apiSecret, key.passphrase || '', 'GET', path);
          const res = await proxyFetch({ targetUrl: `https://www.okx.com${path}`, method: 'GET', headers });
          if (res.code === '0' && res.data) {
            let filtered = res.data;
            if (start && end) {
              filtered = filtered.filter((o: any) => {
                const uTime = parseInt(o.uTime || '0', 10);
                return uTime >= start && uTime <= end;
              });
            }
            allOrders = allOrders.concat(filtered);
          }
        } catch (err) {
          console.warn(`[Okx-HistoryOrders] Error fetching ${instType} from ${endpoint}:`, err);
        }
      }
    }

    // De-duplicate orders by unique OKX order ID (ordId)
    const seenOrdIds = new Set<string>();
    const uniqueOrders: any[] = [];
    for (const o of allOrders) {
      if (!seenOrdIds.has(o.ordId)) {
        seenOrdIds.add(o.ordId);
        uniqueOrders.push(o);
      }
    }

    await OkxAdapter.ensureInstrumentsLoaded();
    return this.normalizeOrders(uniqueOrders, key);
  }

  private normalizeOrders(rawOrders: any[], key: any): import('../../types').UnifiedOrder[] {
    return rawOrders.map(o => {
      let status: import('../../types').UnifiedOrderStatus = 'NEW';
      const state = o.state?.toLowerCase() || '';
      if (state === 'filled') status = 'FILLED';
      else if (state === 'canceled' || state === 'cancelled') status = 'CANCELLED';
      else if (state === 'partially_filled') status = 'PARTIALLY_FILLED';
      else if (state === 'live') status = 'NEW';


      let type: import('../../types').UnifiedOrderType = 'LIMIT';
      const ot = o.ordType?.toLowerCase() || '';
      if (ot === 'market') type = 'MARKET';
      else if (ot.includes('stop') || ot.includes('loss')) type = 'SL';
      else if (ot.includes('take') || ot.includes('profit')) type = 'TP';
      else if (ot.includes('conditional')) type = 'CONDITIONAL';

      const sz = parseFloat(o.sz || '0');
      const accFillSz = parseFloat(o.accFillSz || '0');
      const px = parseFloat(o.px || o.avgPx || '0');

      let qty = sz;
      let filledQty = accFillSz;
      let value = sz * px;

      const isDerivative = o.instType === 'SWAP' || o.instType === 'FUTURES' || o.instId?.includes('-SWAP') || o.instId?.split('-').length >= 3;
      if (isDerivative) {
        const instInfo = OkxAdapter.cachedInstruments[o.instId];
        if (instInfo) {
          const ctVal = parseFloat(instInfo.ctVal || '1');
          const ctType = instInfo.ctType || 'linear';
          if (ctType === 'inverse') {
            qty = sz * ctVal;
            filledQty = accFillSz * ctVal;
            value = sz * ctVal;
          } else {
            qty = sz * ctVal;
            filledQty = accFillSz * ctVal;
            value = qty * px;
          }
        }
      }

      return {
        id: `${key.id}-${o.ordId}`,
        exchangeOrderId: o.ordId,
        connectionId: key.id,
        exchange: 'okx',
        label: key.label,
        symbol: o.instId,
        category: mapInstrumentType('okx', o.instType || 'SWAP', o.ccy || 'USDT'),
        side: o.side?.toLowerCase() === 'sell' ? 'sell' : 'buy',
        positionSide: o.posSide?.toLowerCase() === 'long' ? 'long' : o.posSide?.toLowerCase() === 'short' ? 'short' : 'net',
        type,
        status,
        price: parseFloat(o.px || '0'),
        avgPrice: parseFloat(o.avgPx || '0'),
        qty,
        filledQty,
        value,
        triggerPrice: o.tpTriggerPx ? parseFloat(o.tpTriggerPx) : o.slTriggerPx ? parseFloat(o.slTriggerPx) : undefined,
        timeInForce: o.notionalUsd || undefined, // OKX specific fallback, they don't always expose timeInForce directly here 
        createdTime: parseInt(o.cTime || '0', 10),
        updatedTime: parseInt(o.uTime || o.cTime || '0', 10),
        fees: parseFloat(o.fee || '0'),
        leverage: parseFloat(o.lever || '0'),
        raw: o
      };
    });
  }

  private static cachedInstruments: Record<string, any> = {};
  private static cachedInstrumentsTime: number = 0;

  private static async ensureInstrumentsLoaded() {
    if (Object.keys(this.cachedInstruments).length > 0 && Date.now() - this.cachedInstrumentsTime < 1000 * 60 * 60) {
      return;
    }
    try {
      const types = ['SWAP', 'FUTURES'];
      const allInsts: Record<string, any> = {};
      await Promise.all(types.map(async (instType) => {
        const res = await proxyFetch({
          targetUrl: `https://www.okx.com/api/v5/public/instruments?instType=${instType}`,
          method: 'GET',
          headers: {}
        });
        if (res && res.code === '0' && res.data) {
          res.data.forEach((inst: any) => {
            if (inst.instId) {
              allInsts[inst.instId] = inst;
            }
          });
        }
      }));
      this.cachedInstruments = allInsts;
      this.cachedInstrumentsTime = Date.now();
      console.log(`[OKX-Adapter] Loaded ${Object.keys(allInsts).length} SWAP & FUTURES instruments into cache.`);
    } catch (err) {
      console.warn('[OKX-Adapter] Error caching instruments:', err);
    }
  }

  private static cachedSwapInstruments: any[] | null = null;
  private static cachedSwapInstrumentsTime: number = 0;

  // Instrument Metadata (Public)
  public async fetchInstrumentMetadata(symbol: string): Promise<import('../../types').UnifiedAssetCategory | 'NOT_FOUND'> {
    try {
      // Cache the full list of OKX SWAP instruments for exactly 1 hour
      if (!OkxAdapter.cachedSwapInstruments || Date.now() - OkxAdapter.cachedSwapInstrumentsTime > 1000 * 60 * 60) {
        const res = await proxyFetch({
          targetUrl: `https://www.okx.com/api/v5/public/instruments?instType=SWAP`,
          method: 'GET',
          headers: {}
        });
        if (res.code === '0' && res.data) {
          OkxAdapter.cachedSwapInstruments = res.data;
          OkxAdapter.cachedSwapInstrumentsTime = Date.now();
        }
      }

      if (OkxAdapter.cachedSwapInstruments) {
        // Replace standard quote coin variations to isolate the base asset
        // We might receive "NVDA", "NVDA-USDT", "BTC"
        const normalizedSymbol = symbol.replace(/USDT$|USDC$|USD$|-USDT$|-USD$|-USDC$/, '');

        const info = OkxAdapter.cachedSwapInstruments.find((inst: any) => {
          // instFamily is like "NVDA-USDT", "BTC-USD"
          if (inst.instFamily === `${normalizedSymbol}-USDT` || inst.instFamily === `${normalizedSymbol}-USDC` || inst.instFamily === `${normalizedSymbol}-USD`) return true;
          if (inst.uly === `${normalizedSymbol}-USDT` || inst.uly === `${normalizedSymbol}-USDC` || inst.uly === `${normalizedSymbol}-USD`) return true;
          if (inst.instFamily && inst.instFamily.startsWith(normalizedSymbol + '-')) return true;
          return false;
        });

        if (info) {
          if (info.instCategory === '3') return 'STOCK';
          if (info.instCategory === '1') return 'CRYPTO';
          return 'CRYPTO';
        }
      }
    } catch (err) {
      console.warn('[OKX-Metadata] Fetch error:', err);
    }
    return 'NOT_FOUND';
  }

}
