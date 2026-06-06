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

  public static async getWsAuth(apiKey: string, apiSecret: string, passphrase: string) {
    await this.syncTime();
    const timestamp = (Date.now() + this.timeOffset).toString();
    const prehash = timestamp + 'GET' + '/user/verify';
    const signature = await hmacSha256(prehash, apiSecret, 'base64');
    return {
      op: 'login',
      args: [{ apiKey, passphrase, timestamp, sign: signature }]
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

    const results = await Promise.allSettled(requests);
    const rawList = results
      .filter((r): r is PromiseFulfilledResult<any[]> => r.status === 'fulfilled')
      .flatMap(r => r.value);

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
          realizedPnl: parseFloat(pos.achievedProfits || '0'),
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

  // WSS private channel parser
  public static parse(cid: string, exchange: string, label: string, data: any) {
    if (data.action !== 'snapshot' && data.action !== 'update') return;
    const store = useDashboardStore.getState();

    if (data.arg.channel === 'account' || data.arg.channel === 'equity' || data.arg.channel === 'account-crossed' || data.arg.channel === 'account-isolated') {
      const balances: UnifiedBalance[] = [];
      const instType = data.arg.instType;

      if (instType === 'SPOT' || instType === 'MARGIN') {
        data.data.forEach((item: any) => {
          const coin = item.coin || item.marginCoin;
          const available = parseFloat(item.available || '0');
          const amount = available + parseFloat(item.frozen || '0');
          if (coin && amount > 0) {
            let labelSuffix = 'Spot';
            if (data.arg.channel === 'account-crossed') labelSuffix = 'Margin Cross';
            if (data.arg.channel === 'account-isolated') labelSuffix = 'Margin Isolated';

            balances.push({
              id: `${cid}-${labelSuffix.toUpperCase().replace(' ', '_')}-${coin}`,
              connectionId: cid,
              exchange: 'bitget',
              label: `${label} (${labelSuffix})`,
              ccy: coin.toUpperCase(),
              amount,
              usdValue: amount,
              walletBalance: amount,
              availableMargin: available
            });
          }
        });
      } else {
        data.data.forEach((item: any) => {
          const coin = item.marginCoin || 'USDT';
          const totalEquity = parseFloat(item.equity || item.available || '0');
          balances.push({
            id: `${cid}-${instType}-${coin}`,
            connectionId: cid,
            exchange: 'bitget',
            label: `${label} (${instType})`,
            ccy: coin.toUpperCase(),
            amount: totalEquity,
            usdValue: parseFloat(item.usdtEquity || item.equity || '0'),
            totalEquity,
            walletBalance: parseFloat(item.crossedMaxAvailable || '0'),
            availableMargin: parseFloat(item.crossedMaxAvailable || '0'),
            unrealizedPnl: parseFloat(item.unrealizedPL || '0')
          });
        });
      }
      if (balances.length > 0) store.updateBalances(cid, balances as any);
    }

    if (data.arg.channel === 'positions') {
      const positions: Partial<UnifiedPosition>[] = [];
      data.data.forEach((pos: any) => {
        const margin = parseFloat(pos.marginSize || '0');
        const markPrice = parseFloat(pos.markPrice || pos.markPx || '0');
        let unrealizedPnl = parseFloat(pos.unrealizedPL || pos.upl || '0');

        const instrumentType = mapInstrumentType('bitget', data.arg.instType || 'USDT-FUTURES');
        const isInverse = instrumentType === 'INVERSE';

        // Bitget inverse returns unrealized PnL in USD/Quote value, we need it in base coin (crypto) value
        if (isInverse && markPrice > 0) {
          unrealizedPnl = unrealizedPnl / markPrice;
        }

        const side = mapPositionSide('bitget', pos.holdSide, pos.posSide);

        positions.push({
          id: `${cid}-bitget-${pos.instId || pos.symbol}-${side}`,
          connectionId: cid,
          exchange: 'bitget',
          label,
          symbol: pos.instId,
          baseCoin: extractBaseCoin('bitget', pos.instId),
          quoteCoin: extractQuoteCoin('bitget', pos.instId),
          ccy: extractCcy('bitget', pos.marginCoin, undefined, undefined, pos.instId),
          side,
          size: parseFloat(pos.total || pos.pos || '0'),
          entryPrice: parseFloat(pos.openPriceAvg || pos.avgPx || '0'),
          markPrice,
          unrealizedPnl,
          realizedPnl: parseFloat(pos.achievedProfits || '0'),
          leverage: parseFloat(pos.leverage || pos.lever || '0'),
          marginMode: mapMarginMode('bitget', pos.marginMode),
          margin,
          notionalUsd: parseFloat(pos.total || pos.pos || '0') * parseFloat(pos.markPrice || pos.markPx || '0'),
          liquidationPrice: parseFloat(pos.liquidationPrice || '0'),
          breakEvenPrice: parseFloat(pos.breakEvenPrice || '0'),
          roe: margin > 0 ? (unrealizedPnl / margin) * 100 : undefined,
          instrumentType: mapInstrumentType('bitget', data.arg.instType || 'USDT-FUTURES'),
          raw: pos
        });
      });
      if (positions.length > 0) store.updatePositionsDelta(cid, positions as any);
    }
  }
}
