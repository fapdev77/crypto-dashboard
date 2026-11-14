import React from 'react';
import { useMultiExchangeWS } from '../hooks/useMultiExchangeWS';
import { useHistoryCachePolling } from '../hooks/useHistoryCachePolling';
import { useBybitTransactionSync } from '../hooks/useBybitTransactionSync';
import { useBitgetTransactionSync } from '../hooks/useBitgetTransactionSync';
import { useOkxTransactionSync } from '../hooks/useOkxTransactionSync';
import { useFundingSync } from '../hooks/useFundingSync';

export function WorkSpace({ children }: { children: React.ReactNode }) {
  // Initialize polling connections here so they stay alive across tab changes
  useMultiExchangeWS();
  // Initializes background polling for history cache
  useHistoryCachePolling();
  // Initializes background sync for Bybit transaction log (progressive deep-sync)
  useBybitTransactionSync();
  // Initializes background sync for Bitget transaction log (progressive deep-sync)
  useBitgetTransactionSync();
  // Initializes background sync for OKX transaction log (progressive deep-sync)
  useOkxTransactionSync();
  // Initializes background sync for Funding Fees
  useFundingSync();

  return <>{children}</>;
}
