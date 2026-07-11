import React from 'react';
import { useMultiExchangeWS } from '../hooks/useMultiExchangeWS';
import { useHistoryCachePolling } from '../hooks/useHistoryCachePolling';
import { useBybitTransactionSync } from '../hooks/useBybitTransactionSync';

export function WorkSpace({ children }: { children: React.ReactNode }) {
  // Initialize polling connections here so they stay alive across tab changes
  useMultiExchangeWS();
  // Initializes background polling for history cache
  useHistoryCachePolling();
  // Initializes background sync for Bybit transaction log (progressive deep-sync)
  useBybitTransactionSync();

  return <>{children}</>;
}
