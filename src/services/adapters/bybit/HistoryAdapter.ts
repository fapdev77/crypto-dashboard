import { UnifiedHistoryPosition } from '../../../types';

export class BybitHistoryAdapter {
  static parse(rawPayload: any[], connectionId: string, label: string): UnifiedHistoryPosition[] {
    return rawPayload.map((p: any) => {
      let realizedPnl = parseFloat(p.closedPnl || '0');
      
      const entryPrice = parseFloat(p.avgEntryPrice || '0');
      const closePrice = parseFloat(p.avgExitPrice || '0');
      const size = parseFloat(p.closedSize || '0');
      const cTime = parseInt(p.updatedTime || p.createdTime || '0', 10);
      
      const isLong = p.side === 'Buy';
      const isShort = p.side === 'Sell';
      
      return {
        id: `${connectionId}-${p.orderId || p.closedPnlId || Math.random().toString(36)}-${cTime}`,
        connectionId,
        label,
        exchange: 'bybit',
        symbol: p.symbol,
        ccy: p.settleCoin || p.coin || (p.symbol.endsWith('USDT') ? 'USDT' : p.symbol.endsWith('USDC') ? 'USDC' : p.symbol.replace(/USD.*/, '')),
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
