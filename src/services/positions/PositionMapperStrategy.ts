import { UnifiedPosition } from '../../types/positions';

export interface PositionMapperStrategy {
  mapHistory(rawPayload: any, connectionId: string, label: string): UnifiedPosition[];
}
