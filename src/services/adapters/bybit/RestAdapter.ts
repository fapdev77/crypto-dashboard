import { UnifiedPosition } from '../../../types';
import { BalanceItem } from '../../../store/dashboardStore';

export class BybitRestAdapter {
  static parseBalances(walletData: any, id: string, exchange: string, label: string): BalanceItem[] {
    const balances: BalanceItem[] = [];
    if (walletData && walletData.coin) {
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
