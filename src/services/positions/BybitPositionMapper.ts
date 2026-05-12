import { PositionMapperStrategy } from './PositionMapperStrategy';
import { UnifiedPosition } from '../../types/positions';

export class BybitPositionMapper implements PositionMapperStrategy {
  mapHistory(rawPayload: any[], connectionId: string, label: string): UnifiedPosition[] {
    return rawPayload.map((p: any) => {
      // closedPnl for Bybit
      let realizedPnl = parseFloat(p.closedPnl || '0');
      
      const entryPrice = parseFloat(p.avgEntryPrice || '0');
      const closePrice = parseFloat(p.avgExitPrice || '0');
      const size = parseFloat(p.closedSize || '0');
      const cTime = parseInt(p.updatedTime || '0', 10);
      
      const isLong = p.side === 'Buy';
      const isShort = p.side === 'Sell';
      
      // Inverse contracts might need PnL adjustments based on base currency or signs
      // PnL interpretation: Bybit closedPnl handles signs, but for visualization we map it here
      
      return {
        id: `${connectionId}-${p.orderId || p.closedPnlId || Math.random().toString(36)}-${cTime}`,
        connectionId,
        label,
        exchange: 'BYBIT',
        symbol: p.symbol,
        side: isLong ? 'long' : isShort ? 'short' : 'net',
        realizedPnl: realizedPnl,
        closeTime: cTime,
        entryPrice,
        closePrice,
        size,
        raw: p,
      };
    });
  }
}
