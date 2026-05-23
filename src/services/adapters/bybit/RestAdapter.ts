import { UnifiedPosition } from '../../../types';
import { BalanceItem } from '../../../store/dashboardStore';
import { BybitHistoryAdapter } from './HistoryAdapter';
import { hybridFetch } from '../../../utils/proxyFetch';

export class BybitRestAdapter {
  
  static async fetchPositions(apiKey: string, apiSecret: string) {
    const method = 'GET';
    const categories = [
      { category: 'linear', settleCoin: 'USDT' },
      { category: 'linear', settleCoin: 'USDC' },
      { category: 'inverse', settleCoin: null },
    ];

    const results = await Promise.allSettled(
      categories.map(async ({ category, settleCoin }) => {
        let query = `category=${category}&limit=200`;
        if (settleCoin) query += `&settleCoin=${settleCoin}`;
        const targetUrl = `https://api.bybit.com/v5/position/list?${query}`;
        const headers = await BybitHistoryAdapter.getHeaders(apiKey, apiSecret, query);

        const response = await hybridFetch(targetUrl, method, headers);

        if (response.retCode === 10001) return [];
        if (response.retCode !== 0) {
          throw new Error(`Bybit Positions [${category}/${settleCoin}] Error (${response.retCode}): ${response.retMsg}`);
        }
        return (response.result?.list || []).filter((p: any) => parseFloat(p.size || '0') > 0);
      })
    );

    const allPositions: any[] = [];
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        allPositions.push(...result.value);
      } else {
        const cat = categories[idx];
        console.warn(`[REST-Bybit-Positions] categoria ${cat.category}/${cat.settleCoin} falhou:`, result.reason?.message);
      }
    });

    return allPositions;
  }

  static async fetchWallet(apiKey: string, apiSecret: string) {
    const accountTypes = ['UNIFIED', 'CONTRACT', 'SPOT'];
    const results = await Promise.allSettled(
      accountTypes.map(async (accType) => {
        const query = `accountType=${accType}`;
        const targetUrl = `https://api.bybit.com/v5/account/wallet-balance?${query}`;
        const headers = await BybitHistoryAdapter.getHeaders(apiKey, apiSecret, query);
        const response = await hybridFetch(targetUrl, 'GET', headers);
        if (response.retCode !== 0) {
          throw new Error(`[${accType}] ${response.retMsg}`);
        }
        return response.result?.list || [];
      })
    );

    const mergedList: any[] = [];
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        mergedList.push(...result.value);
      } else {
        console.warn(`[REST-Bybit-Wallet] Falha ao buscar lista:`, result.reason?.message);
      }
    });

    return mergedList;
  }

  static parseBalances(walletDataList: any[], id: string, exchange: string, label: string): BalanceItem[] {
    const balances: BalanceItem[] = [];
    if (walletDataList && Array.isArray(walletDataList)) {
      walletDataList.forEach((walletData: any) => {
        if (walletData.coin) {
          walletData.coin.forEach((item: any) => {
            const accountType = walletData.accountType || 'UNIFIED';
            balances.push({
              id: `${id}-${accountType}-${item.coin}`,
              connectionId: id,
              exchange,
              label: `${label} (${accountType})`,
              ccy: item.coin,
              amount: parseFloat(item.walletBalance || item.equity),
              usdValue: parseFloat(item.usdValue)
            });
          });
        }
      });
    }
    return balances;
  }

  static parsePositions(positionsData: any[], id: string, label: string): UnifiedPosition[] {
    const positions: UnifiedPosition[] = [];
    if (positionsData && Array.isArray(positionsData)) {
      positionsData.forEach((pos: any) => {
        positions.push({
          id: `${id}-${pos.symbol}-${pos.positionIdx || 0}`,
          connectionId: id,
          exchange: 'bybit',
          label: label,
          symbol: pos.symbol,
          ccy: pos.settleCoin || pos.coin || 'USDT',
          side: pos.side ? pos.side.toLowerCase() as any : 'net', 
          size: parseFloat(pos.size || '0'),
          entryPrice: parseFloat(pos.avgPrice || pos.entryPrice || '0'),
          markPrice: parseFloat(pos.markPrice || '0'),
          unrealizedPnl: parseFloat(pos.unrealisedPnl || '0'),
          realizedPnl: parseFloat(pos.curRealisedPnl || '0'),
          leverage: parseFloat(pos.leverage || '0'),
          marginMode: pos.tradeMode === 1 ? 'isolated' : 'cross',
          margin: parseFloat(pos.positionIM || '0'),
          notionalUsd: parseFloat(pos.positionValue || '0'),
          liquidationPrice: parseFloat(pos.liqPrice || '0'),
          breakEvenPrice: parseFloat(pos.breakEvenPrice || '0'),
          tp: parseFloat(pos.takeProfit || '0'),
          sl: parseFloat(pos.stopLoss || '0'),
          roe: parseFloat(pos.positionIM) > 0 ? (parseFloat(pos.unrealisedPnl) / parseFloat(pos.positionIM)) * 100 : undefined,
          raw: pos
        });
      });
    }
    return positions;
  }
}
