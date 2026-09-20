import Big from 'big.js';
import { UnifiedPosition, UnifiedHistoryPosition, UnifiedBillRecord, UnifiedBalance } from '../../types';
import { IExchangeAdapter } from './IExchangeAdapter';
import { BaseExchangeAdapter } from './BaseExchangeAdapter';
import { ApiCredentials } from '../../store/apiKeysStore';
import { proxyFetch } from '../../utils/proxyFetch';
import { hmacSha256 } from '../../utils/cryptoLib';
import { LogManager } from '../LogManager';
import { calculateRoe } from '../../utils/math-crypto';
import { mapInstrumentType } from '../../utils/instrumentTypeMapper';
import { mapPositionSide, mapMarginMode, extractBaseCoin, extractQuoteCoin, extractCcy } from '../../utils/unifiers';
import { calculateOkxTradeDetails } from '../../utils/okxUtils';

const MAX_DEEP_PAGES = 30;

export class OkxAdapter extends BaseExchangeAdapter implements IExchangeAdapter {
  static _timeSyncUrl = 'https://www.okx.com/api/v5/public/time';
  static _parseTimeResponse(data: any): number | null {
    if (data?.code === '0' && data.data?.[0]?.ts) {
      return parseInt(data.data[0].ts, 10);
    }
    return null;
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
  public async getBalance(key: ApiCredentials): Promise<UnifiedBalance[]> {
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

    // Fetch Funding balances
    let fundingData: any[] = [];
    try {
      const fundingPath = '/api/v5/asset/balances';
      const fundingHeaders = await OkxAdapter.getHeaders(key.apiKey, key.apiSecret, key.passphrase || '', 'GET', fundingPath);
      const fundingResponse = await proxyFetch({
        targetUrl: `https://www.okx.com${fundingPath}`,
        method: 'GET',
        headers: fundingHeaders
      });
      if (fundingResponse && fundingResponse.code === '0' && fundingResponse.data) {
        fundingData = fundingResponse.data;
      } else if (fundingResponse && fundingResponse.code && fundingResponse.code !== '0') {
        LogManager.warn('OKXAdapter.Balance', `Funding balance API warning (${fundingResponse.code}): ${fundingResponse.msg}`);
      }
    } catch (err) {
      LogManager.warn('OKXAdapter.Balance', 'Failed to fetch OKX funding balances:', err);
    }

    // Build price map from trading balance details
    const prices: Record<string, number> = {};
    data.details.forEach((item: any) => {
      const ccy = item.ccy.toUpperCase();
      const cashBal = parseFloat(item.cashBal || '0');
      const eqUsd = parseFloat(item.eqUsd || '0');
      const eq = parseFloat(item.eq || '0');
      let price = 0;
      if (eq > 0) {
        price = eqUsd / eq;
      } else if (cashBal > 0) {
        price = eqUsd / cashBal;
      }
      if (price > 0) {
        prices[ccy] = price;
      }
    });

    // Default prices for stablecoins
    const stables = ['USDT', 'USDC', 'USD', 'DAI', 'EURT', 'BUSD', 'USDE', 'USDD'];
    stables.forEach(s => {
      if (prices[s] === undefined) {
        prices[s] = 1.0;
      }
    });

    // Calculate additional funding equity
    let additionalFundingUsd = 0;
    const fundingBalances: UnifiedBalance[] = [];

    fundingData.forEach((item: any) => {
      const ccy = item.ccy.toUpperCase();
      const amount = parseFloat(item.bal || '0');
      if (amount <= 0) return;

      const price = prices[ccy] || 0;
      const usdValue = amount * price;
      additionalFundingUsd += usdValue;

      fundingBalances.push({
        id: `${key.id}-FUNDING-${ccy}`,
        connectionId: key.id,
        exchange: 'okx' as const,
        label: key.label,
        ccy,
        amount,
        usdValue,
        raw: item
      });
    });

    const baseTotalEquity = parseFloat(data.totalEq || '0');
    const baseWalletBalance = parseFloat(data.adjEq || '0');
    const availableMargin = parseFloat(data.availEq || '0');
    const unrealizedPnl = parseFloat(data.upl || '0');

    const totalEquity = baseTotalEquity + additionalFundingUsd;
    const walletBalance = baseWalletBalance + additionalFundingUsd;

    // Map trading balances with updated totalEquity and walletBalance
    const tradingBalances = data.details.map((item: any) => {
      const ccy = item.ccy.toUpperCase();
      const rawCashBal = parseFloat(item.cashBal || '0');
      const rawEq = parseFloat(item.eq || '0');
      const rawEqUsd = parseFloat(item.eqUsd || '0');
      const coinUsdPrice = parseFloat(item.coinUsdPrice || '0');

      let coinPrice = coinUsdPrice > 0 ? coinUsdPrice : (prices[ccy] || 0);
      if (coinPrice <= 0 && rawEq > 0 && rawEqUsd > 0) {
        coinPrice = rawEqUsd / rawEq;
      } else if (coinPrice <= 0 && rawCashBal > 0 && rawEqUsd > 0) {
        coinPrice = rawEqUsd / rawCashBal;
      }

      const walletBalCoin = rawCashBal;
      const walletBalUsd = coinPrice > 0 ? walletBalCoin * coinPrice : (rawEqUsd > 0 ? rawEqUsd : walletBalCoin);

      return {
        id: `${key.id}-UNIFIED-${ccy}`,
        connectionId: key.id,
        exchange: 'okx' as const,
        label: key.label,
        ccy,
        amount: walletBalCoin,
        usdValue: walletBalUsd,
        totalEquity: rawEq > 0 ? rawEq : (ccy === 'USDT' && totalEquity > 0 ? totalEquity : walletBalCoin),
        walletBalance: walletBalCoin,
        availableMargin,
        unrealizedPnl,
        raw: {
          ...item,
          equity: rawEq > 0 ? rawEq : walletBalCoin,
          usdValue: rawEqUsd > 0 ? rawEqUsd : walletBalUsd,
          accountMetrics: { totalEquity, walletBalance, availableMargin, unrealizedPnl }
        }
      };
    });

    // Set updated values on funding balances
    fundingBalances.forEach((fb) => {
      fb.totalEquity = totalEquity;
      fb.walletBalance = walletBalance;
      fb.availableMargin = availableMargin;
      fb.unrealizedPnl = unrealizedPnl;
    });

    return [...tradingBalances, ...fundingBalances];
  }

  // REST Positions
  public async getOpenPositions(key: ApiCredentials): Promise<UnifiedPosition[]> {
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

      let tp: number | undefined = pos.tpTriggerPx && parseFloat(pos.tpTriggerPx) > 0 ? parseFloat(pos.tpTriggerPx) : undefined;
      let sl: number | undefined = pos.slTriggerPx && parseFloat(pos.slTriggerPx) > 0 ? parseFloat(pos.slTriggerPx) : undefined;
      let tpMode: 'full' | 'partial' | undefined = undefined;
      let slMode: 'full' | 'partial' | undefined = undefined;

      if (Array.isArray(pos.closeOrderAlgo) && pos.closeOrderAlgo.length > 0) {
        for (const algo of pos.closeOrderAlgo) {
          if (algo.tpTriggerPx && parseFloat(algo.tpTriggerPx) > 0) {
            tp = parseFloat(algo.tpTriggerPx);
            tpMode = (algo.closeFraction === '1' || algo.closeFraction === '1.0' || !algo.closeFraction) ? 'full' : 'partial';
          }
          if (algo.slTriggerPx && parseFloat(algo.slTriggerPx) > 0) {
            sl = parseFloat(algo.slTriggerPx);
            slMode = (algo.closeFraction === '1' || algo.closeFraction === '1.0' || !algo.closeFraction) ? 'full' : 'partial';
          }
        }
      }
      if (tp && !tpMode) tpMode = 'full';
      if (sl && !slMode) slMode = 'full';

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
        tp,
        sl,
        tpMode,
        slMode,
        roe: pos.uplRatio ? parseFloat(pos.uplRatio) * 100 : (margin > 0 ? (unrealizedPnl / margin) * 100 : undefined),
        instrumentType: mapInstrumentType('okx', pos.instType || 'SWAP', pos.ccy || pos.marginCoin || 'USDT'),
        raw: pos
      };
    });
  }

  // REST Closed PnL History
  public async fetchAndNormalize(key: ApiCredentials, start?: number, end?: number): Promise<UnifiedHistoryPosition[]> {
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
        LogManager.warn('OKXAdapter.History', `Error for ${type}:`, err);
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
  public async fetchBills(key: ApiCredentials, start?: number, end?: number): Promise<UnifiedBillRecord[]> {
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
        LogManager.warn('OKXAdapter.Bills', `Error for ${type}:`, err);
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
  public async getOpenOrders(key: ApiCredentials): Promise<import('../../types').UnifiedOrder[]> {
    const instTypes = ['SWAP', 'FUTURES', 'SPOT', 'MARGIN'];
    let allOrders: any[] = [];

    // 1. Regular Pending Orders
    for (const instType of instTypes) {
      const query = `instType=${instType}&limit=100`;
      const path = `/api/v5/trade/orders-pending?${query}`;
      const headers = await OkxAdapter.getHeaders(key.apiKey, key.apiSecret, key.passphrase || '', 'GET', path);

      try {
        const res = await proxyFetch({ targetUrl: `https://www.okx.com${path}`, method: 'GET', headers });
        if (res.code === '0' && res.data) {
          allOrders = allOrders.concat(res.data);
        }
      } catch (err) {
        LogManager.warn('OKXAdapter.OpenOrders', `Error fetching ${instType}:`, err);
      }
    }

    // 2. Algo Pending Orders (TP/SL, OCO, Trigger, Trailing)
    for (const instType of instTypes) {
      for (const ordType of ['conditional,oco', 'trigger', 'move_order_stop']) {
        const path = `/api/v5/trade/orders-algo-pending?instType=${instType}&ordType=${ordType}&limit=100`;
        const headers = await OkxAdapter.getHeaders(key.apiKey, key.apiSecret, key.passphrase || '', 'GET', path);

        try {
          const res = await proxyFetch({ targetUrl: `https://www.okx.com${path}`, method: 'GET', headers });
          if (res.code === '0' && res.data) {
            allOrders = allOrders.concat(res.data.map((o: any) => ({ ...o, isAlgo: true })));
          }
        } catch (err) {
          LogManager.warn('OKXAdapter.AlgoOrders', `Error fetching ${instType} algo (${ordType}):`, err);
        }
      }
    }

    await OkxAdapter.ensureInstrumentsLoaded();
    return this.normalizeOrders(allOrders, key);
  }

  public async getHistoryOrders(key: ApiCredentials, start?: number, end?: number): Promise<import('../../types').UnifiedOrder[]> {
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
          LogManager.warn('OKXAdapter.HistoryOrders', `Error fetching ${instType} from ${endpoint}:`, err);
        }
      }

      // Also query historical algo orders (TP/SL, trigger, OCO)
      for (const state of ['effective', 'canceled']) {
        const path = `/api/v5/trade/orders-algo-history?instType=${instType}&ordType=conditional,oco&state=${state}&limit=100`;
        try {
          const headers = await OkxAdapter.getHeaders(key.apiKey, key.apiSecret, key.passphrase || '', 'GET', path);
          const res = await proxyFetch({ targetUrl: `https://www.okx.com${path}`, method: 'GET', headers });
          if (res.code === '0' && res.data) {
            allOrders = allOrders.concat(res.data.map((o: any) => ({ ...o, isAlgo: true })));
          }
        } catch (err) {
          LogManager.warn('OKXAdapter.AlgoHistory', `Error fetching ${instType} algo history (${state}):`, err);
        }
      }
    }

    // De-duplicate orders by unique OKX order ID (ordId or algoId)
    const seenOrdIds = new Set<string>();
    const uniqueOrders: any[] = [];
    for (const o of allOrders) {
      const id = o.ordId || o.algoId || o.clOrdId;
      if (id && !seenOrdIds.has(id)) {
        seenOrdIds.add(id);
        uniqueOrders.push(o);
      }
    }

    await OkxAdapter.ensureInstrumentsLoaded();
    return this.normalizeOrders(uniqueOrders, key);
  }

  private normalizeOrders(rawOrders: any[], key: ApiCredentials): import('../../types').UnifiedOrder[] {
    return rawOrders.map(o => {
      let status: import('../../types').UnifiedOrderStatus = 'NEW';
      const state = (o.state || '').toLowerCase();
      if (state === 'filled' || state === 'effective') status = 'FILLED';
      else if (state === 'canceled' || state === 'cancelled') status = 'CANCELLED';
      else if (state === 'partially_filled' || state === 'partially_effective') status = 'PARTIALLY_FILLED';
      else if (state === 'live' || state === 'pause') status = 'NEW';
      else if (state === 'order_failed') status = 'REJECTED';

      let type: import('../../types').UnifiedOrderType = 'LIMIT';
      let executionScope: import('../../types').OrderExecutionScope | undefined = undefined;
      let closeFraction: number | undefined = undefined;
      let tpTriggerPrice: number | undefined = undefined;
      let slTriggerPrice: number | undefined = undefined;
      let isPositionTpsl: boolean | undefined = undefined;

      const ot = (o.ordType || '').toLowerCase();
      const hasTp = !!(o.tpTriggerPx && parseFloat(o.tpTriggerPx) > 0);
      const hasSl = !!(o.slTriggerPx && parseFloat(o.slTriggerPx) > 0);

      if (hasTp) tpTriggerPrice = parseFloat(o.tpTriggerPx);
      if (hasSl) slTriggerPrice = parseFloat(o.slTriggerPx);

      if (ot === 'oco' || (hasTp && hasSl)) {
        type = 'OCO';
      } else if (hasTp || ot.includes('take') || ot.includes('profit')) {
        type = 'TP';
      } else if (hasSl || ot.includes('stop') || ot.includes('loss')) {
        type = 'SL';
      } else if (ot === 'move_order_stop') {
        type = 'TRAILING_STOP';
      } else if (ot === 'market') {
        type = 'MARKET';
      } else if (ot.includes('conditional') || ot === 'trigger') {
        type = 'CONDITIONAL';
      }

      if (o.closeFraction) {
        isPositionTpsl = true;
        const frac = parseFloat(o.closeFraction);
        if (frac >= 1 || o.closeFraction === '1') {
          executionScope = 'FULL_POSITION';
          closeFraction = 1;
        } else {
          executionScope = 'PARTIAL';
          closeFraction = frac;
        }
      } else if (type === 'TP' || type === 'SL' || type === 'OCO') {
        if (o.reduceOnly === 'true' || o.reduceOnly === true) {
          isPositionTpsl = true;
          executionScope = 'PARTIAL';
        }
      }

      const trigPx = o.triggerPx
        ? parseFloat(o.triggerPx)
        : (type === 'TP' ? tpTriggerPrice : type === 'SL' ? slTriggerPrice : (tpTriggerPrice || slTriggerPrice));

      const sz = parseFloat(o.sz || o.actualSz || '0');
      const accFillSz = parseFloat(o.accFillSz || '0');
      const px = parseFloat(o.px || o.ordPx || o.tpOrdPx || o.slOrdPx || o.avgPx || '0');

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

      const orderId = String(o.ordId || o.algoId || o.clOrdId || '');

      return {
        id: `${key.id}-${orderId}`,
        exchangeOrderId: orderId,
        connectionId: key.id,
        exchange: 'okx',
        label: key.label,
        symbol: o.instId,
        category: mapInstrumentType('okx', o.instType || 'SWAP', o.ccy || 'USDT'),
        side: (o.side || '').toLowerCase() === 'sell' ? 'sell' : 'buy',
        positionSide: o.posSide?.toLowerCase() === 'long' ? 'long' : o.posSide?.toLowerCase() === 'short' ? 'short' : 'net',
        type,
        status,
        price: px,
        avgPrice: parseFloat(o.avgPx || '0'),
        qty,
        filledQty,
        value,
        triggerPrice: trigPx,
        executionScope,
        closeFraction,
        tpTriggerPrice,
        slTriggerPrice,
        isPositionTpsl,
        reduceOnly:
          o.reduceOnly === 'true' ||
          o.reduceOnly === true ||
          !!o.closeFraction ||
          isPositionTpsl === true,
        timeInForce: o.notionalUsd || undefined,
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
      LogManager.info('OKXAdapter', `Loaded ${Object.keys(allInsts).length} SWAP & FUTURES instruments into cache.`);
    } catch (err) {
      LogManager.warn('OKXAdapter', 'Error caching instruments:', err);
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
      LogManager.warn('OKXAdapter.Metadata', 'Fetch error:', err);
    }
    return 'NOT_FOUND';
  }

  // ── Transaction Log (OKX Account Bills) ──
  public async getTransactionLog(
    key: ApiCredentials,
    startTime: number,
    endTime: number,
    category: string = '',
    cursor?: string
  ): Promise<{ list: any[]; nextPageCursor: string }> {
    await OkxAdapter.ensureInstrumentsLoaded().catch(() => {});

    const query = new URLSearchParams();
    if (category) query.append('instType', category);
    if (startTime) query.append('begin', startTime.toString());
    if (endTime) query.append('end', endTime.toString());
    query.append('limit', '100');
    if (cursor) query.append('after', cursor);

    // Try recent bills first
    let path = `/api/v5/account/bills?${query.toString()}`;
    let headers = await OkxAdapter.getHeaders(key.apiKey, key.apiSecret, key.passphrase || '', 'GET', path);
    let res = await proxyFetch({ targetUrl: `https://www.okx.com${path}`, method: 'GET', headers });

    // If recent bills is empty and startTime is more than 7 days ago, try bills-archive
    const isOlderThan7Days = Date.now() - startTime > 7 * 24 * 60 * 60 * 1000;
    if ((!res.data || res.data.length === 0) && isOlderThan7Days) {
      path = `/api/v5/account/bills-archive?${query.toString()}`;
      headers = await OkxAdapter.getHeaders(key.apiKey, key.apiSecret, key.passphrase || '', 'GET', path);
      res = await proxyFetch({ targetUrl: `https://www.okx.com${path}`, method: 'GET', headers });
    }

    if (res.code && res.code !== '0') {
      throw new Error(`OKX bills API error (${res.code}): ${res.msg}`);
    }

    const list = res.data || [];
    // In OKX, 'after' cursor is the billId of the last record when pagination has more
    const nextPageCursor = list.length >= 100 ? (list[list.length - 1]?.billId || '') : '';

    return {
      list,
      nextPageCursor,
    };
  }

  public static normalizeTxLogEntry(raw: any, key: ApiCredentials): import('../../types').OkxTransactionLogEntry {
    const transactionTime = parseInt(raw.ts || '0', 10);
    const amount = raw.sz || raw.balChg || '0';
    const fee = raw.fee || '0';
    const balance = raw.bal || '0';
    const positionBalance = raw.posBal || '0';

    // Side normalization
    let normalizedSide = 'None';
    const subTypeCode = String(raw.subType || '').trim();
    if (subTypeCode === '1') normalizedSide = 'Buy';
    else if (subTypeCode === '2') normalizedSide = 'Sell';
    else if (subTypeCode === '3') normalizedSide = 'Open Long';
    else if (subTypeCode === '4') normalizedSide = 'Open Short';
    else if (subTypeCode === '5') normalizedSide = 'Close Long';
    else if (subTypeCode === '6') normalizedSide = 'Close Short';
    else if (raw.side) {
      const rs = String(raw.side).toLowerCase();
      if (rs.includes('buy') || rs.includes('long') || rs.includes('in')) normalizedSide = 'Buy';
      else if (rs.includes('sell') || rs.includes('short') || rs.includes('out')) normalizedSide = 'Sell';
    }

    // Trade price, contracts, qty, size normalization
    const tradePrice = String(raw.px || raw.price || raw.avgPrice || raw.fillPx || raw.fillPrice || '0');
    
    // Calculate accurate contract & crypto values
    const tradeDetails = calculateOkxTradeDetails({
      symbol: raw.instId,
      category: raw.instType,
      sz: raw.sz,
      tradePrice,
      currency: raw.ccy,
      raw,
      cachedInsts: OkxAdapter.cachedInstruments
    });

    const qty = tradeDetails.isDerivative
      ? String(tradeDetails.cryptoQty)
      : String(raw.sz || raw.amount || raw.qty || raw.fillSz || raw.fillSize || '0');
    const size = tradeDetails.isDerivative
      ? String(tradeDetails.cryptoQty)
      : String(raw.sz || raw.amount || raw.qty || raw.fillSz || raw.fillSize || '0');
    const contracts = tradeDetails.isDerivative ? String(tradeDetails.contracts) : undefined;
    const contractVal = tradeDetails.isDerivative ? String(tradeDetails.ctVal) : undefined;
    const cryptoQty = String(tradeDetails.cryptoQty);
    const totalValueUsd = tradeDetails.totalValueUsd > 0 ? String(tradeDetails.totalValueUsd) : undefined;

    // Funding mapping (type 8 is funding fee)
    const isFunding = String(raw.type || '') === '8';
    const funding = isFunding ? String(raw.balChg || '0') : '0';

    return {
      id: `${key.id}-${raw.billId || transactionTime}-${transactionTime}`,
      connectionId: key.id,
      exchange: 'okx',
      label: key.label,
      rawId: String(raw.billId || ''),
      billId: String(raw.billId || ''),
      symbol: raw.instId || '',
      category: raw.instType || 'OTHER',
      side: normalizedSide,
      type: raw.type ? String(raw.type) : '',
      transSubType: raw.subType ? String(raw.subType) : '',
      subType: raw.subType ? String(raw.subType) : '',
      typeCode: raw.type ? String(raw.type) : '',
      subTypeCode: raw.subType ? String(raw.subType) : '',
      qty,
      size,
      contracts,
      contractVal,
      cryptoQty,
      totalValueUsd,
      currency: raw.ccy || '',
      tradePrice,
      funding,
      amount: String(amount),
      change: String(raw.balChg || amount),
      cashFlow: String(raw.balChg || amount),
      cashBalance: String(balance),
      balance: String(balance),
      fee: String(fee),
      feeCurrency: raw.ccy || '',
      positionBalance: String(positionBalance),
      transactionTime,
      tradeId: raw.tradeId || '',
      orderId: raw.ordId || '',
      orderLinkId: raw.clOrdId || '',
      pnl: String(raw.pnl || '0'),
      extra: raw.notes || raw.execType || undefined,
      raw,
    };
  }
}
