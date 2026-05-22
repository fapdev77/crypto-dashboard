import { useDashboardStore, BalanceItem } from '../../../store/dashboardStore';
import { UnifiedPosition } from '../../../types';
import { calculateRoe } from '../../../utils/math-crypto';

export class BitgetWsAdapter {
  static parse(cid: string, exchange: string, label: string, data: any) {
    if (data.action !== 'snapshot' && data.action !== 'update') return;

    if (data.arg.channel === 'account' || data.arg.channel === 'equity') {
      const balances: BalanceItem[] = [];
      const instType = data.arg.instType;

      if (instType === 'SPOT') {
         data.data.forEach((item: any) => {
           const coin = item.coin || item.marginCoin;
           if (coin && parseFloat(item.available || '0') + parseFloat(item.frozen || '0') > 0) {
             const amt = parseFloat(item.available || '0') + parseFloat(item.frozen || '0');
             balances.push({
               id: `${cid}-SPOT-${coin}`,
               connectionId: cid,
               exchange,
               label: `${label} (Spot)`,
               ccy: coin,
               amount: amt,
               usdValue: amt
             });
           }
         });
      } else {
         data.data.forEach((item: any) => {
            const coin = item.marginCoin || 'USDT';
            const tokenAmount = parseFloat(item.equity || item.available || '0');
            const usdAmount = parseFloat(item.usdtEquity || item.equity || '0');
            if (tokenAmount > 0 || data.action === 'snapshot') {
               balances.push({
                 id: `${cid}-${instType}-${coin}`,
                 connectionId: cid,
                 exchange,
                 label: `${label} (${instType})`,
                 ccy: coin,
                 amount: tokenAmount,
                 usdValue: usdAmount
               });
            }
         });
      }

      if (balances.length > 0) {
        useDashboardStore.getState().updateBalances(cid, balances);
      }
    }
    
    if (data.arg.channel === 'positions') {
      const positions: Partial<UnifiedPosition>[] = [];
      data.data.forEach((pos: any) => {
        const update: Partial<UnifiedPosition> = {
          id: `${cid}-${pos.posId || pos.instId}`,
          connectionId: cid,
          exchange: 'bitget',
          label,
          raw: pos
        };
        
        if (pos.marginCoin !== undefined) update.ccy = pos.marginCoin;
        
        if (pos.instId !== undefined) update.symbol = pos.instId;
        if (pos.holdSide !== undefined) update.side = pos.holdSide.toLowerCase() as any;
        else if (pos.posSide !== undefined) update.side = pos.posSide.toLowerCase() as any;
        
        if (pos.total !== undefined) update.size = parseFloat(pos.total);
        else if (pos.pos !== undefined) update.size = parseFloat(pos.pos);

        if (pos.openPriceAvg !== undefined) update.entryPrice = parseFloat(pos.openPriceAvg);
        else if (pos.avgPx !== undefined) update.entryPrice = parseFloat(pos.avgPx);

        if (pos.markPrice !== undefined) update.markPrice = parseFloat(pos.markPrice);
        else if (pos.markPx !== undefined) update.markPrice = parseFloat(pos.markPx);

        if (pos.unrealizedPL !== undefined) update.unrealizedPnl = parseFloat(pos.unrealizedPL);
        else if (pos.upl !== undefined) update.unrealizedPnl = parseFloat(pos.upl);

        if (pos.achievedProfits !== undefined) update.realizedPnl = parseFloat(pos.achievedProfits);

        if (pos.leverage !== undefined) update.leverage = parseFloat(pos.leverage);
        else if (pos.lever !== undefined) update.leverage = parseFloat(pos.lever);

        if (pos.marginMode !== undefined) update.marginMode = pos.marginMode === 'isolated' ? 'isolated' : 'cross';
        if (pos.marginSize !== undefined) update.margin = parseFloat(pos.marginSize);
        if (pos.liquidationPrice !== undefined) update.liquidationPrice = parseFloat(pos.liquidationPrice);
        if (pos.breakEvenPrice !== undefined) update.breakEvenPrice = parseFloat(pos.breakEvenPrice);

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
