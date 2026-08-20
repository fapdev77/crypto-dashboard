import Big from 'big.js';
import { UnifiedPosition, UnifiedHistoryPosition, UnifiedBillRecord, UnifiedBalance, UnifiedOrder, UnifiedOrderStatus, UnifiedOrderType, UnifiedAssetCategory } from '../../types';
import { IExchangeAdapter } from './IExchangeAdapter';
import { BaseExchangeAdapter } from './BaseExchangeAdapter';
import { ApiCredentials } from '../../store/apiKeysStore';
import { proxyFetch } from '../../utils/proxyFetch';
import { hmacSha256 } from '../../utils/cryptoLib';
import { LogManager } from '../LogManager';
import { mapInstrumentType } from '../../utils/instrumentTypeMapper';
import { mapPositionSide, mapMarginMode, extractBaseCoin, extractQuoteCoin, extractCcy } from '../../utils/unifiers';

const MAX_DEEP_PAGES = 30;

export class BitgetUTAAdapter extends BaseExchangeAdapter implements IExchangeAdapter {
  static _timeSyncUrl = 'https://api.bitget.com/api/v2/public/time';
  static _parseTimeResponse(data: any): number | null {
    if (data?.code === '00000' && data.data?.serverTime) {
      return parseInt(data.data.serverTime, 10);
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

  // REST Balances (UTA v3)
  public async getBalance(key: ApiCredentials): Promise<UnifiedBalance[]> {
    const balances: UnifiedBalance[] = [];

    // 1. UTA Unified Account Assets (/api/v3/account/assets)
    try {
      const path = '/api/v3/account/assets';
      const headers = await BitgetUTAAdapter.getHeaders(key.apiKey, key.apiSecret, key.passphrase || '', 'GET', path);
      const res = await proxyFetch({ targetUrl: `https://api.bitget.com${path}`, method: 'GET', headers });

      if (res.code === '00000' && res.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data.list || []);
        list.forEach((item: any) => {
          const balance = parseFloat(item.balance || '0');
          const available = parseFloat(item.available || '0');
          const crossedEquity = parseFloat(item.crossedEquity || '0');
          const isolatedEquity = parseFloat(item.isolatedEquity || '0');
          const totalEquity = crossedEquity + isolatedEquity > 0 ? (crossedEquity + isolatedEquity) : balance;
          const usdVal = parseFloat(item.usdValue || '0');
          const unrealizedPnl = parseFloat(item.unrealisedPnl || '0');

          if (totalEquity > 0 || balance > 0 || available > 0 || usdVal > 0) {
            balances.push({
              id: `${key.id}-uta-${item.coin}`,
              connectionId: key.id,
              exchange: 'bitget',
              label: `${key.label} (UTA)`,
              ccy: (item.coin || '').toUpperCase(),
              amount: balance > 0 ? balance : totalEquity,
              usdValue: usdVal > 0 ? usdVal : (totalEquity > 0 ? totalEquity : balance),
              totalEquity,
              walletBalance: balance,
              availableMargin: available,
              unrealizedPnl,
              raw: item
            });
          }
        });
      }
    } catch (err) {
      LogManager.warn('BitgetUTAAdapter', 'Fetch failed for /api/v3/account/assets', err);
    }

    // 2. UTA Funding Assets (/api/v3/account/funding-assets)
    try {
      const path = '/api/v3/account/funding-assets';
      const headers = await BitgetUTAAdapter.getHeaders(key.apiKey, key.apiSecret, key.passphrase || '', 'GET', path);
      const res = await proxyFetch({ targetUrl: `https://api.bitget.com${path}`, method: 'GET', headers });

      if (res.code === '00000' && Array.isArray(res.data)) {
        res.data.forEach((item: any) => {
          const available = parseFloat(item.available || '0');
          const frozen = parseFloat(item.frozen || '0');
          const balance = parseFloat(item.balance || '0') || (available + frozen);

          if (balance > 0) {
            balances.push({
              id: `${key.id}-uta-funding-${item.coin}`,
              connectionId: key.id,
              exchange: 'bitget',
              label: `${key.label} (Funding)`,
              ccy: (item.coin || '').toUpperCase(),
              amount: balance,
              usdValue: balance,
              walletBalance: balance,
              availableMargin: available,
              raw: item
            });
          }
        });
      }
    } catch (err) {
      LogManager.warn('BitgetUTAAdapter', 'Fetch failed for /api/v3/account/funding-assets', err);
    }

    return balances;
  }

  // REST Positions (UTA v3)
  public async getOpenPositions(key: ApiCredentials): Promise<UnifiedPosition[]> {
    const categories = ['USDT-FUTURES', 'COIN-FUTURES', 'USDC-FUTURES'];
    const requests = categories.map(async (category) => {
      const path = `/api/v3/position/current-position?category=${category}`;
      const headers = await BitgetUTAAdapter.getHeaders(key.apiKey, key.apiSecret, key.passphrase || '', 'GET', path);
      const res = await proxyFetch({
        targetUrl: `https://api.bitget.com${path}`,
        method: 'GET',
        headers
      });
      if (res.code !== '00000') throw new Error(res.msg);
      const list = Array.isArray(res.data) ? res.data : (res.data?.list || []);
      return list.map((item: any) => ({ ...item, category }));
    });

    const results = await Promise.all(requests);
    const rawList = results.flat();

    return rawList
      .filter(pos => parseFloat(pos.total || '0') > 0)
      .map(pos => {
        const margin = parseFloat(pos.positionBalance || '0');
        const markPrice = parseFloat(pos.markPrice || '0');
        let unrealizedPnl = parseFloat(pos.unrealisedPnl || '0');

        const instrumentType = mapInstrumentType('bitget', pos.category || 'USDT-FUTURES');
        const isInverse = instrumentType === 'INVERSE';

        if (isInverse && markPrice > 0) {
          unrealizedPnl = unrealizedPnl / markPrice;
        }

        const size = parseFloat(pos.total || '0');
        const notionalUsd = size * markPrice;
        const side = mapPositionSide('bitget', pos.posSide);

        const accumulatedFunding = pos.totalFunding ? new Big(pos.totalFunding || 0).toString() : "0";
        const openFee = parseFloat(pos.openFeeTotal || '0');
        const closeFee = parseFloat(pos.closeFeeTotal || '0');
        const accumulatedTradingFee = (openFee + closeFee).toString();
        const closedPnl = parseFloat(pos.curRealisedPnl || '0');
        const realizedPnl = closedPnl + parseFloat(accumulatedFunding) + (openFee + closeFee);

        return {
          id: `${key.id}-bitget-uta-${pos.symbol}-${side}`,
          connectionId: key.id,
          exchange: 'bitget',
          label: key.label,
          symbol: pos.symbol,
          baseCoin: extractBaseCoin('bitget', pos.symbol),
          quoteCoin: extractQuoteCoin('bitget', pos.symbol),
          ccy: extractCcy('bitget', pos.marginCoin, undefined, undefined, pos.symbol),
          side,
          size,
          entryPrice: parseFloat(pos.avgPrice || '0'),
          markPrice,
          unrealizedPnl,
          realizedPnl,
          closedPnl,
          accumulatedFunding,
          accumulatedTradingFee,
          leverage: parseFloat(pos.leverage || '0'),
          marginMode: mapMarginMode('bitget', pos.marginMode),
          margin,
          maintenanceMargin: pos.mmr && margin > 0 ? margin * parseFloat(pos.mmr) : undefined,
          marginRatio: pos.mmr ? parseFloat(pos.mmr) * 100 : undefined,
          notionalUsd,
          liquidationPrice: parseFloat(pos.liquidationPrice || '0'),
          breakEvenPrice: parseFloat(pos.breakEvenPrice || '0'),
          tp: parseFloat(pos.takeProfit || '0'),
          sl: parseFloat(pos.stopLoss || '0'),
          roe: pos.profitRate ? parseFloat(pos.profitRate) * 100 : (margin > 0 ? (unrealizedPnl / margin) * 100 : undefined),
          instrumentType,
          raw: pos
        };
      });
  }

  // REST Closed PnL History (UTA v3)
  public async fetchAndNormalize(key: ApiCredentials, start?: number, end?: number): Promise<UnifiedHistoryPosition[]> {
    const categories = ['USDT-FUTURES', 'COIN-FUTURES', 'USDC-FUTURES'];
    const fetchCategory = async (cat: string) => {
      let list: any[] = [];
      let cursor = '';
      let pages = 0;
      try {
        do {
          let query = `category=${cat}&limit=100`;
          if (start) query += `&startTime=${start}`;
          if (end) query += `&endTime=${end}`;
          if (cursor) query += `&cursor=${cursor}`;

          const path = `/api/v3/position/history-position?${query}`;
          const headers = await BitgetUTAAdapter.getHeaders(key.apiKey, key.apiSecret, key.passphrase || '', 'GET', path);
          const res = await proxyFetch({
            targetUrl: `https://api.bitget.com${path}`,
            method: 'GET',
            headers
          });

          if (res.code !== '00000') throw new Error(res.msg);
          const rows = Array.isArray(res.data) ? res.data : (res.data?.list || []);
          list = [...list, ...rows.map((r: any) => ({ ...r, category: cat }))];
          cursor = res.data?.cursor || '';
          pages++;
        } while (cursor && pages < MAX_DEEP_PAGES);
      } catch (err) {
        LogManager.warn('BitgetUTAAdapter.History', `Error for ${cat}:`, err);
      }
      return list;
    };

    const results = await Promise.all(categories.map(cat => fetchCategory(cat)));

    return results.flat().map((pos: any) => {
      const closeUpdateTime = parseInt(pos.updatedTime || pos.createdTime || '0', 10);
      const createdTime = parseInt(pos.createdTime || pos.updatedTime || '0', 10);
      let totalFee = 0;
      if (pos.openFeeTotal) totalFee += parseFloat(pos.openFeeTotal);
      if (pos.closeFeeTotal) totalFee += parseFloat(pos.closeFeeTotal);

      return {
        id: `${key.id}-${pos.positionId}-${closeUpdateTime}`,
        connectionId: key.id,
        label: key.label,
        exchange: 'bitget',
        symbol: pos.symbol,
        baseCoin: extractBaseCoin('bitget', pos.symbol),
        quoteCoin: extractQuoteCoin('bitget', pos.symbol),
        ccy: extractCcy('bitget', pos.marginCoin, undefined, undefined, pos.symbol),
        side: mapPositionSide('bitget', pos.posSide),
        realizedPnl: parseFloat(pos.netProfit ?? pos.cumRealisedPnl ?? '0'),
        closedPnl: parseFloat(pos.cumRealisedPnl ?? '0'),
        closeUpdateTime,
        createdTime,
        entryPrice: parseFloat(pos.openPriceAvg || '0'),
        closePrice: parseFloat(pos.closePriceAvg || '0'),
        size: parseFloat(pos.closeTotalPos || pos.openTotalPos || '0'),
        fundingFee: pos.totalFunding ? parseFloat(pos.totalFunding) : undefined,
        tradingFee: totalFee || 0,
        instrumentType: mapInstrumentType('bitget', pos.category || 'USDT-FUTURES'),
        raw: pos,
      };
    });
  }

  // REST Deposits / Withdrawals (UTA v3)
  public async fetchBills(key: ApiCredentials, start?: number, end?: number): Promise<UnifiedBillRecord[]> {
    const fetchRecords = async (type: 'deposit' | 'withdrawal') => {
      const endpoint = type === 'deposit' ? '/api/v3/account/deposit-records' : '/api/v3/account/withdrawal-records';
      let list: any[] = [];
      let cursor = '';
      let pages = 0;

      try {
        do {
          let query = `limit=100`;
          if (start) query += `&startTime=${start}`;
          if (end) query += `&endTime=${end}`;
          if (cursor) query += `&cursor=${cursor}`;

          const path = `${endpoint}?${query}`;
          const headers = await BitgetUTAAdapter.getHeaders(key.apiKey, key.apiSecret, key.passphrase || '', 'GET', path);
          const response = await proxyFetch({
            targetUrl: `https://api.bitget.com${path}`,
            method: 'GET',
            headers
          });

          if (response.code !== '00000') throw new Error(response.msg);
          const rows = Array.isArray(response.data) ? response.data : (response.data?.list || []);
          list = [...list, ...rows];
          cursor = response.data?.cursor || '';
          pages++;
        } while (cursor && pages < MAX_DEEP_PAGES);
      } catch (err) {
        LogManager.warn('BitgetUTAAdapter.Bills', `Error for ${type}:`, err);
      }
      return list.map(item => ({ ...item, _type: type }));
    };

    const [deposits, withdrawals] = await Promise.all([
      fetchRecords('deposit'),
      fetchRecords('withdrawal')
    ]);

    return [...deposits, ...withdrawals].map((b: any) => {
      const cTime = parseInt(b.createdTime || b.updatedTime || Date.now().toString(), 10);
      return {
        id: `${key.id}-${b.orderId || b.recordId || Math.random().toString(36)}-${cTime}`,
        connectionId: key.id,
        exchange: 'bitget',
        label: key.label,
        type: b._type === 'deposit' ? 'deposit' : 'withdrawal',
        amount: parseFloat(b.size || b.amount || '0'),
        ccy: (b.coin || '').toUpperCase(),
        timestamp: cTime,
        raw: b
      };
    });
  }

  // Orders (UTA v3)
  public async getOpenOrders(key: ApiCredentials): Promise<UnifiedOrder[]> {
    const categories = ['USDT-FUTURES', 'COIN-FUTURES', 'USDC-FUTURES', 'SPOT', 'MARGIN'];
    let allOrders: any[] = [];

    for (const category of categories) {
      const path = `/api/v3/trade/unfilled-orders?category=${category}&limit=100`;
      const headers = await BitgetUTAAdapter.getHeaders(key.apiKey, key.apiSecret, key.passphrase || '', 'GET', path);

      try {
        const res = await proxyFetch({ targetUrl: `https://api.bitget.com${path}`, method: 'GET', headers });
        if (res.code === '00000') {
          const list = Array.isArray(res.data) ? res.data : (res.data?.list || []);
          allOrders = allOrders.concat(list.map((o: any) => ({ ...o, category })));
        }
      } catch (err) {
        LogManager.warn('BitgetUTAAdapter.OpenOrders', `Error fetching ${category}:`, err);
      }
    }

    return this.normalizeOrders(allOrders, key);
  }

  public async getHistoryOrders(key: ApiCredentials, start?: number, end?: number): Promise<UnifiedOrder[]> {
    const categories = ['USDT-FUTURES', 'COIN-FUTURES', 'USDC-FUTURES', 'SPOT', 'MARGIN'];
    let allOrders: any[] = [];

    for (const category of categories) {
      let list: any[] = [];
      let cursor = '';
      let pages = 0;

      try {
        do {
          let queryUrl = `category=${category}&limit=100`;
          if (start) queryUrl += `&startTime=${start}`;
          if (end) queryUrl += `&endTime=${end}`;
          if (cursor) queryUrl += `&cursor=${cursor}`;

          const path = `/api/v3/trade/history-orders?${queryUrl}`;
          const headers = await BitgetUTAAdapter.getHeaders(key.apiKey, key.apiSecret, key.passphrase || '', 'GET', path);

          const res = await proxyFetch({ targetUrl: `https://api.bitget.com${path}`, method: 'GET', headers });
          if (res.code === '00000') {
            const rows = Array.isArray(res.data) ? res.data : (res.data?.list || []);
            list = [...list, ...rows.map((o: any) => ({ ...o, category }))];
            cursor = res.data?.cursor || '';
          } else {
            break;
          }
          pages++;
        } while (cursor && pages < MAX_DEEP_PAGES);
        allOrders = allOrders.concat(list);
      } catch (err) {
        LogManager.warn('BitgetUTAAdapter.HistoryOrders', `Error fetching ${category}:`, err);
      }
    }

    return this.normalizeOrders(allOrders, key);
  }

  private normalizeOrders(rawOrders: any[], key: ApiCredentials): UnifiedOrder[] {
    return rawOrders.map(o => {
      let status: UnifiedOrderStatus = 'NEW';
      const state = o.orderStatus?.toLowerCase() || o.status?.toLowerCase() || o.state?.toLowerCase() || '';
      if (state === 'filled') status = 'FILLED';
      else if (state === 'cancelled' || state === 'canceled') status = 'CANCELLED';
      else if (state === 'partially_filled') status = 'PARTIALLY_FILLED';
      else if (state === 'live' || state === 'new' || state === 'init') status = 'NEW';

      let type: UnifiedOrderType = 'LIMIT';
      const ot = o.orderType?.toLowerCase() || o.delegateType?.toLowerCase() || '';
      if (ot === 'market') type = 'MARKET';
      else if (ot.includes('stop_loss') || ot.includes('sl')) type = 'SL';
      else if (ot.includes('stop_profit') || ot.includes('tp')) type = 'TP';
      else if (ot.includes('plan') || ot.includes('conditional')) type = 'CONDITIONAL';

      const category = mapInstrumentType('bitget', o.category || 'UNKNOWN');
      const qty = parseFloat(o.qty || o.size || '0');
      const filledQty = parseFloat(o.cumExecQty || o.filledQty || '0');
      const price = parseFloat(o.price || '0');
      const avgPrice = parseFloat(o.avgPrice || o.priceAvg || '0');
      const value = parseFloat(o.cumExecValue || o.amount || '0') || (qty * (avgPrice || price));

      let fee = 0;
      if (Array.isArray(o.feeDetail) && o.feeDetail.length > 0) {
        fee = o.feeDetail.reduce((acc: number, f: any) => acc + (parseFloat(f.fee || '0') * -1), 0);
      }

      return {
        id: `${key.id}-${o.orderId}`,
        exchangeOrderId: o.orderId,
        connectionId: key.id,
        exchange: 'bitget',
        label: key.label,
        symbol: o.symbol,
        category,
        side: o.side?.toLowerCase().includes('buy') ? 'buy' : 'sell',
        positionSide: o.posSide?.toLowerCase() === 'long' ? 'long' : o.posSide?.toLowerCase() === 'short' ? 'short' : 'net',
        type,
        status,
        price,
        avgPrice,
        qty,
        filledQty,
        value,
        triggerPrice: o.takeProfit || o.stopLoss ? parseFloat(o.takeProfit || o.stopLoss) : undefined,
        reduceOnly:
          o.reduceOnly === 'YES' ||
          o.reduceOnly === 'yes' ||
          o.reduceOnly === 'true' ||
          o.reduceOnly === true,
        timeInForce: o.timeInForce,
        createdTime: parseInt(o.createdTime || o.cTime || '0', 10),
        updatedTime: parseInt(o.updatedTime || o.uTime || o.createdTime || '0', 10),
        fees: fee,
        leverage: o.leverage ? parseFloat(o.leverage) : undefined,
        marginMode: o.marginMode ? mapMarginMode('bitget', o.marginMode) : undefined,
        raw: o
      };
    });
  }

  // Instrument Metadata (Public)
  public async fetchInstrumentMetadata(symbol: string): Promise<UnifiedAssetCategory | 'NOT_FOUND'> {
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
      LogManager.warn('BitgetUTAAdapter.Metadata', 'Fetch error', err);
    }
    return 'NOT_FOUND';
  }
}
