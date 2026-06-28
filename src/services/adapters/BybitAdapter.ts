import Big from 'big.js';
import { UnifiedPosition, UnifiedHistoryPosition, UnifiedBillRecord, UnifiedBalance, UnifiedPositionMode, UnifiedMarginMode } from '../../types';
import { IExchangeAdapter } from './IExchangeAdapter';
import { proxyFetch, hybridFetch } from '../../utils/proxyFetch';
import { hmacSha256 } from '../../utils/cryptoLib';
import { useDashboardStore } from '../../store/dashboardStore';
import { calculateRoe } from '../../utils/math-crypto';
import { mapInstrumentType } from '../../utils/instrumentTypeMapper';
import { mapPositionSide, mapMarginMode, extractBaseCoin, extractQuoteCoin, extractCcy } from '../../utils/unifiers';

const MAX_DEEP_PAGES = 30;

export class BybitAdapter implements IExchangeAdapter {
  static timeOffset = 0;
  static lastSyncTime = 0;

  static async syncTime() {
    if (Date.now() - this.lastSyncTime < 300000) return;
    try {
      const targetUrl = 'https://api.bybit.com/v5/market/time';
      let data;
      try {
        const res = await fetch(targetUrl, { method: 'GET' });
        if (res.ok) data = await res.json();
        else throw new Error();
      } catch {
        data = await proxyFetch({ targetUrl, method: 'GET', headers: {} });
      }

      if (data && data.retCode === 0 && data.result?.timeSecond) {
        this.timeOffset = parseInt(data.result.timeSecond, 10) * 1000 - Date.now();
        this.lastSyncTime = Date.now();
        console.log(`[Time-Sync] Bybit synced. Offset: ${this.timeOffset}ms`);
      }
    } catch (e) {
      console.error('[Time-Sync] Bybit time sync error:', e);
    }
  }

  public static async getHeaders(apiKey: string, apiSecret: string, query: string = ''): Promise<Record<string, string>> {
    await this.syncTime();
    const timestamp = (Date.now() + this.timeOffset).toString();
    const recvWindow = '20000';
    const prehash = timestamp + apiKey + recvWindow + query;
    const signature = await hmacSha256(prehash, apiSecret, 'hex');

    return {
      'X-BAPI-API-KEY': apiKey,
      'X-BAPI-SIGN': signature,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': recvWindow,
    };
  }


  // REST Balances
  public async getBalance(key: any): Promise<UnifiedBalance[]> {
    const query = 'accountType=UNIFIED';
    const targetUrl = `https://api.bybit.com/v5/account/wallet-balance?${query}`;
    const headers = await BybitAdapter.getHeaders(key.apiKey, key.apiSecret, query);
    
    const response = await hybridFetch(targetUrl, 'GET', headers);
    if (response.retCode !== 0) {
      throw new Error(`Bybit balance API Error (${response.retCode}): ${response.retMsg}`);
    }

    const wallet = response.result?.list?.[0];
    if (!wallet || !wallet.coin) return [];

    return wallet.coin.map((item: any) => ({
      id: `${key.id}-UNIFIED-${item.coin}`,
      connectionId: key.id,
      exchange: 'bybit',
      label: `${key.label} (UNIFIED)`,
      ccy: item.coin,
      amount: parseFloat(item.walletBalance || item.equity || '0'),
      usdValue: parseFloat(item.usdValue || '0'),
      totalEquity: parseFloat(wallet.totalEquity || '0'),
      walletBalance: parseFloat(wallet.totalWalletBalance || '0'),
      availableMargin: parseFloat(wallet.totalAvailableBalance || '0'),
      unrealizedPnl: parseFloat(wallet.totalPerpUPL || '0'),
      raw: item
    }));
  }

  // REST Positions
  public async getOpenPositions(key: any): Promise<UnifiedPosition[]> {
    let accountMarginMode: UnifiedMarginMode = 'unknown';
    try {
      const accUrl = `https://api.bybit.com/v5/account/info`;
      const accHeaders = await BybitAdapter.getHeaders(key.apiKey, key.apiSecret);
      const accRes = await hybridFetch(accUrl, 'GET', accHeaders);
      if (accRes?.retCode === 0 && accRes?.result?.marginMode) {
        const mm = accRes.result.marginMode;
        if (mm === 'ISOLATED_MARGIN') accountMarginMode = 'isolated';
        else if (mm === 'REGULAR_MARGIN' || mm === 'PORTFOLIO_MARGIN') accountMarginMode = 'cross';
      }
    } catch (err) {
      console.warn('[Bybit-AccountInfo]', err);
    }

    const categories = ['linear', 'inverse'];
    const requests = categories.map(async (category) => {
      const query = `category=${category}&limit=200`;
      const targetUrl = `https://api.bybit.com/v5/position/list?${query}`;
      const headers = await BybitAdapter.getHeaders(key.apiKey, key.apiSecret, query);
      const response = await hybridFetch(targetUrl, 'GET', headers);

      if (response.retCode === 10001) return []; // "position idx not match position mode" generic catch
      if (response.retCode !== 0) throw new Error(response.retMsg);

      // Bybit category value came in the result object so we need to inject it in the list object to be returned
      const list = response.result?.list || [];
      return list.map(position => ({
        ...position,
        category: category
      }));
    });

    const results = await Promise.all(requests);
    const rawList = results.flat();

    const mappedPositions = await Promise.all(
      rawList
        .filter(pos => parseFloat(pos.size || '0') > 0)
        .map(pos => this.mapPosition(pos, key, accountMarginMode))
    );

    return mappedPositions;
  }

  public async fetchBybitRealPnLBySymbol(
    key: any, 
    startTime: number, 
    endTime: number,
    onProgress?: (msg: string) => void
  ): Promise<Record<string, string>> {
    const symbolPnL: Record<string, Big> = {};
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const categories = ['linear', 'inverse'];

    try {
      for (const category of categories) {
        let catStart = startTime;
        while (catStart < endTime) {
          let catEnd = catStart + SEVEN_DAYS_MS;
          if (catEnd > endTime) catEnd = endTime;

          if (onProgress) {
            onProgress(`Aguarde: sincronizando Bybit ${category} (${key.label})...`);
          }

          const queryUrl = `limit=50&category=${category}&startTime=${catStart}&endTime=${catEnd}`;
          const targetUrl = `https://api.bybit.com/v5/account/transaction-log?${queryUrl}`;
          const headers = await BybitAdapter.getHeaders(key.apiKey, key.apiSecret, queryUrl);
          
          let cursor = '';
          let pages = 0;
          const MAX_PAGES = 20; // 1000 tx per 7-day chunk max
          do {
             let thisQuery = queryUrl;
             if (cursor) thisQuery += `&cursor=${cursor}`;
             const thisTargetUrl = `https://api.bybit.com/v5/account/transaction-log?${thisQuery}`;
             const thisHeaders = await BybitAdapter.getHeaders(key.apiKey, key.apiSecret, thisQuery);
             
             const res = await hybridFetch(thisTargetUrl, 'GET', thisHeaders);
             if (res.retCode !== 0) break;

             const list = res.result?.list || [];
             for (const item of list) {
                if (!item.symbol) continue;
                if (['TRADE', 'SETTLEMENT', 'LIQUIDATION', 'DELIVERY'].includes(item.type)) {
                   if (!symbolPnL[item.symbol]) symbolPnL[item.symbol] = new Big(0);
                   if (item.cashFlow) {
                      symbolPnL[item.symbol] = symbolPnL[item.symbol].plus(new Big(item.cashFlow || '0'));
                   }
                }
             }
             cursor = res.result?.nextPageCursor || '';
             pages++;
          } while (cursor && pages < MAX_PAGES);

          catStart = catEnd + 1;
        }
      }
    } catch (e) {
      console.warn(`[Bybit-RealPnL] Error fetching real PnL for ${key.label}:`, e);
    }
    
    const result: Record<string, string> = {};
    for (const [sym, val] of Object.entries(symbolPnL)) {
      result[sym] = val.toString();
    }
    return result;
  }

  private async fetchBybitAccumulatedFees(key: any, symbol: string, startTime: number): Promise<{ accumulatedFunding: string; accumulatedTradingFee: string }> {
    let accumulatedFunding = new Big(0);
    let accumulatedTradingFee = new Big(0);
    let currentStart = startTime;
    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const isInverse = symbol.endsWith('USD') && !symbol.includes('USDT') && !symbol.includes('USDC');
    const targetCategory = isInverse ? 'inverse' : 'linear';

    try {
      while (currentStart < now) {
        let currentEnd = currentStart + SEVEN_DAYS_MS;
        if (currentEnd > now) currentEnd = now;

        const queryUrl = `limit=50&category=${targetCategory}&symbol=${symbol}&startTime=${currentStart}&endTime=${currentEnd}`;
        const targetUrl = `https://api.bybit.com/v5/account/transaction-log?${queryUrl}`;
        const headers = await BybitAdapter.getHeaders(key.apiKey, key.apiSecret, queryUrl);
        
        let cursor = '';
        let pages = 0;
        const MAX_PAGES = 10;
        do {
           let thisQuery = queryUrl;
           if (cursor) thisQuery += `&cursor=${cursor}`;
           const thisTargetUrl = `https://api.bybit.com/v5/account/transaction-log?${thisQuery}`;
           const thisHeaders = await BybitAdapter.getHeaders(key.apiKey, key.apiSecret, thisQuery);
           
           const res = await hybridFetch(thisTargetUrl, 'GET', thisHeaders);
           if (res.retCode !== 0) break;

           const list = res.result?.list || [];
           for (const item of list) {
              if (item.symbol === symbol) {
                 if (item.type === 'SETTLEMENT' && item.funding) {
                    accumulatedFunding = accumulatedFunding.plus(new Big(item.funding || '0'));
                 }
                 if (item.type === 'TRADE' && item.fee) {
                    accumulatedTradingFee = accumulatedTradingFee.plus(new Big(item.fee || '0').times(-1));
                 }
              }
           }
           cursor = res.result?.nextPageCursor || '';
           pages++;
        } while (cursor && pages < MAX_PAGES);

        currentStart = currentEnd + 1;
      }
    } catch (e) {
      console.warn(`[Bybit-AccumulatedFees] Error fetching for ${symbol}:`, e);
    }
    return {
      accumulatedFunding: accumulatedFunding.toString(),
      accumulatedTradingFee: accumulatedTradingFee.toString()
    };
  }

  private async mapPosition(pos: any, key: any, accountMarginMode: UnifiedMarginMode = 'unknown'): Promise<UnifiedPosition> {
    const rawSize = parseFloat(pos.size || '0');
    const entryPrice = parseFloat(pos.avgPrice || pos.entryPrice || '0');
    const markPrice = parseFloat(pos.markPrice || '0');
    let size = rawSize;
    let notionalUsd = parseFloat(pos.positionValue || '0');
    
    const isInverse = pos.symbol?.endsWith('USD') && !pos.symbol.includes('USDT') && !pos.symbol.includes('USDC');
    if (isInverse) {
      size = parseFloat(pos.positionValue || '0');
      notionalUsd = rawSize;
    } else if (notionalUsd > 0 && entryPrice > 0) {
      size = notionalUsd / entryPrice;
    }

    const margin = parseFloat(pos.positionIMByMp || pos.positionIM || '0');
    const maintenanceMargin = parseFloat(pos.positionMMByMp || pos.positionMM || '0');
    const unrealizedPnl = parseFloat(pos.unrealisedPnl || '0');

    const positionIdx = parseInt(pos.positionIdx || '0', 10);
    const positionMode: UnifiedPositionMode = positionIdx === 0 ? 'one_way' : 'hedge';

    const marginObj = new Big(margin);
    const mmObj = new Big(maintenanceMargin);
    const uPnlObj = new Big(pos.unrealisedPnl || '0');
    const roe = marginObj.gt(0) ? Number(uPnlObj.div(marginObj).times(100)) : undefined;

    // Margin Ratio calculation: Maintenance Margin / Position Margin (Initial Margin) * 100
    const marginRatio = marginObj.gt(0) ? Number(mmObj.div(marginObj).times(100)) : undefined;

    const side = mapPositionSide('bybit', pos.side);
    
    let ccy = extractCcy('bybit', pos.settleCoin, undefined, pos.coin, pos.symbol);
    if (isInverse && ccy === 'USD') {
      ccy = extractBaseCoin('bybit', pos.symbol);
    }
    
    // We only fetch funding from transaction log for linear or inverse futures, mostly linear.
    const createdTime = parseInt(pos.createdTime || Date.now().toString(), 10);
    // Limit lookback of funding queries to at most the last 7 days to avoid rate-limiting / slow connections
    const maxLookbackMs = 7 * 24 * 60 * 60 * 1000;
    const effectiveStartTime = Math.max(createdTime, Date.now() - maxLookbackMs);
    const { accumulatedFunding, accumulatedTradingFee } = await this.fetchBybitAccumulatedFees(key, pos.symbol, effectiveStartTime);
    
    const realizedPnl = parseFloat(pos.curRealisedPnl || '0');
    const closedPnl = realizedPnl + parseFloat(accumulatedFunding) + parseFloat(accumulatedTradingFee);
    
    return {
      id: `${key.id}-bybit-${pos.symbol}-${side}`,
      connectionId: key.id,
      exchange: 'bybit',
      label: key.label,
      symbol: pos.symbol,
      baseCoin: extractBaseCoin('bybit', pos.symbol),
      quoteCoin: extractQuoteCoin('bybit', pos.symbol),
      ccy,
      side: mapPositionSide('bybit', pos.side),
      size,
      entryPrice,
      markPrice,
      unrealizedPnl,
      realizedPnl,
      closedPnl,
      accumulatedFunding,
      accumulatedTradingFee,
      leverage: parseFloat(pos.leverage || '0'),
      marginMode: accountMarginMode !== 'unknown' ? accountMarginMode : mapMarginMode('bybit', pos.tradeMode),
      positionMode,
      margin,
      maintenanceMargin,
      marginRatio,
      notionalUsd,
      liquidationPrice: parseFloat(pos.liqPrice || '0'),
      breakEvenPrice: parseFloat(pos.breakEvenPrice || '0'),
      tp: parseFloat(pos.takeProfit || '0'),
      sl: parseFloat(pos.stopLoss || '0'),
      roe,
      instrumentType: mapInstrumentType('bybit', pos.category || 'linear'),
      raw: pos
    };
  }

  // REST Closed PnL History
  public async fetchAndNormalize(key: any, start?: number, end?: number): Promise<UnifiedHistoryPosition[]> {
    await BybitAdapter.syncTime();
    const categories = ['linear', 'inverse'];

    const fetchCategory = async (category: string) => {
      let list: any[] = [];
      let cursor = '';
      let pages = 0;
      try {
        do {
          let query = `category=${category}&limit=100`;
          if (start) query += `&startTime=${start}`;
          if (end) query += `&endTime=${end}`;
          if (cursor) query += `&cursor=${cursor}`;

          const targetUrl = `https://api.bybit.com/v5/position/closed-pnl?${query}`;
          const headers = await BybitAdapter.getHeaders(key.apiKey, key.apiSecret, query);
          const res = await hybridFetch(targetUrl, 'GET', headers);

          if (res.retCode !== 0) throw new Error(res.retMsg);
          
          const rows = res.result?.list || [];
          list = [...list, ...rows];
          cursor = res.result?.nextPageCursor || '';
          pages++;
        } while (cursor && pages < MAX_DEEP_PAGES);
      } catch (err) {
        console.warn(`[Bybit-History] error for ${category}:`, err);
      }
      return list.map(item => ({ ...item, _category: category }));
    };

    const results = await Promise.all(categories.map(cat => fetchCategory(cat)));
    const closeUpdateTimeFallback = () => Date.now().toString(36);

    return results.flat().map((pos: any) => {
      const closeUpdateTime = parseInt(pos.updatedTime || '0', 10);
      const createdTime = parseInt(pos.createdTime || '0', 10);
      let ccy = extractCcy('bybit', pos.settleCoin, undefined, pos.coin, pos.symbol);
      const isInverse = pos.symbol?.endsWith('USD') && !pos.symbol.includes('USDT') && !pos.symbol.includes('USDC');
      if (isInverse && ccy === 'USD') {
        ccy = extractBaseCoin('bybit', pos.symbol);
      }

      return {
        id: `${key.id}-${pos.orderId || pos.closedPnlId || closeUpdateTimeFallback()}-${closeUpdateTime}`,
        connectionId: key.id,
        label: key.label,
        exchange: 'bybit',
        symbol: pos.symbol,
        baseCoin: extractBaseCoin('bybit', pos.symbol),
        quoteCoin: extractQuoteCoin('bybit', pos.symbol),
        ccy,
        side: mapPositionSide('bybit', pos.side),
        realizedPnl: parseFloat(pos.closedPnl || '0'),
        closeUpdateTime: closeUpdateTime,
        createdTime: createdTime,
        entryPrice: parseFloat(pos.avgEntryPrice || '0'),
        closePrice: parseFloat(pos.avgExitPrice || '0'),
        size: parseFloat(pos.closedSize || '0'),
        leverage: parseFloat(pos.leverage || '0'),
        fundingFee: pos.fundingFee ? parseFloat(pos.fundingFee) : undefined,
        tradingFee: pos.execFee ? parseFloat(pos.execFee) : undefined,
        instrumentType: mapInstrumentType('bybit', pos._category || 'linear'),
        raw: pos,
      };
    });
  }

  // REST Deposits / Withdrawals (Bills)
  public async fetchBills(key: any, start?: number, end?: number): Promise<UnifiedBillRecord[]> {
    await BybitAdapter.syncTime();
    const fetchRecords = async (type: 'deposit' | 'withdraw') => {
      const endpoint = type === 'deposit' ? '/v5/asset/deposit/query-record' : '/v5/asset/withdraw/query-record';
      let list: any[] = [];
      let cursor = '';
      let pages = 0;

      try {
        do {
          let query = `limit=50`;
          if (start) query += `&startTime=${start}`;
          if (end) query += `&endTime=${end}`;
          if (cursor) query += `&cursor=${cursor}`;

          const targetUrl = `https://api.bybit.com${endpoint}?${query}`;
          const headers = await BybitAdapter.getHeaders(key.apiKey, key.apiSecret, query);
          const response = await hybridFetch(targetUrl, 'GET', headers);

          if (response.retCode !== 0) throw new Error(response.retMsg);
          list = [...list, ...(response.result?.rows || [])];
          cursor = response.result?.nextCursor || '';
          pages++;
        } while (cursor && pages < MAX_DEEP_PAGES);
      } catch (err) {
        console.warn(`[Bybit-Bills] error for ${type}:`, err);
      }
      return list.map(item => ({ ...item, _type: type }));
    };

    const [deposits, withdrawals] = await Promise.all([
      fetchRecords('deposit'),
      fetchRecords('withdraw')
    ]);

    return [...deposits, ...withdrawals].map((b: any) => {
      const cTime = parseInt(b.successAt || b.updateTime || Date.now().toString(), 10);
      return {
        id: `${key.id}-${b.txID || b.withdrawId || Math.random().toString(36)}-${cTime}`,
        connectionId: key.id,
        exchange: 'bybit',
        label: key.label,
        type: b._type === 'deposit' ? 'deposit' : 'withdrawal',
        amount: parseFloat(b.amount || '0'),
        ccy: b.coin,
        timestamp: cTime,
        raw: b
      };
    });
  }

  // Orders
  public async getOpenOrders(key: any): Promise<import('../../types').UnifiedOrder[]> {
    const categories = ['spot', 'inverse', 'linear-usdt', 'linear-usdc'];
    let allOrders: any[] = [];
    
    for (const cat of categories) {
      let query = '';
      if (cat === 'spot') query = 'category=spot';
      else if (cat === 'inverse') query = 'category=inverse';
      else if (cat === 'linear-usdt') query = 'category=linear&settleCoin=USDT';
      else if (cat === 'linear-usdc') query = 'category=linear&settleCoin=USDC';

      const targetUrl = `https://api.bybit.com/v5/order/realtime?${query}`;
      const headers = await BybitAdapter.getHeaders(key.apiKey, key.apiSecret, query);
      
      try {
        const res = await hybridFetch(targetUrl, 'GET', headers);
        if (res.retCode === 0 && res.result?.list) {
          const listCat = cat.startsWith('linear') ? 'linear' : cat;
          allOrders = allOrders.concat(res.result.list.map((o: any) => ({ ...o, _category: listCat })));
        }
      } catch (err) {
        console.warn(`[Bybit-OpenOrders] Error fetching ${cat}:`, err);
      }
    }
    return this.normalizeOrders(allOrders, key);
  }

  public async getHistoryOrders(key: any, start?: number, end?: number): Promise<import('../../types').UnifiedOrder[]> {
    const categories = ['linear', 'spot', 'inverse'];
    let allOrders: any[] = [];

    const now = Date.now();
    const endTimeObj = end ? end : now;
    const startTimeObj = start ? start : (endTimeObj - 7 * 24 * 60 * 60 * 1000); // default 7 days 
    
    // Bybit history max 7 days per request. We might need to chunk if period > 7 days.
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    for (const cat of categories) {
      let currentEnd = endTimeObj;
      let currentStart = Math.max(startTimeObj, currentEnd - SEVEN_DAYS_MS + 1000);

      while (currentStart >= startTimeObj && currentStart < currentEnd) {
        let queryUrl = `category=${cat}&limit=50&startTime=${currentStart}&endTime=${currentEnd}`;
        
        const targetUrl = `https://api.bybit.com/v5/order/history?${queryUrl}`;
        const headers = await BybitAdapter.getHeaders(key.apiKey, key.apiSecret, queryUrl);
        
        try {
          const res = await hybridFetch(targetUrl, 'GET', headers);
          if (res.retCode === 0 && res.result?.list) {
            allOrders = allOrders.concat(res.result.list.map((o: any) => ({ ...o, _category: cat })));
          }
        } catch (err) {
          console.warn(`[Bybit-HistoryOrders] Error fetching ${cat}:`, err);
        }

        if (currentStart <= startTimeObj) break;

        currentEnd = currentStart - 1;
        currentStart = Math.max(startTimeObj, currentEnd - SEVEN_DAYS_MS + 1000);
      }
    }
    return this.normalizeOrders(allOrders, key);
  }

  private normalizeOrders(rawOrders: any[], key: any): import('../../types').UnifiedOrder[] {
    return rawOrders.map(o => {
      let status: import('../../types').UnifiedOrderStatus = 'NEW';
      const bs = o.orderStatus?.toUpperCase() || '';
      if (bs === 'FILLED') status = 'FILLED';
      else if (bs === 'CANCELLED' || bs === 'DEACTIVATED' || bs === 'PENDINGCANCEL') status = 'CANCELLED';
      else if (bs === 'PARTIALLYFILLED') status = 'PARTIALLY_FILLED';
      else if (bs === 'UNTRIGGERED') status = 'UNTRIGGERED';
      else if (bs === 'TRIGGERED') status = 'TRIGGERED';
      else if (bs === 'REJECTED') status = 'REJECTED';

      let type: import('../../types').UnifiedOrderType = 'LIMIT';
      const ot = o.orderType?.toUpperCase() || '';
      if (ot === 'MARKET') type = 'MARKET';
      // simple handling for TP/SL if needed based on trigger parameters, Bybit usually has stopOrderType
      if (o.stopOrderType) {
         if (o.stopOrderType.toUpperCase() === 'TAKEPROFIT') type = 'TP';
         else if (o.stopOrderType.toUpperCase() === 'STOPLOSS') type = 'SL';
         else type = 'CONDITIONAL';
      }

      const pSize = parseFloat(o.qty || '0');
      const pFil = parseFloat(o.cumExecQty || '0');
      
      return {
        id: `${key.id}-${o.orderId}`,
        exchangeOrderId: o.orderId,
        connectionId: key.id,
        exchange: 'bybit',
        symbol: o.symbol,
        category: mapInstrumentType('bybit', o.category || o._category || 'UNKNOWN'),
        side: o.side?.toLowerCase() === 'sell' ? 'sell' : 'buy',
        positionSide: o.positionIdx === 1 ? 'long' : o.positionIdx === 2 ? 'short' : 'net',
        type,
        status,
        price: parseFloat(o.price || '0'),
        avgPrice: parseFloat(o.avgPrice || '0'),
        qty: pSize,
        filledQty: pFil,
        value: parseFloat(o.cumExecValue || '0'),
        triggerPrice: o.triggerPrice ? parseFloat(o.triggerPrice) : undefined,
        reduceOnly: o.reduceOnly === true || o.reduceOnly === 'true',
        timeInForce: o.timeInForce,
        createdTime: parseInt(o.createdTime, 10),
        updatedTime: parseInt(o.updatedTime, 10),
        fees: parseFloat(o.cumExecFee || '0'),
        raw: o
      };
    });
  }

  // Instrument Metadata (Public)
  public async fetchInstrumentMetadata(symbol: string): Promise<import('../../types').UnifiedAssetCategory | 'NOT_FOUND'> {
    try {
      const res = await proxyFetch({
         targetUrl: `https://api.bybit.com/v5/market/instruments-info?category=linear&symbol=${symbol}`,
         method: 'GET',
         headers: {}
      });
      // Try spot if not found in linear
      let data = res;
      if (data.retCode !== 0 || !data.result?.list?.length) {
         const res2 = await proxyFetch({
            targetUrl: `https://api.bybit.com/v5/market/instruments-info?category=spot&symbol=${symbol}`,
            method: 'GET',
            headers: {}
         });
         data = res2;
      }
      if (data.retCode === 0 && data.result?.list?.length > 0) {
         const info = data.result.list[0];
         const sType = info.symbolType?.toLowerCase();
         if (sType === 'stock' || sType === 'xstocks') {
             return 'STOCK';
         }
         return 'CRYPTO';
      }
    } catch (err) {
      console.warn('[Bybit-Metadata] Fetch error:', err);
    }
    return 'NOT_FOUND';
  }

}
