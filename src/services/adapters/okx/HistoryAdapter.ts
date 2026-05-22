import { UnifiedHistoryPosition } from '../../../types';

export class OkxHistoryAdapter {
  static parse(rawPayload: any[], connectionId: string, label: string): UnifiedHistoryPosition[] {
    return rawPayload.map((p: any) => {
      const isLong = p.posSide === 'long' || p.direction === 'long';
      const isShort = p.posSide === 'short' || p.direction === 'short';
      
      const realizedPnl = parseFloat(p.realizedPnl || p.pnl || '0');
      const entryPrice = parseFloat(p.openAvgPx || '0');
      const closePrice = parseFloat(p.avgPx || p.closeAvgPx || '0');
      const size = parseFloat(p.closeVol || p.closeTotalPos || '0');
      const cTime = parseInt(p.uTime || p.cTime || '0', 10);
      
      let roi: number | undefined;
      if (p.pnlRatio) {
        roi = parseFloat(p.pnlRatio); // Sometimes needs * 100 depending on endpoint
      }

      return {
        id: `${connectionId}-${p.instId}-${cTime}`,
        connectionId,
        label,
        exchange: 'okx',
        symbol: p.instId,
        ccy: p.ccy || p.marginCoin || (p.instId.includes('-USDT') ? 'USDT' : p.instId.includes('-USDC') ? 'USDC' : p.instId.split('-')[0]),
        side: isLong ? 'long' : isShort ? 'short' : 'net',
        realizedPnl,
        closeTime: cTime,
        entryPrice,
        closePrice,
        size,
        roi,
        raw: p,
      };
    });
  }
}
