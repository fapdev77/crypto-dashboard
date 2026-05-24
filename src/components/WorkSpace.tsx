import React from 'react';
import { useMultiExchangeWS } from '../hooks/useMultiExchangeWS';
import { useHistoryCachePolling } from '../hooks/useHistoryCachePolling';

export function WorkSpace({ children }: { children: React.ReactNode }) {
  // Initialize WS connections here so they stay alive across tab changes
  useMultiExchangeWS();
  // Initializes background polling for history cache
  useHistoryCachePolling();

  return <>{children}</>;
}
