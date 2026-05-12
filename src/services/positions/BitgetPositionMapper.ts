import { PositionMapperStrategy } from './PositionMapperStrategy';
import { UnifiedPosition } from '../../types/positions';

export class BitgetPositionMapper implements PositionMapperStrategy {
  mapHistory(rawPayload: any[], connectionId: string, label: string): UnifiedPosition[] {
    return rawPayload.map((p: any) => {
      const realizedPnl = parseFloat(p.achievedProfits || p.netProfit || '0');
      const entryPrice = parseFloat(p.openPriceAvg || p.openAvgPx || '0');
      const closePrice = parseFloat(p.closePriceAvg || p.closeAvgPx || '0');
      const size = parseFloat(p.closeSize || p.closeVol || '0');
      const cTime = parseInt(p.uTime || '0', 10);
      
      const sideRaw = p.holdSide || p.posSide || p.side;
      const isLong = sideRaw?.toLowerCase() === 'long' || sideRaw?.toLowerCase() === 'buy';
      const isShort = sideRaw?.toLowerCase() === 'short' || sideRaw?.toLowerCase() === 'sell';

      return {
        id: `${connectionId}-${p.posId || p.positionId}-${cTime}`,
        connectionId,
        label,
        exchange: 'BITGET',
        symbol: p.instId || p.symbol,
        side: isLong ? 'long' : isShort ? 'short' : 'net',
        realizedPnl,
        closeTime: cTime,
        entryPrice,
        closePrice,
        size,
        raw: p,
      };
    });
  }
}
