import Big from 'big.js';
import { UnifiedPosition, UnifiedHistoryPosition, UnifiedBillRecord, UnifiedBalance, UnifiedPositionMode } from '../../types';
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

  public static async getWsAuth(apiKey: string, apiSecret: string) {
    await this.syncTime();
    const expires = Date.now() + this.timeOffset + 10000;
    const prehash = 'GET/realtime' + expires;
    const signature = await hmacSha256(prehash, apiSecret, 'hex');
    return { op: 'auth', args: [apiKey, expires, signature] };
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
    let accountMarginMode: 'cross' | 'isolated' | 'unknown' = 'unknown';
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

    const results = await Promise.allSettled(requests);
    const rawList = results
      .filter((r): r is PromiseFulfilledResult<any[]> => r.status === 'fulfilled')
      .flatMap(r => r.value);

    return rawList
      .filter(p => parseFloat(p.size || '0') > 0)
      .map(p => this.mapPosition(p, key.id, key.label, accountMarginMode));
  }

  private mapPosition(pos: any, connectionId: string, label: string, accountMarginMode: 'cross' | 'isolated' | 'unknown' = 'unknown'): UnifiedPosition {
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

    const margin = parseFloat(pos.positionIM || '0');
    const unrealizedPnl = parseFloat(pos.unrealisedPnl || '0');

    const positionIdx = parseInt(pos.positionIdx || '0', 10);
    const positionMode: UnifiedPositionMode = positionIdx === 0 ? 'one_way' : 'hedge';

    const marginObj = new Big(pos.positionIM || '0');
    const uPnlObj = new Big(pos.unrealisedPnl || '0');
    const roe = marginObj.gt(0) ? Number(uPnlObj.div(marginObj).times(100)) : undefined;

    return {
      id: `${connectionId}-${pos.symbol}-${positionIdx}`,
      connectionId,
      exchange: 'bybit',
      label,
      symbol: pos.symbol,
      baseCoin: extractBaseCoin('bybit', pos.symbol),
      quoteCoin: extractQuoteCoin('bybit', pos.symbol),
      ccy: extractCcy('bybit', pos.settleCoin, undefined, pos.coin, pos.symbol),
      side: mapPositionSide('bybit', pos.side),
      size,
      entryPrice,
      markPrice,
      unrealizedPnl,
      realizedPnl: parseFloat(pos.curRealisedPnl || '0'),
      leverage: parseFloat(pos.leverage || '0'),
      marginMode: accountMarginMode !== 'unknown' ? accountMarginMode : mapMarginMode('bybit', pos.tradeMode),
      positionMode,
      margin,
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

    return results.flat().map((p: any) => {
      const closeUpdateTime = parseInt(p.updatedTime || '0', 10);
      const createdTime = parseInt(p.createdTime || '0', 10);
      return {
        id: `${key.id}-${p.orderId || p.closedPnlId || closeUpdateTimeFallback()}-${closeUpdateTime}`,
        connectionId: key.id,
        label: key.label,
        exchange: 'bybit',
        symbol: p.symbol,
        baseCoin: extractBaseCoin('bybit', p.symbol),
        quoteCoin: extractQuoteCoin('bybit', p.symbol),
        ccy: extractCcy('bybit', p.settleCoin, undefined, p.coin, p.symbol),
        side: mapPositionSide('bybit', p.side),
        realizedPnl: parseFloat(p.closedPnl || '0'),
        closeUpdateTime: closeUpdateTime,
        createdTime: createdTime,
        entryPrice: parseFloat(p.avgEntryPrice || '0'),
        closePrice: parseFloat(p.avgExitPrice || '0'),
        size: parseFloat(p.closedSize || '0'),
        leverage: parseFloat(p.leverage || '0'),
        fundingFee: p.fundingFee ? parseFloat(p.fundingFee) : undefined,
        tradingFee: p.execFee ? parseFloat(p.execFee) : undefined,
        instrumentType: mapInstrumentType('bybit', p._category || 'linear'),
        raw: p,
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

  // WSS private channel parser
  public static parse(cid: string, exchange: string, label: string, data: any) {
    if (!data.topic) return;
    const store = useDashboardStore.getState();

    if (data.topic === 'wallet') {
      const balances: Partial<UnifiedBalance>[] = [];
      data.data.forEach((acc: any) => {
        if (acc.coin) {
          acc.coin.forEach((item: any) => {
            const amount = parseFloat(item.equity || item.walletBalance || '0');
            balances.push({
              id: `${cid}-${acc.accountType || 'UNIFIED'}-${item.coin}`,
              connectionId: cid,
              exchange: 'bybit',
              label: `${label} (${acc.accountType || 'UNIFIED'})`,
              ccy: item.coin,
              amount,
              usdValue: parseFloat(item.usdValue || amount.toString()),
              totalEquity: parseFloat(acc.totalEquity || '0'),
              walletBalance: parseFloat(acc.totalWalletBalance || '0'),
              availableMargin: parseFloat(acc.totalAvailableBalance || '0'),
              unrealizedPnl: parseFloat(acc.totalPerpUPL || '0')
            });
          });
        }
      });
      if (balances.length > 0) store.updateBalancesDelta(cid, balances as any);
    }

    if (data.topic === 'position') {
      const positions: Partial<UnifiedPosition>[] = [];
      data.data.forEach((pos: any) => {
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

        const margin = parseFloat(pos.positionIM || '0');
        const unrealizedPnl = parseFloat(pos.unrealisedPnl || '0');

        positions.push({
          id: `${cid}-${pos.symbol}-${pos.positionIdx || 0}`,
          connectionId: cid,
          exchange: 'bybit',
          label,
          symbol: pos.symbol,
          baseCoin: extractBaseCoin('bybit', pos.symbol),
          quoteCoin: extractQuoteCoin('bybit', pos.symbol),
          ccy: extractCcy('bybit', pos.settleCoin, undefined, pos.coin, pos.symbol),
          side: mapPositionSide('bybit', pos.side),
          size,
          entryPrice,
          markPrice,
          unrealizedPnl,
          realizedPnl: parseFloat(pos.curRealisedPnl || '0'),
          leverage: parseFloat(pos.leverage || '0'),
          marginMode: mapMarginMode('bybit', pos.tradeMode),
          margin,
          notionalUsd,
          liquidationPrice: parseFloat(pos.liqPrice || '0'),
          breakEvenPrice: parseFloat(pos.breakEvenPrice || '0'),
          tp: parseFloat(pos.takeProfit || '0'),
          sl: parseFloat(pos.stopLoss || '0'),
          roe: margin > 0 ? (unrealizedPnl / margin) * 100 : undefined,
          instrumentType: mapInstrumentType('bybit', pos.category || 'linear'),
          raw: pos
        });
      });
      if (positions.length > 0) store.updatePositionsDelta(cid, positions as any);
    }
  }
}
