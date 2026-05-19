import { ApiCredentials } from '../../store/apiKeysStore';
import { useDashboardStore, BalanceItem } from '../../store/dashboardStore';
import { UnifiedPosition } from '../../types';

export class WsParsers {
  static parseStream(config: ApiCredentials, data: any) {
    const { id: cid, exchange, label } = config;
    
    if (data.action === 'snapshot' || data.action === 'update' || data.data) {
      console.log(`[WS-${cid}] Stream Data (${exchange}):`, data.action || data.topic || data.arg?.channel, data);
    }
    
    if (exchange === 'okx') {
      this.parseOkx(cid, exchange, label, data);
    } else if (exchange === 'bybit') {
      this.parseBybit(cid, exchange, label, data);
    } else if (exchange === 'bitget') {
      this.parseBitget(cid, exchange, label, data);
    }
  }

  private static parseOkx(cid: string, exchange: string, label: string, data: any) {
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
        return update;
      });
      useDashboardStore.getState().updatePositionsDelta(cid, positions);
    }
  }

  private static parseBybit(cid: string, exchange: string, label: string, data: any) {
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

        if (update.unrealizedPnl !== undefined && update.margin !== undefined && update.margin > 0) {
          update.roe = (update.unrealizedPnl / update.margin) * 100;
        }

        positions.push(update);
      });
      if (positions.length > 0) {
        useDashboardStore.getState().updatePositionsDelta(cid, positions);
      }
    }
  }

  private static parseBitget(cid: string, exchange: string, label: string, data: any) {
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

        if (update.unrealizedPnl !== undefined && update.margin !== undefined && update.margin > 0) {
          update.roe = (update.unrealizedPnl / update.margin) * 100;
        }

        positions.push(update);
      });
      if (positions.length > 0) {
        useDashboardStore.getState().updatePositionsDelta(cid, positions);
      }
    }
  }
}
