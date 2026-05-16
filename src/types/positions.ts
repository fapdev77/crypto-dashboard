import { ExchangeName, PositionSide } from '../types';

export interface UnifiedPosition {
  id: string;              // ID único (da corretora ou gerado)
  exchange: 'BITGET' | 'BYBIT' | 'OKX';
  connectionId: string;    // ID interno da conexão
  label: string;           // Nome da conta configurada
  symbol: string;          // Padronizado (ex: BTCUSDT)
  side: PositionSide;      // 'long' | 'short' | 'net'
  realizedPnl: number;     // Valor nominal normalizado
  closeTime: number;       // Unix ms da data de fechamento
  entryPrice?: number;
  closePrice?: number;
  size?: number;
  roi?: number;            // Opcional, calculado ou retornado
  raw?: any;               // Payload original
}
