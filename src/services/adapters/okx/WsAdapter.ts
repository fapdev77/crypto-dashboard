import { useDashboardStore, BalanceItem } from '../../../store/dashboardStore';
import { UnifiedPosition } from '../../../types';
import { calculateRoe } from '../../../utils/math-crypto';

export class OkxWsAdapter {
  static parse(cid: string, exchange: string, label: string, data: any) {
    if (!data.arg || !data.data) return;

    if (data.arg.channel === 'account') {
      const balances: Partial<BalanceItem>[] = data.data[0].details.map((item: any) => {
        const bal: Partial<BalanceItem> = {
          id: `${cid}-${item.ccy}`,
          connectionId: cid,
          exchange,
          label,
          ccy: item.ccy,
        };
        if (item.eq !== undefined) bal.amount = parseFloat(item.eq);
        if (item.eqUsd !== undefined) bal.usdValue = parseFloat(item.eqUsd);
        return bal;
      });
      useDashboardStore.getState().updateBalancesDelta(cid, balances);
    }
    
    if (data.arg.channel === 'positions') {
      const positions: Partial<UnifiedPosition>[] = data.data.map((pos: any) => {
        const update: Partial<UnifiedPosition> = {
          id: `${cid}-${pos.posId}`,
          connectionId: cid,
          exchange: 'okx',
          label,
          raw: pos
        };
        if (pos.instId !== undefined) update.symbol = pos.instId;
        if (pos.ccy !== undefined) update.ccy = pos.ccy;
        else if (pos.marginCoin !== undefined) update.ccy = pos.marginCoin;
        if (pos.posSide !== undefined) update.side = pos.posSide as any;
        if (pos.pos !== undefined) update.size = parseFloat(pos.pos);
        if (pos.avgPx !== undefined) update.entryPrice = parseFloat(pos.avgPx);
        if (pos.markPx !== undefined) update.markPrice = parseFloat(pos.markPx);
        if (pos.upl !== undefined) update.unrealizedPnl = parseFloat(pos.upl);
        if (pos.realizedPnl !== undefined) update.realizedPnl = parseFloat(pos.realizedPnl);
        if (pos.lever !== undefined) update.leverage = parseFloat(pos.lever);
        if (pos.mgnMode !== undefined) update.marginMode = pos.mgnMode === 'isolated' ? 'isolated' : 'cross';
        if (pos.margin !== undefined) update.margin = parseFloat(pos.margin);
        if (pos.notionalUsd !== undefined) update.notionalUsd = parseFloat(pos.notionalUsd);
        if (pos.liqPx !== undefined) update.liquidationPrice = parseFloat(pos.liqPx);
        if (pos.bePx !== undefined) update.breakEvenPrice = parseFloat(pos.bePx);
        if (pos.uplRatio !== undefined) update.roe = parseFloat(pos.uplRatio) * 100;
        
        // Use standard roe calculation if native ratio missing
        if (update.roe === undefined) {
           const calculatedRoe = calculateRoe(update.unrealizedPnl, update.margin);
           if (calculatedRoe !== undefined) update.roe = calculatedRoe;
        }

        return update;
      });
      useDashboardStore.getState().updatePositionsDelta(cid, positions);
    }
  }
}
