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

export class BitgetAdapter implements IExchangeAdapter {
  static timeOffset = 0;
  static lastSyncTime = 0;

  static async syncTime() {
    if (Date.now() - this.lastSyncTime < 300000) return;
    try {
      const targetUrl = 'https://api.bitget.com/api/v2/public/time';
      let data;
      try {
        const res = await fetch(targetUrl, { method: 'GET' });
        if (res.ok) data = await res.json();
        else throw new Error();
      } catch {
        data = await proxyFetch({ targetUrl, method: 'GET', headers: {} });
      }

      if (data && data.code === '00000' && data.data?.serverTime) {
        this.timeOffset = parseInt(data.data.serverTime, 10) - Date.now();
        this.lastSyncTime = Date.now();
        console.log(`[Time-Sync] Bitget synced. Offset: ${this.timeOffset}ms`);
      }
    } catch (e) {
      console.error('[Time-Sync] Bitget time sync error:', e);
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
    const timestamp = (Date.now() + this.timeOffset).toString();
    const prehash = timestamp + method.toUpperCase() + requestPath + body;
    const signature = await hmacSha256(prehash, apiSecret, 'base64');

    return {
      'ACCESS-KEY': apiKey,
      'ACCESS-SIGN': signature,
      'ACCESS-TIMESTAMP': timestamp,
      'ACCESS-PASSPHRASE': passphrase,
    };
  }


  // REST Balances
  public async getBalance(key: any): Promise<UnifiedBalance[]> {
    const endpoints = [
      { path: '/api/v2/spot/account/assets?assetType=hold_only', type: 'SPOT' },
      { path: '/api/v2/mix/account/accounts?productType=USDT-FUTURES', type: 'USDT-FUTURES' },
      { path: '/api/v2/mix/account/accounts?productType=COIN-FUTURES', type: 'COIN-FUTURES' },
      { path: '/api/v2/mix/account/accounts?productType=USDC-FUTURES', type: 'USDC-FUTURES' },
      { path: '/api/v2/margin/crossed/account/assets', type: 'MARGIN_CROSS' },
      { path: '/api/v2/margin/isolated/account/assets', type: 'MARGIN_ISOLATED' }
    ];

    const requests = endpoints.map(async (ep) => {
      try {
        const headers = await BitgetAdapter.getHeaders(key.apiKey, key.apiSecret, key.passphrase || '', 'GET', ep.path);
        const res = await proxyFetch({ targetUrl: `https://api.bitget.com${ep.path}`, method: 'GET', headers });
        return { res, type: ep.type };
      } catch (err) {
        console.warn(`[BitgetAdapter] fetch failed for ${ep.path}`, err);
        return { res: { code: 'error' }, type: ep.type };
      }
    });

    const results = await Promise.all(requests);
    const balances: UnifiedBalance[] = [];

    results.forEach(({ res, type }) => {
      if (res.code === '00000' && Array.isArray(res.data)) {
        if (type === 'SPOT' || type === 'MARGIN_CROSS' || type === 'MARGIN_ISOLATED') {
          res.data.forEach((item: any) => {
            const available = parseFloat(item.available || '0');
            const frozen = parseFloat(item.frozen || '0');
            const amount = available + frozen;
            if (amount > 0) {
              balances.push({
                id: `${key.id}-${type}-${item.coin || item.symbol}`,
                connectionId: key.id,
                exchange: 'bitget',
                label: `${key.label} (${type.replace('_', ' ')})`,
                ccy: (item.coin || item.symbol || '').toUpperCase(),
                amount,
                usdValue: amount, // Approximating as 1:1 USD for now if not available
                walletBalance: amount,
                availableMargin: available,
                raw: item
              });
            }
          });
        } else {
          // Futures
          res.data.forEach((item: any) => {
            const totalEquity = parseFloat(item.usdtEquity || item.accountEquity || '0');
            const walletBalance = parseFloat(item.crossedMaxAvailable || item.available || '0');
            balances.push({
              id: `${key.id}-${type}-${item.marginCoin}`,
              connectionId: key.id,
              exchange: 'bitget',
              label: `${key.label} (${type})`,
              ccy: item.marginCoin.toUpperCase(),
              amount: parseFloat(item.accountEquity || item.available || '0'),
              usdValue: totalEquity,
              totalEquity,
              walletBalance,
              availableMargin: parseFloat(item.crossedMaxAvailable || '0'),
              unrealizedPnl: parseFloat(item.unrealizedPL || '0'),
              raw: item
            });
          });
        }
      }
    });

    return balances;
  }

  // REST Positions
  public async getOpenPositions(key: any): Promise<UnifiedPosition[]> {
    const productTypes = ['USDT-FUTURES', 'COIN-FUTURES', 'USDC-FUTURES'];
    const requests = productTypes.map(async (pType) => {
      const path = `/api/v2/mix/position/all-position?productType=${pType}`;
      const headers = await BitgetAdapter.getHeaders(key.apiKey, key.apiSecret, key.passphrase || '', 'GET', path);
      const res = await proxyFetch({
        targetUrl: `https://api.bitget.com${path}`,
        method: 'GET',
        headers
      });
      if (res.code !== '00000') throw new Error(res.msg);
      return (res.data || []).map((item: any) => ({ ...item, productType: pType }));
    });

    const results = await Promise.all(requests);
    const rawList = results.flat();

    return rawList
      .filter(pos => parseFloat(pos.total || '0') > 0)
      .map(pos => {
        const margin = parseFloat(pos.marginSize || '0');
        const markPrice = parseFloat(pos.markPrice || '0');
        let unrealizedPnl = parseFloat(pos.unrealizedPL || '0');
        
        const instrumentType = mapInstrumentType('bitget', pos.productType || 'USDT-FUTURES');
        const isInverse = instrumentType === 'INVERSE';

        if (isInverse && markPrice > 0) {
          unrealizedPnl = unrealizedPnl / markPrice;
        }
        
        const side = mapPositionSide('bitget', pos.holdSide);

        const accumulatedFunding = pos.totalFee ? new Big(pos.totalFee || 0).toString() : "0";
        const realizedPnl = parseFloat(pos.achievedProfits || '0');
        const accumulatedTradingFee = new Big(realizedPnl).minus(accumulatedFunding).toString();

        return {
          id: `${key.id}-bitget-${pos.symbol || pos.instId}-${side}`,
          connectionId: key.id,
          exchange: 'bitget',
          label: key.label,
          symbol: pos.symbol,
          baseCoin: extractBaseCoin('bitget', pos.symbol),
          quoteCoin: extractQuoteCoin('bitget', pos.symbol),
          ccy: extractCcy('bitget', pos.marginCoin, undefined, undefined, pos.symbol),
          side,
          size: parseFloat(pos.total || '0'),
          entryPrice: parseFloat(pos.openPriceAvg || pos.avgPx || '0'),
          markPrice: parseFloat(pos.markPrice || '0'),
          unrealizedPnl,
          realizedPnl,
          accumulatedFunding,
          accumulatedTradingFee,
          leverage: parseFloat(pos.leverage || '0'),
          marginMode: mapMarginMode('bitget', pos.marginMode),
          margin,
          notionalUsd: parseFloat(pos.total || '0') * parseFloat(pos.markPrice || '0'),
          liquidationPrice: parseFloat(pos.liquidationPrice || '0'),
          breakEvenPrice: parseFloat(pos.breakEvenPrice || '0'),
          tp: parseFloat(pos.takeProfit || '0'),
          sl: parseFloat(pos.stopLoss || '0'),
          roe: margin > 0 ? (unrealizedPnl / margin) * 100 : undefined,
          instrumentType: mapInstrumentType('bitget', pos.productType || 'USDT-FUTURES'),
          raw: pos
        };
      });
  }

  // REST Closed PnL History
  public async fetchAndNormalize(key: any, start?: number, end?: number): Promise<UnifiedHistoryPosition[]> {
    const productTypes = ['USDT-FUTURES', 'COIN-FUTURES', 'USDC-FUTURES'];
    const fetchType = async (pType: string) => {
      let list: any[] = [];
      let lastId = '';
      let pages = 0;
      try {
        do {
          let query = `productType=${pType}&limit=100`;
          if (start) query += `&startTime=${start}`;
          if (end) query += `&endTime=${end}`;
          if (lastId) query += `&idLessThan=${lastId}`;

          const path = `/api/v2/mix/position/history-position?${query}`;
          const headers = await BitgetAdapter.getHeaders(key.apiKey, key.apiSecret, key.passphrase || '', 'GET', path);
          const res = await proxyFetch({
            targetUrl: `https://api.bitget.com${path}`,
            method: 'GET',
            headers
          });

          if (res.code !== '00000') throw new Error(res.msg);
          const rows = res.data?.entList || res.data?.list || [];
          list = [...list, ...rows.map((r: any) => ({ ...r, productType: pType }))];
          lastId = res.data?.endId || '';
          pages++;
        } while (lastId && pages < MAX_DEEP_PAGES);
      } catch (err) {
        console.warn(`[Bitget-History] error for ${pType}:`, err);
      }
      return list;
    };

    const results = await Promise.all(productTypes.map(pType => fetchType(pType)));

    return results.flat().map((pos: any) => {
      const closeUpdateTime = parseInt(pos.utime || pos.uTime || pos.ctime || pos.cTime || '0', 10);
      const createdTime = parseInt(pos.ctime || pos.cTime || pos.utime || pos.uTime || '0', 10);
      let totalFee = 0;
      if (pos.openFee) totalFee += parseFloat(pos.openFee);
      if (pos.closeFee) totalFee += parseFloat(pos.closeFee);
      if (pos.fee) totalFee += parseFloat(pos.fee);

      return {
        id: `${key.id}-${pos.posId || pos.positionId}-${closeUpdateTime}`,
        connectionId: key.id,
        label: key.label,
        exchange: 'bitget',
        symbol: pos.instId || pos.symbol,
        baseCoin: extractBaseCoin('bitget', pos.instId || pos.symbol),
        quoteCoin: extractQuoteCoin('bitget', pos.instId || pos.symbol),
        ccy: extractCcy('bitget', pos.marginCoin, undefined, undefined, pos.instId || pos.symbol),
        side: mapPositionSide('bitget', pos.holdSide, pos.side),
        realizedPnl: parseFloat(pos.netProfit ?? pos.pnl ?? pos.achievedProfits ?? '0'),
        closeUpdateTime: closeUpdateTime,
        createdTime: createdTime,
        entryPrice: parseFloat(pos.openPriceAvg || '0'),
        closePrice: parseFloat(pos.closePriceAvg || '0'),
        size: parseFloat(pos.closeTotalPos || '0'),
        fundingFee: pos.totalFunding ? parseFloat(pos.totalFunding) : undefined,
        tradingFee: totalFee || undefined,
        instrumentType: mapInstrumentType('bitget', pos.productType || 'USDT-FUTURES'),
        raw: pos,
      };
    });
  }

  // REST Deposits / Withdrawals (Bills)
  public async fetchBills(key: any, start?: number, end?: number): Promise<UnifiedBillRecord[]> {
    const fetchRecords = async (type: 'deposit' | 'withdrawal') => {
      const endpoint = type === 'deposit' ? '/api/v2/spot/wallet/deposit-records' : '/api/v2/spot/wallet/withdrawal-records';
      let list: any[] = [];
      let lastId = '';
      let pages = 0;

      try {
        do {
          let query = `limit=100`;
          if (start) query += `&startTime=${start}`;
          if (end) query += `&endTime=${end}`;
          if (lastId) query += `&idLessThan=${lastId}`;

          const path = `${endpoint}?${query}`;
          const headers = await BitgetAdapter.getHeaders(key.apiKey, key.apiSecret, key.passphrase || '', 'GET', path);
          const response = await proxyFetch({
            targetUrl: `https://api.bitget.com${path}`,
            method: 'GET',
            headers
          });

          if (response.code !== '00000') throw new Error(response.msg);
          const rows = response.data?.entList || response.data?.list || response.data || [];
          list = [...list, ...rows];
          lastId = response.data?.endId || '';
          pages++;
        } while (lastId && pages < MAX_DEEP_PAGES);
      } catch (err) {
        console.warn(`[Bitget-Bills] error for ${type}:`, err);
      }
      return list.map(item => ({ ...item, _type: type }));
    };

    const [deposits, withdrawals] = await Promise.all([
      fetchRecords('deposit'),
      fetchRecords('withdrawal')
    ]);

    return [...deposits, ...withdrawals].map((b: any) => {
      const cTime = parseInt(b.cTime || b.uTime || Date.now().toString(), 10);
      return {
        id: `${key.id}-${b.orderId || b.id || Math.random().toString(36)}-${cTime}`,
        connectionId: key.id,
        exchange: 'bitget',
        label: key.label,
        type: b._type === 'deposit' ? 'deposit' : 'withdrawal',
        amount: parseFloat(b.size || b.amount || '0'),
        ccy: b.coin,
        timestamp: cTime,
        raw: b
      };
    });
  }

  // Orders
  public async getOpenOrders(key: any): Promise<import('../../types').UnifiedOrder[]> {
    const productTypes = ['USDT-FUTURES', 'COIN-FUTURES', 'USDC-FUTURES'];
    let allOrders: any[] = [];
    
    // Futures
    for (const pType of productTypes) {
      const query = `productType=${pType}`;
      const path = `/api/v2/mix/order/orders-pending?${query}`;
      const headers = await BitgetAdapter.getHeaders(key.apiKey, key.apiSecret, key.passphrase || '', 'GET', path);
      
      try {
        const res = await proxyFetch({ targetUrl: `https://api.bitget.com${path}`, method: 'GET', headers });
        if (res.code === '00000' && res.data?.entrustedList) {
          allOrders = allOrders.concat(res.data.entrustedList.map((o: any) => ({ ...o, productType: pType })));
        }
      } catch (err) {
        console.warn(`[Bitget-OpenOrders] Error fetching ${pType}:`, err);
      }
    }

    // Spot
    try {
      const path = `/api/v2/spot/trade/unfilled-orders`;
      const headers = await BitgetAdapter.getHeaders(key.apiKey, key.apiSecret, key.passphrase || '', 'GET', path);
      const res = await proxyFetch({ targetUrl: `https://api.bitget.com${path}`, method: 'GET', headers });
      if (res.code === '00000' && Array.isArray(res.data)) {
        allOrders = allOrders.concat(res.data.map((o: any) => ({ ...o, productType: 'spot' })));
      } else if (res.code === '00000' && res.data?.entList) {
        allOrders = allOrders.concat(res.data.entList.map((o: any) => ({ ...o, productType: 'spot' })));
      }
    } catch (err) {
      console.warn(`[Bitget-OpenOrders] Error fetching spot:`, err);
    }

    return this.normalizeOrders(allOrders, key);
  }

  public async getHistoryOrders(key: any, start?: number, end?: number): Promise<import('../../types').UnifiedOrder[]> {
    const productTypes = ['USDT-FUTURES', 'COIN-FUTURES', 'USDC-FUTURES'];
    let allOrders: any[] = [];

    // Futures History
    for (const pType of productTypes) {
      let list: any[] = [];
      let lastId = '';
      let pages = 0;
      
      try {
        do {
          let queryUrl = `productType=${pType}&limit=100`;
          if (start) queryUrl += `&startTime=${start}`;
          if (end) queryUrl += `&endTime=${end}`;
          if (lastId) queryUrl += `&idLessThan=${lastId}`;
          
          const path = `/api/v2/mix/order/orders-history?${queryUrl}`;
          const headers = await BitgetAdapter.getHeaders(key.apiKey, key.apiSecret, key.passphrase || '', 'GET', path);
          
          const res = await proxyFetch({ targetUrl: `https://api.bitget.com${path}`, method: 'GET', headers });
          if (res.code === '00000') {
             const rows = Array.isArray(res.data) ? res.data : (res.data?.entrustedList || res.data?.entList || res.data?.list || []);
             list = [...list, ...rows.map((o: any) => ({ ...o, productType: pType }))];
             lastId = res.data?.endId || '';
          } else {
             break;
          }
          pages++;
        } while (lastId && pages < MAX_DEEP_PAGES);
        allOrders = allOrders.concat(list);
      } catch (err) {
        console.warn(`[Bitget-HistoryOrders] Error fetching ${pType}:`, err);
      }
    }

    // Spot History
    try {
      let list: any[] = [];
      let lastId = '';
      let pages = 0;

      do {
        let spotQuery = `limit=100`;
        if (start) spotQuery += `&startTime=${start}`;
        if (end) spotQuery += `&endTime=${end}`;
        if (lastId) spotQuery += `&idLessThan=${lastId}`;

        const path = `/api/v2/spot/trade/history-orders?${spotQuery}`;
        const headers = await BitgetAdapter.getHeaders(key.apiKey, key.apiSecret, key.passphrase || '', 'GET', path);
        const res = await proxyFetch({ targetUrl: `https://api.bitget.com${path}`, method: 'GET', headers });
        
        if (res.code === '00000') {
           const rows = Array.isArray(res.data) ? res.data : (res.data?.entrustedList || res.data?.entList || res.data?.list || []);
           list = [...list, ...rows.map((o: any) => ({ ...o, productType: 'spot' }))];
           lastId = res.data?.endId || '';
        } else {
           break;
        }
        pages++;
      } while (lastId && pages < MAX_DEEP_PAGES);
      allOrders = allOrders.concat(list);
    } catch (err) {
      console.warn(`[Bitget-HistoryOrders] Error fetching spot:`, err);
    }

    return this.normalizeOrders(allOrders, key);
  }

  private normalizeOrders(rawOrders: any[], key: any): import('../../types').UnifiedOrder[] {
    return rawOrders.map(o => {
      let status: import('../../types').UnifiedOrderStatus = 'NEW';
      const state = o.state?.toLowerCase() || o.status?.toLowerCase() || '';
      if (state === 'filled') status = 'FILLED';
      else if (state === 'canceled' || state === 'cancelled') status = 'CANCELLED';
      else if (state === 'partially_filled') status = 'PARTIALLY_FILLED';
      else if (state === 'new' || state === 'init' || state === 'live') status = 'NEW';
      // fallback for others or if they use different strings

      let type: import('../../types').UnifiedOrderType = 'LIMIT';
      const ot = o.orderType?.toLowerCase() || o.planType?.toLowerCase() || '';
      if (ot === 'market') type = 'MARKET';
      else if (ot.includes('stop') || ot.includes('loss')) type = 'SL';
      else if (ot.includes('take') || ot.includes('profit')) type = 'TP';
      else if (ot.includes('plan') || ot.includes('conditional')) type = 'CONDITIONAL';

      const pSize = parseFloat(o.size || '0');
      const pFil = parseFloat(o.filledQty || o.baseVolume || '0');
      
      return {
        id: `${key.id}-${o.orderId}`,
        exchangeOrderId: o.orderId,
        connectionId: key.id,
        exchange: 'bitget',
        symbol: o.symbol || o.instId,
        category: mapInstrumentType('bitget', o.productType || 'UNKNOWN'),
        side: o.side?.toLowerCase().includes('buy') ? 'buy' : 'sell',
        positionSide: o.posSide?.toLowerCase() === 'long' ? 'long' : o.posSide?.toLowerCase() === 'short' ? 'short' : 'net',
        type,
        status,
        price: parseFloat(o.price || '0'),
        avgPrice: parseFloat(o.priceAvg || o.avgPrice || '0'),
        qty: pSize,
        filledQty: pFil,
        value: parseFloat(o.totalProfits || '0'), // simplified
        triggerPrice: o.triggerPrice ? parseFloat(o.triggerPrice) : undefined,
        timeInForce: o.timeInForce || o.force,
        createdTime: parseInt(o.cTime || '0', 10),
        updatedTime: parseInt(o.uTime || o.cTime || '0', 10),
        fees: parseFloat(o.fee || '0'),
        raw: o
      };
    });
  }

  // Instrument Metadata (Public)
  public async fetchInstrumentMetadata(symbol: string): Promise<import('../../types').UnifiedAssetCategory | 'NOT_FOUND'> {
    try {
      const spotRes = await proxyFetch({
        targetUrl: `https://api.bitget.com/api/v2/spot/public/symbols?symbol=${symbol}`,
        method: 'GET',
        headers: {}
      });
      if (spotRes.code === '00000' && spotRes.data && spotRes.data.length > 0) {
        const info = spotRes.data.find((s: any) => s.symbol === symbol);
        if (info) {
          if (info.isRwa === 'YES') return 'STOCK';
          return 'CRYPTO';
        }
      }
    } catch (err) {
      console.warn('[Bitget-Metadata] Fetch error', err);
    }
    return 'NOT_FOUND';
  }

}
