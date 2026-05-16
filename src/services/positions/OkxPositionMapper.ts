import { PositionMapperStrategy } from './PositionMapperStrategy';
import { UnifiedPosition } from '../../types/positions';

export class OkxPositionMapper implements PositionMapperStrategy {
  mapHistory(rawPayload: any[], connectionId: string, label: string): UnifiedPosition[] {
    return rawPayload.map((p: any) => {
      const isLong = p.posSide === 'long' || p.direction === 'long';
      const isShort = p.posSide === 'short' || p.direction === 'short';
      
      const realizedPnl = parseFloat(p.realizedPnl || p.pnl || '0');
      const entryPrice = parseFloat(p.openAvgPx || '0');
      const closePrice = parseFloat(p.avgPx || p.closeAvgPx || '0');
      const size = parseFloat(p.closeVol || p.closeTotalPos || '0');
      const cTime = parseInt(p.uTime || p.cTime || '0', 10);
      
      let roi: number | undefined;
      // Depending on margin mode and available data, okx might have roi or we can calculate
      if (p.pnlRatio) {
        roi = parseFloat(p.pnlRatio); // okx returns ratio, usually needs to be * 100 for percentage
      }

      return {
        id: `${connectionId}-${p.instId}-${cTime}`,
        connectionId,
        label,
        exchange: 'OKX',
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
