import { useDashboardStore, BalanceItem } from '../../../store/dashboardStore';
import { UnifiedPosition } from '../../../types';
import { calculateRoe } from '../../../utils/math-crypto';

export class BybitWsAdapter {
  static parse(cid: string, exchange: string, label: string, data: any) {
    if (!data.topic) return;

    if (data.topic === 'wallet') {
      const balances: Partial<BalanceItem>[] = [];
      data.data.forEach((acc: any) => {
        if (acc.coin && Array.isArray(acc.coin)) {
          acc.coin.forEach((item: any) => {
            const bal: Partial<BalanceItem> = {
              id: `${cid}-${acc.accountType || 'UNIFIED'}-${item.coin}`,
              connectionId: cid,
              exchange,
              label: `${label} (${acc.accountType || 'UNIFIED'})`,
              ccy: item.coin,
            };
            
            if (item.equity !== undefined) bal.amount = parseFloat(item.equity);
            else if (item.walletBalance !== undefined) bal.amount = parseFloat(item.walletBalance);
            
            if (item.usdValue !== undefined && item.usdValue !== "") bal.usdValue = parseFloat(item.usdValue);
            else if (bal.amount !== undefined) bal.usdValue = bal.amount;

            balances.push(bal);
          });
        }
      });
      if (balances.length > 0) {
        useDashboardStore.getState().updateBalancesDelta(cid, balances);
      }
    }
    
    if (data.topic === 'position') {
      const positions: Partial<UnifiedPosition>[] = [];
      data.data.forEach((pos: any) => {
        const update: Partial<UnifiedPosition> = {
          id: `${cid}-${pos.symbol}-${pos.positionIdx || 0}`,
          connectionId: cid,
          exchange: 'bybit',
          label,
          raw: pos
        };
        
        if (pos.symbol !== undefined) update.symbol = pos.symbol;
        if (pos.side !== undefined && pos.side !== '') update.side = pos.side.toLowerCase() as any;
        if (pos.settleCoin !== undefined) update.ccy = pos.settleCoin;
        else if (pos.coin !== undefined) update.ccy = pos.coin;
        if (pos.size !== undefined) update.size = parseFloat(pos.size);
        if (pos.entryPrice !== undefined && pos.entryPrice !== "") update.entryPrice = parseFloat(pos.entryPrice);
        else if (pos.avgPrice !== undefined && pos.avgPrice !== "") update.entryPrice = parseFloat(pos.avgPrice);
        if (pos.markPrice !== undefined && pos.markPrice !== "") update.markPrice = parseFloat(pos.markPrice);
        if (pos.unrealisedPnl !== undefined && pos.unrealisedPnl !== "") update.unrealizedPnl = parseFloat(pos.unrealisedPnl);
        if (pos.curRealisedPnl !== undefined && pos.curRealisedPnl !== "") update.realizedPnl = parseFloat(pos.curRealisedPnl);
        if (pos.leverage !== undefined && pos.leverage !== "") update.leverage = parseFloat(pos.leverage);
        if (pos.tradeMode !== undefined) update.marginMode = pos.tradeMode === 1 ? 'isolated' : 'cross';
        if (pos.positionIM !== undefined && pos.positionIM !== "") update.margin = parseFloat(pos.positionIM);
        if (pos.positionValue !== undefined && pos.positionValue !== "") update.notionalUsd = parseFloat(pos.positionValue);
        if (pos.liqPrice !== undefined && pos.liqPrice !== "") update.liquidationPrice = parseFloat(pos.liqPrice);
        if (pos.breakEvenPrice !== undefined && pos.breakEvenPrice !== "") update.breakEvenPrice = parseFloat(pos.breakEvenPrice);
        if (pos.takeProfit !== undefined && pos.takeProfit !== "") update.tp = parseFloat(pos.takeProfit);
        if (pos.stopLoss !== undefined && pos.stopLoss !== "") update.sl = parseFloat(pos.stopLoss);

        const calculatedRoe = calculateRoe(update.unrealizedPnl, update.margin);
        if (calculatedRoe !== undefined) update.roe = calculatedRoe;

        positions.push(update);
      });
      if (positions.length > 0) {
        useDashboardStore.getState().updatePositionsDelta(cid, positions);
      }
    }
  }
}
